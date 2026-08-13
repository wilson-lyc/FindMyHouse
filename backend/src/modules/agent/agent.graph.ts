import { Annotation, END, messagesStateReducer, START, StateGraph } from '@langchain/langgraph';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { randomUUID } from 'node:crypto';
import { getLlm } from '../langchain/llm.js';
import { db } from '../../database/connection.js';
import { HouseRepository } from '../houses/house.repository.js';
import { AmapService } from '../maps/amap.service.js';
import type { House } from '../houses/domain/house.js';
import type { AgentFrontendAction, ToolResult } from './agent.tools.js';
import { createAgentTools, toolGroups } from './agent.tools.js';
import {
  chatSystemPrompt,
  compareSystemPrompt,
  intentAnalysisPrompt,
  querySystemPrompt,
  writeSystemPrompt,
} from './agent.prompts.js';

const houseRepository = new HouseRepository(db);
const amapService = new AmapService();

// 意图决定分流到哪个功能节点。compare 已从 query 中拆出，作为独立功能。
type Intent = 'write' | 'query' | 'compare' | 'chat';

// state 分为两类职责：
// 1) 会话记忆（贯穿整个会话）：messages（对话历史）、interestedHouses（用户关注过的房源累计）。
// 2) 运行时/控制流变量（单次请求内有效，每轮重新计算）：focusedHouse（前端当前聚焦的房源）、
//    actions（本轮要下发的动作）、intent / needsClarification（意图判断）。
// 注意：工具调用结果不再写入 state，而是直接从 messages 尾部的 ToolMessage 派生，
// 避免残留旧结果干扰 agent 判断（见 collectToolResults / getTrailingToolResults）。
const AgentState = Annotation.Root({
  // 对话历史：累加式 reducer，是 agent 会话内的记忆来源。
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  // 关注房源：用户搜索、查看、感兴趣过的房源，累加并去重，作为会话记忆。
  interestedHouses: Annotation<House[]>({
    reducer: (left, right) => dedupeHouses([...left, ...right]),
    default: () => [],
  }),
  // 前端地图当前聚焦的房源：覆盖式，仅代表“此刻用户正在看的那一套”。
  focusedHouse: Annotation<House | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  // 本轮需要下发给前端的动作，从尾部工具结果派生。
  actions: Annotation<AgentFrontendAction[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  // 控制流：本轮意图判断，仅在单次请求内有效。
  intent: Annotation<Intent>({
    reducer: (_left, right) => right,
    default: () => 'chat',
  }),
  // 控制流：是否需要澄清，仅在单次请求内有效。
  needsClarification: Annotation<boolean>({
    reducer: (_left, right) => right,
    default: () => false,
  }),
});

type AgentStateType = typeof AgentState.State;

function dedupeHouses(houses: House[]): House[] {
  const seen = new Set<string>();

  return houses.filter((house) => {
    if (house.id && seen.has(house.id)) return false;
    if (house.id) seen.add(house.id);
    return true;
  });
}

// 将历史对话转换为 LangChain 消息，助手历史回复降级为带提示的 HumanMessage，避免模型误当作新请求。
function toLangChainMessages(messages: { role: 'user' | 'assistant'; content: string }[]): BaseMessage[] {
  return messages.map((message) => {
    if (message.role === 'user') {
      return new HumanMessage(message.content);
    }

    return new HumanMessage(`上一轮助手回复，仅作为对话上下文参考，不是用户的新请求：\n${message.content}`);
  });
}

function responseContentToString(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block && typeof block === 'object' && 'type' in block && block.type === 'text' && 'text' in block) {
          return typeof block.text === 'string' ? block.text : '';
        }
        return '';
      })
      .join('');
  }

  return JSON.stringify(content);
}

