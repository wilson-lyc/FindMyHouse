import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { Annotation, END, messagesStateReducer, START, StateGraph } from '@langchain/langgraph';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { randomUUID } from 'node:crypto';
import { getLlm } from '../langchain/llm.js';
import { db } from '../../database/connection.js';
import { HouseRepository } from '../houses/house.repository.js';
import { LocationRepository } from '../locations/location.repository.js';
import { AmapService } from '../maps/amap.service.js';
import type { House } from '../houses/domain/house.js';
import { createAgentTools, toolGroups, type AgentFrontendAction, type ToolResult } from './agent.tools.js';

const houseRepository = new HouseRepository(db);
const locationRepository = new LocationRepository(db);
const amapService = new AmapService();

export interface AgentResult {
  reply: string;
  houses: House[];
  actions: AgentFrontendAction[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type Intent = 'write' | 'query' | 'chat';

const intentAnalysisPrompt = `分析用户最新一条消息的意图，只输出一个词：

- write: 用户想要新增或修改房源/地点。包括直接命令（添加/新增/创建/编辑/修改/更新/改一下），也包括叙述性表达（谈到了XX元/谈好了/价格谈到了/和房东谈好/准备租这套/定下来了/换了个价格）。另外"前端执行器回调"中说明已成功创建房源或地点的消息也是 write。
- query: 用户想要搜索、查找、列出、查看房源，或对比、比较、分析两个或以上房源。另外"前端执行器回调"中说明用户已确认对比房源的消息也是 query。
- ask: 用户说的话无法明确归为以上三类中的任何一类，需要追问澄清。
- chat: 用户明显是在问候、闲聊或询问助手能力。

示例：
"新增一个房源" → write
"编辑一下这个房子的租金" → write
"中海名钻12-303的房子我和房东谈到了2800元" → write
"保利公寓那套我谈到3000块了" → write
"人才公寓的房租我跟房东说好了，2500" → write
"帮我看看附近有什么房子" → query
"我想租个两室一厅" → query
"最近有什么好房源吗" → query
"查一下我之前看过的房子" → query
"帮我对比一下这两个房子" → query
"对比一下保利公寓和人才公寓" → query
"你好" → chat
"谢谢" → chat
"中海名钻" → ask
"房子" → ask
"我想问问" → ask`;

const writeSystemPrompt = `你是一个专业的找房助手，负责新增和修改房源与地点信息。

你的工作流程：
1. 用户描述要新增或修改的内容时，先检查必填项是否完整。
2. 新增房源必填：名称、地址、租金。卧室数/客厅数/卫生间数未提供时按 1室1厅1卫 准备。通过地址获取坐标后才能交给用户确认。
3. 新增地点必填：名称、地址。通过地址获取坐标后才能交给用户确认。
4. 修改房源或地点时，如果没有明确 ID，先搜索候选列表让用户确认。
5. 所有新增操作都通过工具触发前端确认弹窗，不会直接入库。收到"前端执行器回调"且其中说明用户已确认并成功创建时，明确回复创建成功并总结信息。

工具使用原则：
- 如果缺少必填信息、编辑目标不明确或有多个候选记录，必须调用 ask_user 追问。
- ask_user 每次追问提供 2-5 个选项，选项之外前端会提供一个自定义输入。

回答要求：
- 用中文回复，简洁清晰。
- 不要编造房源名称、ID、价格、地址或联系人信息。
- 不要展示内部 ID。
- 如果缺少必填信息，调用 ask_user 追问用户。
- 地址无法定位时，提示用户提供更完整的地址。
- 涉及编辑时，先确认要编辑哪条记录。`;

const querySystemPrompt = `你是一个专业的找房助手，负责查询、展示和对比房源信息。

你可以使用搜索和查询工具。请优先依赖工具返回的数据，不要编造信息。

工具使用原则：
- 用户想找房、筛选、列出、查看详情时，使用相应搜索工具。
- 用户想找某个地点附近、周边或 N 公里内的房源时，使用按地点附近搜索房源工具。
- 用户说的地点是泛称或不完整线索时，例如“口岸附近”“学校旁边”“公司周边”，不要直接猜具体地点；先使用已保存地点候选发起澄清，让用户从候选地点里选。候选地点只作为 ask_user 的选项，不要替用户直接决定选哪个地点。
- 用户用自然语言描述小区、地址、联系人、备注、来源或其他模糊文本线索时，由你提炼最能命中房源的关键词，并作为 search_houses 的 q 参数传入；不要依赖后端正则拆词。
- 用户要求对比房源时，优先直接调用 prepare_house_comparison。
- 用户给出房源名称或近似名称时，把这些名称作为 houseNames 传入。
- 不要只搜索后就结束，也不要在用户确认前直接输出最终对比结论。
- 收到"前端执行器回调"且其中说明用户已确认对比房源时，基于回调中提供的房源信息进行对比分析，重点比较月租、月成本、户型、地址、通勤信息、状态、费用和备注，并给出明确推荐或取舍建议。
- 如果查询条件不足、对比对象不足或无法判断用户想查哪类房源，必须调用 ask_user 追问。
- ask_user 每次追问提供 2-5 个选项，选项之外前端会提供一个自定义输入。
- 如果没找到匹配结果，明确告知用户。

回答要求：
- 用中文回复，简洁清晰。
- 不要在回答中展示内部 ID。`;

const chatSystemPrompt = `你是一个友好的找房助手，正在和用户进行初次沟通。你的目标是了解用户需求，引导用户明确说出意图。

你可以做的事情：
1. 问候和建立初步对话。
2. 主动了解用户需求：是想找房子看看？还是想记录/添加一个房源或地点？还是想对比几个房子？
3. 如果用户说得模糊，通过提问帮他们理清需求。例如问"您是想要搜索房源、新增记录，还是对比已有的房源呢？"
4. 如果用户表达了明确需求但当前无法直接处理（比如需要特定搜索条件），帮他们理清方向，鼓励他们详细描述。
5. 保持友好、耐心、对话自然。

注意：不要编造房源信息或假装执行操作。如果用户说清楚了想做什么，引导他们重新表达。`;

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  houses: Annotation<House[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  toolResults: Annotation<ToolResult[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  actions: Annotation<AgentFrontendAction[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  intent: Annotation<Intent>({
    reducer: (_left, right) => right,
    default: () => 'chat',
  }),
  needsClarification: Annotation<boolean>({
    reducer: (_left, right) => right,
    default: () => false,
  }),
});

type AgentStateType = typeof AgentState.State;

function toLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
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

function collectToolResults(state: AgentStateType) {
  const toolResults = getTrailingToolResults(state.messages);
  const reply = createToolResultsReply(toolResults);

  return {
    ...(reply ? { messages: [new AIMessage(reply)] } : {}),
    toolResults,
    houses: toolResults.flatMap((result) => result.houses),
    actions: toolResults.flatMap((result) => result.actions ?? []),
  };
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

const clarificationQuestionAction: AgentFrontendAction = {
  id: 'intent-clarification',
  type: 'ask_single_choice',
  title: '确认你的需求',
  question: '你想让我接下来帮你做什么？',
  options: [
    {
      id: 'search',
      label: '搜索/查看房源',
      value: '我想搜索或查看房源信息。',
    },
    {
      id: 'write',
      label: '新增/修改记录',
      value: '我想新增或修改房源、地点记录。',
    },
    {
      id: 'compare',
      label: '对比几套房源',
      value: '我想对比几套房源。',
    },
  ],
  customOptionLabel: '自定义',
};

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

  const intent: Intent = ['write', 'query'].includes(result) ? (result as Intent) : 'chat';

  return { intent };
}

function routeFromAnalyzeIntent(state: AgentStateType) {
  if (state.needsClarification) return END;
  return state.intent;
}

function routeAfterToolResults(state: AgentStateType) {
  if (state.intent === 'chat') return END;

  const hasTerminalToolResult = state.toolResults.some((result) =>
    result.kind === 'frontend_action' ||
    result.kind === 'mutation' ||
    result.kind === 'invalid_params'
  );

  if (hasTerminalToolResult) return END;
  return state.intent;
}

function createAgentGraph() {
  const context = { houseRepository, locationRepository, amapService };
  const writeTools = createAgentTools(context, toolGroups.write);
  const queryTools = createAgentTools(context, toolGroups.query);

  return new StateGraph(AgentState)
    .addNode('analyze_intent', analyzeIntent)
    .addNode('agent_write', async (state) => {
      const llm = getLlm().bindTools(writeTools);
      const response = await llm.invoke([new SystemMessage(writeSystemPrompt), ...prepareMessagesForLlm(state.messages)]);
      return { messages: response };
    })
    .addNode('agent_query', async (state) => {
      const llm = getLlm().bindTools(queryTools);
      const response = await llm.invoke([new SystemMessage(querySystemPrompt), ...prepareMessagesForLlm(state.messages)]);
      return { messages: response };
    })
    .addNode('agent_chat', async (state) => {
      const llm = getLlm();
      const response = await llm.invoke([new SystemMessage(chatSystemPrompt), ...prepareMessagesForLlm(state.messages)]);
      return { messages: response };
    })
    .addNode('write_tools', new ToolNode(writeTools))
    .addNode('query_tools', new ToolNode(queryTools))
    .addNode('collect_tool_results', collectToolResults)
    .addEdge(START, 'analyze_intent')
    .addConditionalEdges('analyze_intent', routeFromAnalyzeIntent, { write: 'agent_write', query: 'agent_query', chat: 'agent_chat', [END]: END })
    .addConditionalEdges('agent_write', toolsCondition, { tools: 'write_tools', [END]: END })
    .addConditionalEdges('agent_query', toolsCondition, { tools: 'query_tools', [END]: END })
    .addEdge('agent_chat', END)
    .addEdge('write_tools', 'collect_tool_results')
    .addEdge('query_tools', 'collect_tool_results')
    .addConditionalEdges('collect_tool_results', routeAfterToolResults, { write: 'agent_write', query: 'agent_query', [END]: END })
    .compile();
}

export class AgentService {
  private readonly graph = createAgentGraph();

  async chat(messages: ChatMessage[]): Promise<AgentResult> {
    const result = await this.graph.invoke(
      { messages: toLangChainMessages(messages), houses: [], toolResults: [], actions: [] },
      { recursionLimit: 12 }
    );
    const lastAiMessage = getLastAiMessage(result.messages);

    return {
      reply: lastAiMessage ? responseContentToString(lastAiMessage.content) : '我暂时无法生成回复，请稍后再试。',
      houses: result.houses,
      actions: result.actions,
    };
  }
}
