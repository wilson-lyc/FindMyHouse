import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
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

export class AgentService {
  private foundHouses: House[] = [];

  async chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<AgentResult> {
    this.foundHouses = [];

    const llm = getLlm();
    const lastUserMessage = messages[messages.length - 1].content;

    const langchainMessages = [
      new SystemMessage(systemPrompt),
      ...messages.slice(0, -1).map((msg) =>
        msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      ),
      new HumanMessage(lastUserMessage),
    ];

    const response = await llm.invoke(langchainMessages);

    const content = typeof response.content === 'string' ? response.content : '';

    const toolCallMatch = content.match(/===TOOL_CALL===\s*\n\s*(\{[\s\S]*?\})\s*\n?/);
    if (toolCallMatch) {
      try {
        const toolCall = JSON.parse(toolCallMatch[1]);
        const replyWithoutToolCall = content
          .replace(/===TOOL_CALL===\s*\n\s*\{[\s\S]*?\}\s*\n?/, '')
          .trim();

        if (toolCall.tool === 'search_houses') {
          const params = toolCall.params || {};
          const limit = typeof params.limit === 'number' ? params.limit : 20;
          const houses = houseRepository.list({ ...params, limit } as never);

          if (houses.length === 0) {
            this.foundHouses = [];
            return {
              reply: replyWithoutToolCall || '没有找到匹配的房源，建议您调整搜索条件。',
              houses: [],
            };
          }

          this.foundHouses = houses;
          const houseSummary = houses
            .map(
              (h) =>
                `- ${h.name} | 租金: ${h.rentPrice}元/月 | ${h.bedroomCount}室${h.livingRoomCount}厅${h.bathroomCount}卫 | ${h.address} | 状态: ${h.status}`
            )
            .join('\n');

          const finalResponse = await llm.invoke([
            new SystemMessage(systemPromptWithResults(houseSummary)),
            ...messages.slice(0, -1).map((msg) =>
              msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
            ),
            new HumanMessage(lastUserMessage),
            new AIMessage(replyWithoutToolCall || `为你找到了${houses.length}套房源。`),
          ]);

          return {
            reply: typeof finalResponse.content === 'string' ? finalResponse.content : JSON.stringify(finalResponse.content),
            houses,
          };
        }

        if (toolCall.tool === 'get_focus_location') {
          const locations = locationRepository.list();
          const focusLocation = locations.find((l) => l.isFocus);
          if (!focusLocation) {
            return {
              reply: replyWithoutToolCall || '当前没有设置焦点地点。',
              houses: [],
            };
          }
          return {
            reply:
              replyWithoutToolCall ||
              `焦点地点是「${focusLocation.name}」，地址：${focusLocation.address}`,
            houses: [],
          };
        }

        return {
          reply: replyWithoutToolCall || content,
          houses: this.foundHouses,
        };
      } catch {
        const cleanContent = content
          .replace(/===TOOL_CALL===\s*\n\s*\{[\s\S]*?\}\s*\n?/, '')
          .trim();
        return {
          reply: cleanContent || content,
          houses: this.foundHouses,
        };
      }
    }

    return {
      reply: content,
      houses: this.foundHouses,
    };
  }
}
