import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { getLlm } from '../langchain/llm.js';
import { db } from '../../database/connection.js';
import { HouseRepository } from '../houses/house.repository.js';
import { LocationRepository } from '../locations/location.repository.js';
import type { House } from '../houses/domain/house.js';

const houseRepository = new HouseRepository(db);
const locationRepository = new LocationRepository(db);

export interface AgentResult {
  reply: string;
  houses: House[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentToolCall {
  tool: 'search_houses' | 'get_focus_location' | string;
  params?: Record<string, unknown>;
}

interface ToolResult {
  kind: 'houses' | 'focus_location' | 'empty' | 'unknown_tool';
  content: string;
  houses: House[];
  reply?: string;
}

const systemPrompt = `你是一个专业的找房助手，帮助用户搜索和筛选房源。

你可以根据用户的自然语言描述，调用工具来搜索房源。在回答之前，先判断是否需要搜索房源。

工具列表：
1. search_houses: 根据条件搜索房源
   参数说明：
   - minRentPrice (可选): 最低租金（元/月）
   - maxRentPrice (可选): 最高租金（元/月）
   - minBedroomCount (可选): 最少卧室数
   - maxBedroomCount (可选): 最多卧室数
   - minLivingRoomCount (可选): 最少客厅数
   - maxLivingRoomCount (可选): 最多客厅数
   - minBathroomCount (可选): 最少卫生间数
   - maxBathroomCount (可选): 最多卫生间数
   - status (可选): 房源状态，可选值：watching(看房中), interested(感兴趣), negotiating(谈价中), abandoned(已放弃), signed(已签约)
   - sourceChannel (可选): 来源渠道，可选值：beike, mini_program, anjuke, lianjia, offline_agent, other
   - limit (可选): 返回数量限制，默认20

2. get_focus_location: 获取焦点地点信息

在回答时，请遵循以下格式：
- 如果需要搜索房源，先输出 ===TOOL_CALL=== 标记，然后在新行输出一个JSON对象，表示要调用的工具
- 然后输出你的回答

JSON格式示例：
{"tool": "search_houses", "params": {"maxRentPrice": 5000, "minBedroomCount": 2}}
{"tool": "get_focus_location", "params": {}}

注意：一次只能调用一个工具。如果用户的问题不涉及房源搜索，直接回答即可。

回答要求：
- 用中文回复
- 总结找到的房源信息，包括名称、租金、户型、地址等
- 给出有用的建议和对比分析
- 回答要简洁清晰`;

const systemPromptWithResults = (results: string) => `你是一个专业的找房助手，帮助用户搜索和筛选房源。

以下是用户请求的房源搜索结果，基于这些结果给出回答：
${results}

回答要求：
- 用中文回复
- 总结找到的房源信息，包括名称、租金、户型、地址等
- 给出有用的建议和对比分析
- 回答要简洁清晰`;

const AgentState = Annotation.Root({
  messages: Annotation<ChatMessage[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  draftReply: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => '',
  }),
  finalReply: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => '',
  }),
  toolCall: Annotation<AgentToolCall | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  toolResult: Annotation<ToolResult | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  houses: Annotation<House[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
});

type AgentStateType = typeof AgentState.State;

function toLangChainMessages(messages: ChatMessage[]) {
  const lastUserMessage = messages[messages.length - 1]?.content ?? '';

  return [
    ...messages.slice(0, -1).map((msg) =>
      msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
    ),
    new HumanMessage(lastUserMessage),
  ];
}

function responseContentToString(content: unknown): string {
  return typeof content === 'string' ? content : JSON.stringify(content);
}

function extractJsonAfterToolMarker(content: string): { jsonText: string; fullMatch: string } | null {
  const markerMatch = content.match(/===TOOL_CALL===\s*\n\s*/);

  if (!markerMatch || markerMatch.index === undefined) {
    return null;
  }

  const jsonStart = markerMatch.index + markerMatch[0].length;
  if (content[jsonStart] !== '{') {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let i = jsonStart; i < content.length; i += 1) {
    const char = content[i];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    }

    if (char === '}') {
      depth -= 1;
    }

    if (depth === 0) {
      const jsonText = content.slice(jsonStart, i + 1);
      const trailingWhitespace = content.slice(i + 1).match(/^\s*\n?/)?.[0] ?? '';
      return {
        jsonText,
        fullMatch: content.slice(markerMatch.index, i + 1 + trailingWhitespace.length),
      };
    }
  }

  return null;
}

