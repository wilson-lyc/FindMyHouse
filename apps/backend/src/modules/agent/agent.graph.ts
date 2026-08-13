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
  writeCreateSystemPrompt,
  writeUpdateSystemPrompt,
  writeDeleteSystemPrompt,
} from './agent.prompts.js';

const houseRepository = new HouseRepository(db);
const amapService = new AmapService();

// 意图节点把用户诉求细分为：单纯对话(chat)、新增(create)、修改(update)、删除(delete)、
// 查询(query)、对比(compare)，以及无法归类需追问(ask)。
// 其中 create/update/delete 同属“编辑房源节点”职责（一个节点负责房源的创建、编辑与删除），
// 因此用 writeKind 记录写操作的子类型，图分流时统一汇入 agent_write 节点。
type Intent = 'write' | 'query' | 'compare' | 'chat';
type WriteKind = 'create' | 'update' | 'delete';

// state 分为两类职责：
// 1) 会话记忆（贯穿整个会话）：messages（对话历史）、interestedHouses（用户关注过的房源累计）。
// 2) 运行时/控制流变量（单次请求内有效，每轮重新计算）：focusedHouse（前端当前聚焦的房源）、
//    actions（本轮要下发的动作）、intent / writeKind / needsClarification（意图判断）。
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
  // 控制流：本轮意图大类，仅在单次请求内有效。write 涵盖 create/update/delete。
  intent: Annotation<Intent>({
    reducer: (_left, right) => right,
    default: () => 'chat',
  }),
  // 控制流：当 intent 为 write 时，标记具体子操作（新建/修改/删除），用于精准引导提示词。
  writeKind: Annotation<WriteKind | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
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
    { id: 'write', label: '新增/修改房源', value: '我想新增或修改一套房源。' },
    { id: 'delete', label: '删除房源', value: '我想删除一套房源。' },
    { id: 'compare', label: '对比几套房源', value: '我想对比几套房源。' },
  ],
  customOptionLabel: '自定义',
};

// 把 LLM 输出的细粒度意图映射为 { intent（大类）, writeKind（写子类型） }。
// 意图节点负责精确识别用户是单纯对话、还是新增/修改/删除/查询/对比房源，以及是否需要追问澄清。
function resolveIntent(
  result: string
): { intent: Intent; writeKind?: WriteKind } {
  switch (result) {
    case 'create':
      return { intent: 'write', writeKind: 'create' };
    case 'update':
      return { intent: 'write', writeKind: 'update' };
    case 'delete':
      return { intent: 'write', writeKind: 'delete' };
    case 'query':
      return { intent: 'query' };
    case 'compare':
      return { intent: 'compare' };
    default:
      return { intent: 'chat' };
  }
}

// ── 意图识别漏斗 ───────────────────────────────────────────────────────
// 第一层（文本规则）：零成本关键词匹配，覆盖高频明确意图，避免把每条消息都打到 AI。
// 第二层（小模型）：本环境无小模型，略过。
// 第三层（LLM 兜底）：仅当规则层无法判定（返回 null）时才调用，作为兜底。
// 规则层对“高确定性”表达才下结论；拿不准一律返回 null 交给 LLM，避免误判。