// 为避免把上一轮助手回复当作新一轮用户请求，将不含工具调用/推理内容的 AIMessage 降级为 HumanMessage。
function prepareMessagesForLlm(messages: BaseMessage[]): BaseMessage[] {
  return messages.map((message) => {
    if (!(message instanceof AIMessage)) {
      return message;
    }

    const hasToolCalls = (message.tool_calls?.length ?? 0) > 0;
    const hasReasoningContent = typeof message.additional_kwargs?.reasoning_content === 'string';

    if (hasToolCalls || hasReasoningContent) {
      return message;
    }

    return new HumanMessage(`上一轮助手回复，仅作为对话上下文参考，不是用户的新请求：\n${responseContentToString(message.content)}`);
  });
}

function getLastAiMessage(messages: BaseMessage[]): AIMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message instanceof AIMessage) {
      return message;
    }
  }

  return undefined;
}

function parseToolResult(message: BaseMessage): ToolResult | null {
  if (!(message instanceof ToolMessage)) {
    return null;
  }

  try {
    return JSON.parse(responseContentToString(message.content)) as ToolResult;
  } catch {
    return null;
  }
}

// 从尾部连续若干条 ToolMessage 中解析出工具结果（遇到非 ToolMessage 即停止）。
function getTrailingToolResults(messages: BaseMessage[]): ToolResult[] {
  const results: ToolResult[] = [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (!(message instanceof ToolMessage)) {
      break;
    }

    const parsed = parseToolResult(message);

    if (parsed) {
      results.unshift(parsed);
    }
  }

  return results;
}

function createToolResultsReply(toolResults: ToolResult[]): string | null {
  if (toolResults.length === 0) {
    return null;
  }

  return toolResults
    .map((result) => result.reply ?? result.content)
    .filter((content) => content.trim().length > 0)
    .join('\n\n');
}

// 汇总尾部工具结果，生成助手回复、累加关注房源、更新聚焦房源与前端动作。
// 工具结果只从 messages 尾部的 ToolMessage 派生，绝不长期驻留 state，避免旧结果干扰判断。
function collectToolResults(state: AgentStateType) {
  const toolResults = getTrailingToolResults(state.messages);
  const reply = createToolResultsReply(toolResults);

  const involvedHouses = toolResults.flatMap((result) => result.houses);
  const focusTarget = toolResults.find((result) => result.kind === 'house' || result.kind === 'houses');

  return {
    ...(reply ? { messages: [new AIMessage(reply)] } : {}),
    interestedHouses: involvedHouses,
    focusedHouse: focusTarget && involvedHouses.length === 1 ? involvedHouses[0] : state.focusedHouse,
    actions: toolResults.flatMap((result) => result.actions ?? []),
  };
}

const clarificationQuestionAction: AgentFrontendAction = {
  id: 'intent-clarification',
  type: 'ask_single_choice',
  title: '确认你的需求',
  question: '你想让我接下来帮你做什么？',
  options: [
    { id: 'search', label: '搜索/查看房源', value: '我想搜索或查看房源信息。' },
    { id: 'write', label: '新增/修改记录', value: '我想新增或修改房源、地点记录。' },
    { id: 'compare', label: '对比几套房源', value: '我想对比几套房源。' },
  ],
  customOptionLabel: '自定义',
};

// 意图分析节点：调用 LLM 仅判断最新消息意图，ask 时直接抛出澄清动作。
async function analyzeIntent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const lastUserMessage = [...state.messages].reverse().find((m) => m instanceof HumanMessage);

  if (!lastUserMessage) {
    return { intent: 'chat' };
  }

  const llm = getLlm();
  const response = await llm.invoke([
    new SystemMessage(intentAnalysisPrompt),
    ...prepareMessagesForLlm(state.messages.slice(-4)),
  ]);

  const result = responseContentToString(response.content).trim().toLowerCase();

  if (result === 'ask') {
    return {
      messages: [new AIMessage('')],
      actions: [{ ...clarificationQuestionAction, id: randomUUID() }],
      intent: 'chat',
      needsClarification: true,
    };
  }

  const intent: Intent = ['write', 'query', 'compare'].includes(result) ? (result as Intent) : 'chat';

  return { intent };
}