function parseToolCall(content: string): { toolCall: AgentToolCall | null; replyWithoutToolCall: string } {
  const extracted = extractJsonAfterToolMarker(content);

  if (!extracted) {
    return { toolCall: null, replyWithoutToolCall: content };
  }

  const replyWithoutToolCall = content.replace(extracted.fullMatch, '').trim();

  try {
    return {
      toolCall: JSON.parse(extracted.jsonText) as AgentToolCall,
      replyWithoutToolCall,
    };
  } catch {
    return {
      toolCall: null,
      replyWithoutToolCall: replyWithoutToolCall || content,
    };
  }
}

function toolParamsAsSearchFilters(params: Record<string, unknown> = {}) {
  const limit = typeof params.limit === 'number' ? params.limit : 20;
  return { ...params, limit };
}

function formatHouseSummary(houses: House[]): string {
  return houses
    .map(
      (h) =>
        `- ${h.name} | 租金: ${h.rentPrice}元/月 | ${h.bedroomCount}室${h.livingRoomCount}厅${h.bathroomCount}卫 | ${h.address} | 状态: ${h.status}`
    )
    .join('\n');
}

function routeAfterPlanning(state: AgentStateType) {
  return state.toolCall ? 'run_tool' : END;
}

function routeAfterTool(state: AgentStateType) {
  return state.toolResult?.kind === 'houses' && state.houses.length > 0 ? 'summarize_results' : END;
}

function createAgentGraph() {
  return new StateGraph(AgentState)
    .addNode('plan', async (state) => {
      const llm = getLlm();
      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        ...toLangChainMessages(state.messages),
      ]);
      const content = responseContentToString(response.content);
      const { toolCall, replyWithoutToolCall } = parseToolCall(content);

      return {
        draftReply: replyWithoutToolCall,
        finalReply: toolCall ? '' : content,
        toolCall,
        houses: [],
      };
    })
    .addNode('run_tool', async (state) => {
      const toolCall = state.toolCall;

      if (!toolCall) {
        return {
          finalReply: state.draftReply,
          houses: [],
        };
      }

      if (toolCall.tool === 'search_houses') {
        const houses = houseRepository.list(toolParamsAsSearchFilters(toolCall.params) as never);

        if (houses.length === 0) {
          const reply = state.draftReply || '没有找到匹配的房源，建议您调整搜索条件。';
          return {
            finalReply: reply,
            houses: [],
            toolResult: {
              kind: 'empty',
              content: reply,
              houses: [],
              reply,
            } satisfies ToolResult,
          };
        }

        return {
          houses,
          toolResult: {
            kind: 'houses',
            content: formatHouseSummary(houses),
            houses,
          } satisfies ToolResult,
        };
      }

      if (toolCall.tool === 'get_focus_location') {
        const locations = locationRepository.list();
        const focusLocation = locations.find((l) => l.isFocus);
        const reply = focusLocation
          ? state.draftReply || `焦点地点是「${focusLocation.name}」，地址：${focusLocation.address}`
          : state.draftReply || '当前没有设置焦点地点。';

        return {
          finalReply: reply,
          houses: [],
          toolResult: {
            kind: 'focus_location',
            content: reply,
            houses: [],
            reply,
          } satisfies ToolResult,
        };
      }

      return {
        finalReply: state.draftReply,
        houses: state.houses,
        toolResult: {
          kind: 'unknown_tool',
          content: state.draftReply,
          houses: state.houses,
          reply: state.draftReply,
        } satisfies ToolResult,
      };
    })
    .addNode('summarize_results', async (state) => {
      const llm = getLlm();
      const response = await llm.invoke([
        new SystemMessage(systemPromptWithResults(state.toolResult?.content ?? '')),
        ...toLangChainMessages(state.messages),
        new AIMessage(state.draftReply || `为你找到了${state.houses.length}套房源。`),
      ]);

      return {
        finalReply: responseContentToString(response.content),
      };
    })
    .addEdge(START, 'plan')
    .addConditionalEdges('plan', routeAfterPlanning)
    .addConditionalEdges('run_tool', routeAfterTool)
    .addEdge('summarize_results', END)
    .compile();
}

export class AgentService {
  private readonly graph = createAgentGraph();

  async chat(messages: ChatMessage[]): Promise<AgentResult> {
    const result = await this.graph.invoke({ messages });
    return {
      reply: result.finalReply || result.draftReply,
      houses: result.houses,
    };
  }
}
