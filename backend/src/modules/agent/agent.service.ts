import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { Annotation, END, messagesStateReducer, START, StateGraph } from '@langchain/langgraph';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { getLlm } from '../langchain/llm.js';
import { db } from '../../database/connection.js';
import { HouseRepository } from '../houses/house.repository.js';
import { LocationRepository } from '../locations/location.repository.js';
import { AmapService } from '../maps/amap.service.js';
import type { House } from '../houses/domain/house.js';
import { createAgentTools, type AgentFrontendAction, type ToolResult } from './agent.tools.js';

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

const systemPrompt = `你是一个专业的找房助手，帮助用户搜索、管理和维护房源信息。

你可以使用工具查询、搜索、准备新增、更新和删除房源和地点，也可以获取焦点地点。请优先依赖工具返回的数据，不要编造房源、ID、价格、地址或联系人信息。

工具使用原则：
- 用户想找房、筛选、列出、比较、查看详情、更新或删除房源时，使用相应房源工具。
- 用户想找某个地点附近、周边或 N 公里内的房源时，使用按地点附近搜索房源工具；地点查询只是中间步骤，不要把地点列表作为最终回答。
- 用户想找、列出、查看、新增、更新或删除地点时，使用相应地点工具。
- 新增房源时，如果名称、地址或租金缺失，先追问，不要编造；地址必须由工具解析出坐标后才能交给用户确认，卧室数、客厅数、卫生间数缺失时按 1室1厅1卫 准备。创建工具只会触发前端确认弹窗，不会直接入库。
- 用户要求对比房源时，优先直接调用 prepare_house_comparison。用户给出房源名称或近似名称时，把这些名称作为 houseNames 传入；如果已经知道 ID，再传 houseIds。不要只搜索后就结束，也不要在用户确认前直接输出最终对比结论。
- 收到"前端执行器回调"且其中说明用户已确认对比房源时，基于回调中提供的房源信息进行对比分析，重点比较月租、月成本、户型、地址、通勤信息、状态、费用和备注，并给出明确推荐或取舍建议。
- 收到"前端执行器回调"且其中说明用户已确认并成功创建房源时，明确回复创建成功，并总结新增房源。
- 当用户要求新增房源时，即使消息里包含"焦点地点是……"这类上下文，也不要把它当成查询焦点地点；应继续判断创建房源缺哪些必填项。
- 只有用户明确询问"焦点地点在哪里/是什么/查询焦点地点"时，才使用获取焦点地点工具。
- 更新或删除房源或地点时，如果没有明确 ID，先搜索候选列表或请用户确认。
- 删除不可逆，只有用户明确要求删除且能定位到 ID 时才删除。
- 新增地点时，如果名称或地址缺失，先追问，不要编造；地址必须由工具解析出坐标后才能交给用户确认。创建工具只会触发前端确认弹窗，不会直接入库。
- 如果一个问题需要多步完成，可以连续使用工具，直到有足够信息回答。
- 如果用户要求的事情超出当前工具或产品能力范围，不要假装可以完成，也不要编造结果；如实告诉用户"我还没有这个能力"，并欢迎用户到 https://github.com/wilson-lyc/FindMyHouse.git 提交 ISSUE。

回答要求：
- 用中文回复。
- 简洁清晰地总结房源名称、租金、户型、地址、状态和关键备注。
- 不要在最终回答中展示房源或地点的内部 ID；这些 ID 只用于工具调用和系统内部处理。
- 对地点搜索结果，简洁清晰地总结地点名称、地址、分类。
- 对搜索结果给出有用的建议和对比分析。
- 如果用户要找房源但没有匹配结果，应明确说没有符合条件的房源，不要说没有匹配地点。
- 对暂不支持的请求，简短说明当前还没有这个能力，并附上 https://github.com/wilson-lyc/FindMyHouse.git 作为 ISSUE 反馈地址。
- 当工具执行准备新增、更新、删除，或收到前端创建回调后，明确说明执行结果。`;

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
});

type AgentStateType = typeof AgentState.State;

function toLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
  return messages.map((message) =>
    message.role === 'user' ? new HumanMessage(message.content) : new AIMessage(message.content)
  );
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