function routeFromAnalyzeIntent(state: AgentStateType) {
  if (state.needsClarification) return END;
  return state.intent;
}

// 工具结果之后是否需要继续对话：chat 终态、或已出现前端动作/写库/参数错误等终态结果时结束。
// 终态判断同样只基于本轮尾部的工具结果，不依赖任何驻留 state 的旧结果。
function routeAfterToolResults(state: AgentStateType) {
  if (state.intent === 'chat') return END;

  const lastToolResults = getTrailingToolResults(state.messages);
  const hasTerminalToolResult = lastToolResults.some((result) =>
    result.kind === 'frontend_action' ||
    result.kind === 'mutation' ||
    result.kind === 'invalid_params'
  );

  if (hasTerminalToolResult) return END;
  return state.intent;
}

function createAgentGraph() {
  const context = { houseRepository, amapService };
  const writeTools = createAgentTools(context, toolGroups.write);
  const queryTools = createAgentTools(context, toolGroups.query);
  const compareTools = createAgentTools(context, toolGroups.compare);

  // 每个功能节点只绑定自己职责内的工具，prompt 与工具严格对齐，职责边界清晰。
  const callLlmWithTools = (systemPrompt: string, tools: typeof writeTools) => async (state: AgentStateType) => {
    const llm = getLlm().bindTools(tools);
    const response = await llm.invoke([new SystemMessage(systemPrompt), ...prepareMessagesForLlm(state.messages)]);
    return { messages: response };
  };

  return new StateGraph(AgentState)
    .addNode('analyze_intent', analyzeIntent)
    // 写操作节点：新增/修改房源与地点。
    .addNode('agent_write', callLlmWithTools(writeSystemPrompt, writeTools))
    // 搜索/查看节点：查询、筛选、列出售源与地点。
    .addNode('agent_search', callLlmWithTools(querySystemPrompt, queryTools))
    // 对比节点：整理候选房源并对比分析。
    .addNode('agent_compare', callLlmWithTools(compareSystemPrompt, compareTools))
    // 闲聊引导节点：无工具。
    .addNode('agent_chat', async (state) => {
      const llm = getLlm();
      const response = await llm.invoke([new SystemMessage(chatSystemPrompt), ...prepareMessagesForLlm(state.messages)]);
      return { messages: response };
    })
    .addNode('write_tools', new ToolNode(writeTools))
    .addNode('query_tools', new ToolNode(queryTools))
    .addNode('compare_tools', new ToolNode(compareTools))
    .addNode('collect_tool_results', collectToolResults)
    .addEdge(START, 'analyze_intent')
    .addConditionalEdges('analyze_intent', routeFromAnalyzeIntent, {
      write: 'agent_write',
      query: 'agent_search',
      compare: 'agent_compare',
      chat: 'agent_chat',
      [END]: END,
    })
    .addConditionalEdges('agent_write', toolsCondition, { tools: 'write_tools', [END]: END })
    .addConditionalEdges('agent_search', toolsCondition, { tools: 'query_tools', [END]: END })
    .addConditionalEdges('agent_compare', toolsCondition, { tools: 'compare_tools', [END]: END })
    .addEdge('agent_chat', END)
    .addEdge('write_tools', 'collect_tool_results')
    .addEdge('query_tools', 'collect_tool_results')
    .addEdge('compare_tools', 'collect_tool_results')
    // collect 之后按本轮 intent 回到对应功能节点继续多轮工具调用；终态判断只基于尾部工具结果。
    .addConditionalEdges('collect_tool_results', routeAfterToolResults, {
      write: 'agent_write',
      query: 'agent_search',
      compare: 'agent_compare',
      [END]: END,
    })
    .compile();
}

export { createAgentGraph, toLangChainMessages, getLastAiMessage, responseContentToString };