// 每条规则：命中关键词 + 对应细粒度意图。按优先级从高到低排列，先命中先生效。
const intentRuleMatchers: { pattern: RegExp; intent: 'create' | 'update' | 'delete' | 'compare' | 'query' | 'chat' }[] = [
  // 删除（强意图，优先于 query/chat）
  { pattern: /(删\s*除|删\s*掉|移\s*除|下\s*架|不\s*要\s*这\s*套|删\s*了\s*吧)/, intent: 'delete' },
  // 创建（强意图）
  { pattern: /(新\s*增|新\s*建|添\s*加|创\s*建|录\s*入|登\s*记|上\s*架|记\s*一\s*套|记\s*下\s*来|帮\s*我\s*加|给\s*我\s*加|看\s*中\s*一\s*套|收\s*到\s*一\s*套)/, intent: 'create' },
  // 更新（含议价/调价等隐性修改表达，强意图）
  {
    pattern: /(修\s*改|改\s*一\s*下|更\s*新|调\s*价|改\s*价|降\s*到|升\s*到|涨\s*到|谈\s*到|谈\s*好|谈\s*拢|定\s*下\s*来|换\s*个\s*价\s*格|价\s*格\s*改|租\s*金\s*改|改\s*成|变\s*更|标\s*记\s*为|标\s*为)/,
    intent: 'update',
  },
  // 对比
  { pattern: /(对\s*比|比\s*较|比\s*一\s*下|哪\s*个\s*更|分\s*析\s*一\s*下|横\s*向|PK|pk)/, intent: 'compare' },
  // 纯闲聊（问候/感谢，弱意图，放较后以免误吞查询）
  { pattern: /^(你\s*好|您\s*好|在\s*吗|谢\s*谢|感\s*谢|多\s*谢|你\s*是\s*谁|叫\s*什\s*么)/, intent: 'chat' },
  // 查询（高频，放最后作为“找/搜”兜底）
  { pattern: /(搜\s*索|查\s*找|查\s*一\s*下|查\s*看|找\s*一\s*个|找\s*套|找\s*房|看\s*看|有\s*没\s*有|有\s*哪\s*些|推\s*荐|列\s*出|附\s*近|帮\s*我\s*找|想\s*租|看\s*房)/, intent: 'query' },
];

// 规则层：返回细粒度意图或 null（无法判定，交给下一层）。
function matchIntentByRules(text: string): 'create' | 'update' | 'delete' | 'compare' | 'query' | 'chat' | null {
  const normalized = text.trim().toLowerCase();

  if (normalized.length === 0) return null;

  for (const matcher of intentRuleMatchers) {
    if (matcher.pattern.test(normalized)) {
      return matcher.intent;
    }
  }

  return null;
}

// 意图分析节点：漏斗式识别——先规则层，规则无法判定再用 LLM 兜底。
async function analyzeIntent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const lastUserMessage = [...state.messages].reverse().find((m) => m instanceof HumanMessage);

  if (!lastUserMessage) {
    return { intent: 'chat' };
  }

  const userText = responseContentToString(lastUserMessage.content).trim();

  // 第一层：文本规则匹配（零 AI 成本）。
  const ruleIntent = matchIntentByRules(userText);

  if (ruleIntent) {
    const { intent, writeKind } = resolveIntent(ruleIntent);
    return { intent, ...(writeKind ? { writeKind } : {}) };
  }

  // 第三层：LLM 兜底（第二层小模型本环境缺失，略过）。
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

  const { intent, writeKind } = resolveIntent(result);

  return { intent, ...(writeKind ? { writeKind } : {}) };
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

  // 编辑房源节点：一个节点负责房源的“创建/编辑/删除”三类写操作。
  // 依据意图节点下发的 writeKind 选择对应的子提示词，让用户意图（新建/改/删）得到精准引导，
  // 同时保持工具集一致（create/update/delete 共用 write 工具组）。
  const resolveWritePrompt = (writeKind: WriteKind | undefined): string => {
    if (writeKind === 'update') return writeUpdateSystemPrompt;
    if (writeKind === 'delete') return writeDeleteSystemPrompt;
    return writeCreateSystemPrompt;
  };
  const agentWriteNode = async (state: AgentStateType) => {
    const llm = getLlm().bindTools(writeTools);
    const response = await llm.invoke([
      new SystemMessage(resolveWritePrompt(state.writeKind)),
      ...prepareMessagesForLlm(state.messages),
    ]);
    return { messages: response };
  };

  return new StateGraph(AgentState)
    .addNode('analyze_intent', analyzeIntent)
    // 写操作节点：新增/修改/删除房源（按 writeKind 精准引导）。
    .addNode('agent_write', agentWriteNode)
    // 搜索/查看节点：把自然语言查询条件转为具体搜索字段，调用搜索工具查询数据库。
    .addNode('agent_search', callLlmWithTools(querySystemPrompt, queryTools))
    // 对比节点：整理候选房源并基于房源数据做综合分析对比。
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
