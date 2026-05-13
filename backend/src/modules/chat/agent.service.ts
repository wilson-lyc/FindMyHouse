import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { Annotation, END, messagesStateReducer, START, StateGraph } from '@langchain/langgraph';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { getLlm } from '../langchain/llm.js';
import { db } from '../../database/connection.js';
import { HouseRepository } from '../houses/house.repository.js';
import { LocationRepository } from '../locations/location.repository.js';
import { AmapService } from '../maps/amap.service.js';
import type { House } from '../houses/domain/house.js';
import { createAgentTools, type ToolResult } from './agent.tools.js';

const houseRepository = new HouseRepository(db);
const locationRepository = new LocationRepository(db);
const amapService = new AmapService();

export interface AgentResult {
  reply: string;
  houses: House[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const systemPrompt = `你是一个专业的找房助手，帮助用户搜索、管理和维护房源信息。

你可以使用工具查询、新增、更新和删除房源，也可以获取焦点地点。请优先依赖工具返回的数据，不要编造房源、ID、价格、地址或联系人信息。

工具使用原则：
- 用户想找房、筛选、列出、比较、查看详情、更新或删除房源时，使用相应工具。
- 新增房源时，如果名称、地址或租金缺失，先追问，不要编造；地址必须由工具解析出坐标后才能创建，卧室数、客厅数、卫生间数缺失时按 1室1厅1卫 创建。
- 更新或删除房源时，如果没有明确房源 ID，先搜索候选房源或请用户确认。
- 删除不可逆，只有用户明确要求删除且能定位到房源 ID 时才删除。
- 如果一个问题需要多步完成，可以连续使用工具，直到有足够信息回答。

回答要求：
- 用中文回复。
- 简洁清晰地总结房源名称、租金、户型、地址、状态和关键备注。
- 对搜索结果给出有用的建议和对比分析。
- 当工具执行新增、更新、删除后，明确说明执行结果。`;

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
});

type AgentStateType = typeof AgentState.State;

function toLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
  return messages.map((message) =>
    message.role === 'user' ? new HumanMessage(message.content) : new AIMessage(message.content)
  );
}

function responseContentToString(content: unknown): string {
  return typeof content === 'string' ? content : JSON.stringify(content);
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

function shouldFinishAfterToolResults(state: AgentStateType) {
  return state.toolResults.length > 0 ? END : 'agent';
}

function createAgentGraph() {
  const tools = createAgentTools({ houseRepository, locationRepository, amapService });
  const toolNode = new ToolNode(tools);

  return new StateGraph(AgentState)
    .addNode('agent', async (state) => {
      const llm = getLlm().bindTools(tools);
      const response = await llm.invoke([new SystemMessage(systemPrompt), ...state.messages]);

      return {
        messages: response,
      };
    })
    .addNode('tools', toolNode)
    .addNode('collect_tool_results', collectToolResults)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', toolsCondition, ['tools', END])
    .addEdge('tools', 'collect_tool_results')
    .addConditionalEdges('collect_tool_results', shouldFinishAfterToolResults, ['agent', END])
    .compile();
}

export class AgentService {
  private readonly graph = createAgentGraph();

  async chat(messages: ChatMessage[]): Promise<AgentResult> {
    const result = await this.graph.invoke(
      { messages: toLangChainMessages(messages), houses: [], toolResults: [] },
      { recursionLimit: 12 }
    );
    const lastAiMessage = getLastAiMessage(result.messages);

    return {
      reply: lastAiMessage ? responseContentToString(lastAiMessage.content) : '我暂时无法生成回复，请稍后再试。',
      houses: result.houses,
    };
  }
}
