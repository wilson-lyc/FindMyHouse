import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { tool } from '@langchain/core/tools';
import { houseSourceChannels, houseStatuses, rentPaymentPeriods, type House, type HouseFilters, type HouseStatus } from '@findmyhouse/contracts';
import { createHouseSchema, idParamsSchema, listHousesQuerySchema, validateCreateHouse, validateDeleteHouse, validateUpdateHouse } from '@findmyhouse/contracts';
import type { HouseRepository } from '../houses/house.repository.js';
import type { AmapService } from '../maps/amap.service.js';

export const agentToolNames = [
  'ask_user',
  'search_houses',
  'get_house',
  'prepare_house_comparison',
  'create_house',
  'update_house',
  'delete_house',
] as const;

// 按功能职责把工具分成三组，每个 agent 节点只绑定自己的一组，避免无关工具干扰判断。
export const toolGroups = {
  // 写操作：新增/修改/删除房源。
  write: [
    'ask_user',
    'search_houses',
    'get_house',
    'create_house',
    'update_house',
    'delete_house',
  ] as const satisfies readonly string[],
  // 搜索/查看：查询、筛选、列出售源。
  query: [
    'ask_user',
    'search_houses',
    'get_house',
  ] as const satisfies readonly string[],
  // 对比：整理候选房源并请用户确认后对比。
  compare: [
    'ask_user',
    'search_houses',
    'get_house',
    'prepare_house_comparison',
  ] as const satisfies readonly string[],
};

export type AgentToolName = (typeof agentToolNames)[number];

export interface AgentToolCall {
  tool: AgentToolName | string;
  params?: Record<string, unknown>;
}

export interface ConfirmCreateHouseAction {
  id: string;
  type: 'confirm_create_house';
  title: string;
  payload: z.infer<typeof createHouseSchema>;
}

interface ConfirmUpdateHouseAction {
  id: string;
  type: 'confirm_update_house';
  title: string;
  houseId: string;
  payload: House;
}

interface ConfirmDeleteHouseAction {
  id: string;
  type: 'confirm_delete_house';
  title: string;
  houseId: string;
  houseName: string;
}

export interface ShowHouseSearchResultsAction {
  id: string;
  type: 'show_house_search_results';
  title: string;
  houses: House[];
}

export interface ConfirmCompareHousesAction {
  id: string;
  type: 'confirm_compare_houses';
  title: string;
  houses: House[];
}

export interface AskSingleChoiceAction {
  id: string;
  type: 'ask_single_choice';
  title: string;
  question: string;
  options: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  customOptionLabel: string;
}

export type AgentFrontendAction =
  | ConfirmCreateHouseAction
  | ConfirmUpdateHouseAction
  | ConfirmDeleteHouseAction
  | ShowHouseSearchResultsAction
  | ConfirmCompareHousesAction
  | AskSingleChoiceAction;

export interface ToolResult {
  kind: 'houses' | 'house' | 'mutation' | 'frontend_action' | 'empty' | 'invalid_params' | 'unknown_tool';
  content: string;
  houses: House[];
  actions?: AgentFrontendAction[];
  reply?: string;
}

interface AgentToolContext {
  houseRepository: HouseRepository;
  amapService: AmapService;
}

const toolResultToJson = (result: ToolResult) => JSON.stringify(result);

const optionalNumberToolSchema = z.number().finite().optional();

const askUserToolSchema = z.object({
  title: z.string().trim().min(1).default('需要补充信息').describe('追问标题'),
  question: z.string().trim().min(1).describe('要问用户的问题'),
  options: z.array(z.object({
    id: z.string().trim().min(1).optional().describe('选项 ID，不提供时自动生成'),
    label: z.string().trim().min(1).describe('展示给用户的选项文案'),
    value: z.string().trim().min(1).describe('用户选择后发送给助手的完整答案'),
  })).min(2).max(5).describe('可供用户选择的选项，最少 2 个，最多 5 个'),
  customOptionLabel: z.string().trim().min(1).default('自定义').describe('自定义输入框占位文案'),
});

const houseStatusLabels: Record<HouseStatus, string> = {
  watching: '观望中',
  interested: '感兴趣',
  negotiating: '谈判中',
  abandoned: '已放弃',
  signed: '已签约',
};

const searchHousesToolSchema = z.object({
  q: z.string().trim().min(1).optional().describe('LLM 从用户自然语言中构建出的房源关键词，用于匹配房源名称、地址、联系人、备注等文本字段'),
  status: z.enum(houseStatuses).optional().describe('房源状态'),
  sourceChannel: z.enum(houseSourceChannels).optional().describe('来源渠道'),
  minRentPrice: z.number().int().nonnegative().optional().describe('最低租金，单位元/月'),
  maxRentPrice: z.number().int().nonnegative().optional().describe('最高租金，单位元/月'),
  minBedroomCount: z.number().int().nonnegative().optional().describe('最少卧室数'),
  maxBedroomCount: z.number().int().nonnegative().optional().describe('最多卧室数'),
  minLivingRoomCount: z.number().int().nonnegative().optional().describe('最少客厅数'),
  maxLivingRoomCount: z.number().int().nonnegative().optional().describe('最多客厅数'),
  minBathroomCount: z.number().int().nonnegative().optional().describe('最少卫生间数'),
  maxBathroomCount: z.number().int().nonnegative().optional().describe('最多卫生间数'),
  minLatitude: optionalNumberToolSchema.describe('最小纬度'),
  maxLatitude: optionalNumberToolSchema.describe('最大纬度'),
  minLongitude: optionalNumberToolSchema.describe('最小经度'),
  maxLongitude: optionalNumberToolSchema.describe('最大经度'),
  limit: z.number().int().positive().max(100).optional().describe('返回数量限制，默认20'),
});

const houseInputToolSchema = z.object({
  name: z.string().trim().min(1).describe('房源名称'),
  status: z.enum(houseStatuses).optional().describe('房源状态，默认 watching'),
  bedroomCount: z.number().int().nonnegative().describe('卧室数'),
  livingRoomCount: z.number().int().nonnegative().describe('客厅数'),
  bathroomCount: z.number().int().nonnegative().describe('卫生间数'),
  sourceChannel: z.enum(houseSourceChannels).optional().describe('来源渠道'),
  address: z.string().trim().min(1).describe('地址'),
  latitude: optionalNumberToolSchema.describe('纬度'),
  longitude: optionalNumberToolSchema.describe('经度'),
  rentPrice: z.number().int().nonnegative().describe('租金，单位元/月'),
  rentPaymentPeriods: z.array(z.enum(rentPaymentPeriods)).optional().describe('付款周期'),
  earnestMoney: optionalNumberToolSchema.describe('定金，单位元'),
  deposit: optionalNumberToolSchema.describe('押金，单位元'),
  propertyFee: optionalNumberToolSchema.describe('物业费'),
  waterFeePerTon: optionalNumberToolSchema.describe('水费，单位元/吨'),
  electricityFeePerKwh: optionalNumberToolSchema.describe('电费，单位元/度'),
  customFees: z.array(z.object({ name: z.string(), amount: z.number() })).optional().describe('自定义费用项目，如网费、保洁费等'),
  feeNotes: z.string().trim().optional().describe('租金费用备注'),
  contactName: z.string().trim().optional().describe('联系人'),
  phone: z.string().trim().optional().describe('联系电话'),
  wechat: z.string().trim().optional().describe('微信'),
  contactNotes: z.string().trim().optional().describe('联系备注'),
});

const createHouseToolSchema = houseInputToolSchema.extend({
  bedroomCount: z.number().int().nonnegative().optional().describe('卧室数，未提供时默认 1'),
  livingRoomCount: z.number().int().nonnegative().optional().describe('客厅数，未提供时默认 1'),
  bathroomCount: z.number().int().nonnegative().optional().describe('卫生间数，未提供时默认 1'),
});

const updateHouseToolSchema = z.object({
  id: idParamsSchema.shape.id,
  data: houseInputToolSchema.partial(),
});

const deleteHouseToolSchema = idParamsSchema;
const getHouseToolSchema = idParamsSchema;
const prepareHouseComparisonToolSchema = z
  .object({
    houseIds: z.array(idParamsSchema.shape.id).max(4).optional().describe('需要对比的房源 ID。如果已经知道 ID，优先提供 ID。'),
    houseNames: z.array(z.string().trim().min(1)).max(4).optional().describe('用户自然语言里提到的房源名称或关键词，例如“人才公寓”“保利公寓”。当用户直接说要对比某些房源时使用。'),
  })
  .refine((value) => (value.houseIds?.length ?? 0) + (value.houseNames?.length ?? 0) >= 2, {
    message: '至少需要提供两个房源 ID 或名称关键词。',
  });

const toolDefinitions: Array<{
  name: AgentToolName;
  description: string;
  schema: z.ZodSchema;
}> = [
  { name: 'ask_user', description: '当用户信息不足、目标记录不明确或需要用户从候选方案中选择时使用。每次追问必须提供 2-5 个选项，前端会额外提供一个自定义输入选项。', schema: askUserToolSchema },
  { name: 'search_houses', description: '根据 LLM 构建的关键词、租金、户型、状态、来源渠道或坐标范围搜索房源。用户想找、筛选、列出或比较房源时使用；如果用户提到小区、地址、联系人、来源描述或其他文本线索，应先由 LLM 提炼成 q 关键词传入。', schema: searchHousesToolSchema },
  { name: 'get_house', description: '根据明确的房源 ID 查询单套房源详情。', schema: getHouseToolSchema },
  { name: 'prepare_house_comparison', description: '当用户要求对比房源时优先使用。可以直接传入用户提到的房源名称/关键词（houseNames），例如”人才公寓””保利公寓”；如果已经知道房源 ID，也可以传 houseIds。工具会整理 2-4 套候选房源并让前端弹窗请用户确认，确认后用户会把确认结果作为回调发回来，你再基于确认的房源做对比分析。', schema: prepareHouseComparisonToolSchema },
  { name: 'create_house', description: '从用户的自然语言里提炼创建房源所需的字段，并进行代码硬编码校验，校验通过后把数据回填成表单交给前端弹窗让用户二次确认；工具本身绝不写数据库。流程：1) 你负责从对话中提炼 name/address/rentPrice 等字段填入本工具；2) 工具用代码严格校验必填项（名称、地址、租金）是否齐全、字段是否合法；3) 不齐全或非法时，工具会精确返回缺失/非法的字段清单，你据此用中文向用户追问补全省量，用户补充后再次调用本工具；4) 校验通过后，工具返回 confirm_create_house 弹窗（含已识别的全部字段），由用户在弹窗中修改错别字/不符项并点击确认，前端再调用统一创建接口入库。卧室数、客厅数、卫生间数未提供时默认 1。', schema: createHouseToolSchema },
  { name: 'update_house', description: '更新一套已存在房源。必须有明确房源 ID 和要更新的字段；如果用户只描述房源名称或特征，先搜索候选房源。', schema: updateHouseToolSchema },
  { name: 'delete_house', description: '删除一套房源。删除不可逆，只有用户明确要求删除且提供明确房源 ID 时使用；否则先搜索或要求确认。', schema: deleteHouseToolSchema },
];

export function createAgentTools(
  context: AgentToolContext,
  toolNames?: readonly string[]
) {
  const nameSet = new Set<string>(toolNames ?? agentToolNames);
  return toolDefinitions
    .filter((def) => nameSet.has(def.name))
    .map((def) =>
      tool(
        async (params: Record<string, unknown> | undefined) => toolResultToJson(await runAgentTool({ tool: def.name, params }, context)),
        { name: def.name, description: def.description, schema: def.schema }
      )
    );
}

export function toolParamsAsSearchFilters(params: Record<string, unknown> = {}): HouseFilters {
  return listHousesQuerySchema.parse({
    ...params,
    limit: params.limit ?? 20,
  });
}

export function formatHouseSummary(houses: House[]): string {
  return [
    '| 房源 | 租金 | 户型 | 状态 | 地址 |',
    '| --- | ---: | --- | --- | --- |',
    ...houses.map(
      (house) =>
        `| ${escapeMarkdownTableCell(house.name)} | ${house.rentPrice} 元/月 | ${formatHouseLayout(house)} | ${houseStatusLabels[house.status]} | ${escapeMarkdownTableCell(house.address)} |`
    ),
  ].join('\n');
}

export async function runAgentTool(toolCall: AgentToolCall, context: AgentToolContext): Promise<ToolResult> {
  const params = toolCall.params ?? {};

  try {
    if (toolCall.tool === 'ask_user') {
      return askUser(params);
    }

    if (toolCall.tool === 'search_houses') {
      return searchHouses(params, context);
    }

    if (toolCall.tool === 'get_house') {
      return getHouse(params, context);
    }

    if (toolCall.tool === 'prepare_house_comparison') {
      return prepareHouseComparison(params, context);
    }

    if (toolCall.tool === 'create_house') {
      return createHouse(params, context);
    }

    if (toolCall.tool === 'update_house') {
      return updateHouse(params, context);
    }

    if (toolCall.tool === 'delete_house') {
      return deleteHouse(params, context);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        kind: 'invalid_params',
        content: z.prettifyError(error),
        houses: [],
        reply: `工具参数不完整或格式不正确：${z.prettifyError(error)}`,
      };
    }

    throw error;
  }

  return {
    kind: 'unknown_tool',
    content: `未知工具：${toolCall.tool}`,
    houses: [],
    reply: '暂时不支持这个操作。',
  };
}

function askUser(params: Record<string, unknown>): ToolResult {
  const input = askUserToolSchema.parse(params);

  return {
    kind: 'frontend_action',
    content: input.question,
    houses: [],
    actions: [
      {
        id: randomUUID(),
        type: 'ask_single_choice',
        title: input.title,
        question: input.question,
        options: input.options.map((option, index) => ({
          id: option.id ?? `option-${index + 1}`,
          label: option.label,
          value: option.value,
        })),
        customOptionLabel: input.customOptionLabel,
      },
    ],
    reply: input.question,
  };
}

function searchHouses(params: Record<string, unknown>, { houseRepository }: AgentToolContext): ToolResult {
  const filters = toolParamsAsSearchFilters(params);
  const houses = houseRepository.list(filters);
  const searchConditions = formatHouseSearchConditions(filters);

  if (houses.length === 0) {
    return {
      kind: 'empty',
      content: '没有找到匹配的房源。',
      houses: [],
      reply: `${searchConditions}\n\n没有找到匹配的房源，建议调整预算、户型、状态或来源渠道后再试。`,
    };
  }

  return {
    kind: 'houses',
    content: formatHouseSummary(houses),
    houses,
    reply: `${searchConditions}\n\n共有 ${houses.length} 套房源：\n\n${formatHouseSummary(houses)}`,
    actions: [
      {
        id: randomUUID(),
        type: 'show_house_search_results',
        title: `找到 ${houses.length} 套房源`,
        houses,
      },
    ],
  };
}

function getHouse(params: Record<string, unknown>, { houseRepository }: AgentToolContext): ToolResult {
  const { id } = getHouseToolSchema.parse(params);
  const house = houseRepository.findById(id);

  if (!house) {
    return {
      kind: 'empty',
      content: '未找到这套房源。',
      houses: [],
      reply: '没有找到这套房源。',
    };
  }

  return {
    kind: 'house',
    content: formatHouseDetails(house),
    houses: [house],
    reply: `找到这套房源：\n${formatHouseDetails(house)}`,
  };
}

function prepareHouseComparison(params: Record<string, unknown>, { houseRepository }: AgentToolContext): ToolResult {
  const { houseIds, houseNames } = prepareHouseComparisonToolSchema.parse(params);
  const allHouses = houseRepository.list({ limit: 100 });
  const housesById = [...new Set(houseIds ?? [])]
    .map((id) => houseRepository.findById(id))
    .filter((house): house is House => Boolean(house));
  const housesByName = (houseNames ?? [])
    .map((name) => findBestHouseMatch(allHouses, name))
    .filter((house): house is House => Boolean(house));
  const houses = dedupeHouses([...housesById, ...housesByName]).slice(0, 4);

  if (houses.length < 2) {
    return {
      kind: 'empty',
      content: '可用于对比的房源不足两套。',
      houses,
      reply: '我还没有定位到至少两套可对比的房源。请告诉我要对比哪些房源，或换一种更接近房源名称的描述再试。',
    };
  }

  const requestedCount = (houseIds?.length ?? 0) + (houseNames?.length ?? 0);
  const missingCount = requestedCount - houses.length;
  const title = `确认对比 ${houses.length} 套房源`;
  const missingNotice = missingCount > 0 ? `\n\n有 ${missingCount} 套房源没有找到，已先列出可确认的房源。` : '';

  return {
    kind: 'frontend_action',
    content: formatHouseSummary(houses),
    houses,
    actions: [
      {
        id: randomUUID(),
        type: 'confirm_compare_houses',
        title,
        houses,
      },
    ],
    reply: `我整理了以下 ${houses.length} 套待对比房源，请在弹窗中确认后，我再开始分析：\n\n${formatHouseSummary(houses)}${missingNotice}`,
  };
}

function dedupeHouses(houses: House[]): House[] {
  const seen = new Set<string>();

  return houses.filter((house) => {
    if (seen.has(house.id)) return false;
    seen.add(house.id);
    return true;
  });
}

function findBestHouseMatch(houses: House[], query: string): House | undefined {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return undefined;

  const scoredMatches = houses
    .map((house) => ({ house, score: scoreHouseMatch(house, normalizedQuery) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredMatches[0]?.house;
}

function scoreHouseMatch(house: House, normalizedQuery: string): number {
  const normalizedName = normalizeSearchText(house.name);
  const normalizedAddress = normalizeSearchText(house.address);

  if (normalizedName === normalizedQuery) return 100;
  if (normalizedName.includes(normalizedQuery)) return 80 + normalizedQuery.length;
  if (normalizedQuery.includes(normalizedName)) return 70 + normalizedName.length;
  if (normalizedAddress.includes(normalizedQuery)) return 50 + normalizedQuery.length;

  const commonChars = new Set([...normalizedQuery].filter((char) => normalizedName.includes(char)));
  if (commonChars.size >= Math.min(2, normalizedQuery.length)) {
    return commonChars.size * 10;
  }

  return 0;
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

// 创建房源工具：只负责“从对话提炼字段 + 复用 House 层统一校验 + 回填表单交前端确认”，绝不写库。
// 校验链：1) 先补默认值，再调用 House 层统一的 validateCreateHouse（确定性代码，单一事实来源，不依赖 AI 判断）；
//        2) 不齐全/非法 → 返回缺失字段清单，由 agent 引导用户补充，再重新调用；
//        3) 通过 → 高德定位地址，回填坐标后交前端二次确认弹窗，入库由统一接口完成。
async function createHouse(params: Record<string, unknown>, { amapService }: AgentToolContext): Promise<ToolResult> {
  const rawInput = createHouseToolSchema.parse(params);

  // 1) 先补默认值，再复用 House 层统一校验函数；手动表单提交也走同一份规则，保证一致性。
  const normalizedInput = {
    ...rawInput,
    bedroomCount: rawInput.bedroomCount ?? 1,
    livingRoomCount: rawInput.livingRoomCount ?? 1,
    bathroomCount: rawInput.bathroomCount ?? 1,
  };
  const validation = validateCreateHouse(normalizedInput);

  if (!validation.success) {
    const missing = validation.errors.join('；');
    return {
      kind: 'invalid_params',
      content: `创建房源信息不完整：${missing}`,
      houses: [],
      reply: `房源还没创建成功，还缺这些信息：${missing}。麻烦补充一下，我再帮你生成表单。`,
    };
  }

  // 2) 地址定位：定位失败属于外部依赖错误，同样反馈给用户补充地址，不静默吞掉。
  let geocodeResult;
  try {
    geocodeResult = await amapService.geocode(validation.data.address);
  } catch (error) {
    return {
      kind: 'invalid_params',
      content: error instanceof Error ? error.message : '地址定位失败。',
      houses: [],
      reply: '房源还没有创建成功：地址定位失败。请确认地址足够完整，或稍后再试。',
    };
  }

  if (!geocodeResult) {
    return {
      kind: 'invalid_params',
      content: `无法定位地址：${validation.data.address}`,
      houses: [],
      reply: `房源还没有创建成功：无法定位地址「${validation.data.address}」。请提供更完整的城市、区县、小区或楼栋地址。`,
    };
  }

  // 3) 校验通过：回填定位后的地址与坐标，交给前端 confirm_create_house 二次确认弹窗。
  const input = { ...validation.data, address: geocodeResult.formattedAddress, latitude: geocodeResult.latitude, longitude: geocodeResult.longitude };

  return {
    kind: 'frontend_action',
    content: formatPendingHouseDetails(input),
    houses: [],
    actions: [
      {
        id: randomUUID(),
        type: 'confirm_create_house',
        title: `确认新增房源「${input.name}」`,
        payload: input,
      },
    ],
    reply: '我已识别出一套待新增房源，请在弹窗中确认后再入库。',
  };
}

// 更新房源工具：只负责“提炼字段 + 复用 House 层统一校验 + 回填表单交前端二次确认”，绝不写库。
// 流程：1) 用 validateUpdateHouse 校验本次提供的字段是否合法；2) 校验通过则合并到现有房源上，
//       生成完整表单返回 confirm_update_house 弹窗；3) 用户在前端确认后由统一更新接口入库。
function updateHouse(params: Record<string, unknown>, { houseRepository }: AgentToolContext): ToolResult {
  const { id, data } = updateHouseToolSchema.parse(params);
  const house = houseRepository.findById(id);

  if (!house) {
    return {
      kind: 'empty',
      content: '未找到这套房源。',
      houses: [],
      reply: '没有找到这套房源，无法更新。请确认房源名称或 ID 是否正确。',
    };
  }

  const validation = validateUpdateHouse(data);

  if (!validation.success) {
    const invalid = validation.errors.join('；');
    return {
      kind: 'invalid_params',
      content: `更新房源信息不合法：${invalid}`,
      houses: [],
      reply: `房源还没更新成功，这些字段有问题：${invalid}。麻烦修正后我再帮你提交。`,
    };
  }

  // 把用户提供的字段合并到现有房源上（undefined 的字段不覆盖原值），形成完整表单交前端弹窗确认。
  const cleanedData = Object.fromEntries(Object.entries(validation.data).filter(([, v]) => v !== undefined));
  const merged = { ...house, ...cleanedData } as typeof house;

  return {
    kind: 'frontend_action',
    content: formatHouseDetails(house),
    houses: [],
    actions: [
      {
        id: randomUUID(),
        type: 'confirm_update_house',
        title: `确认更新房源「${house.name}」`,
        houseId: house.id,
        payload: merged,
      },
    ],
    reply: `我已整理出房源「${house.name}」的待更新内容，请在弹窗中确认或修改。`,
  };
}

// 删除房源工具：只负责“校验 id + 交前端二次确认”，绝不写库。
// 流程：1) validateDeleteHouse 校验 id；2) 返回 confirm_delete_house 弹窗；3) 用户确认后由统一删除接口入库。
function deleteHouse(params: Record<string, unknown>, { houseRepository }: AgentToolContext): ToolResult {
  const validation = validateDeleteHouse(deleteHouseToolSchema.parse(params).id);

  if (!validation.success) {
    return {
      kind: 'invalid_params',
      content: validation.error,
      houses: [],
      reply: validation.error,
    };
  }

  const house = houseRepository.findById(validation.data.id);

  if (!house) {
    return {
      kind: 'empty',
      content: '未找到这套房源。',
      houses: [],
      reply: '没有找到这套房源，无法删除。请确认房源名称或 ID 是否正确。',
    };
  }

  return {
    kind: 'frontend_action',
    content: `待删除房源：${formatHouseLine(house)}`,
    houses: [],
    actions: [
      {
        id: randomUUID(),
        type: 'confirm_delete_house',
        title: `确认删除房源「${house.name}」`,
        houseId: house.id,
        houseName: house.name,
      },
    ],
    reply: `即将删除房源「${house.name}」，请在弹窗中确认。`,
  };
}

function formatHouseLine(house: House): string {
  return `${house.name} | 租金: ${house.rentPrice}元/月 | ${formatHouseLayout(house)} | ${house.address} | 状态: ${houseStatusLabels[house.status]}`;
}

function formatHouseSearchConditions(
  filters: HouseFilters
): string {
  const conditions = [
    filters.q ? `关键词：「${filters.q}」` : undefined,
    filters.minRentPrice !== undefined && filters.maxRentPrice !== undefined
      ? `租金：${filters.minRentPrice}-${filters.maxRentPrice} 元/月`
      : undefined,
    filters.minRentPrice !== undefined && filters.maxRentPrice === undefined ? `租金：不低于 ${filters.minRentPrice} 元/月` : undefined,
    filters.maxRentPrice !== undefined && filters.minRentPrice === undefined ? `租金：不高于 ${filters.maxRentPrice} 元/月` : undefined,
    formatRangeCondition('卧室', filters.minBedroomCount, filters.maxBedroomCount),
    formatRangeCondition('客厅', filters.minLivingRoomCount, filters.maxLivingRoomCount),
    formatRangeCondition('卫生间', filters.minBathroomCount, filters.maxBathroomCount),
    filters.status ? `状态：${houseStatusLabels[filters.status]}` : undefined,
    filters.sourceChannel ? `来源：${filters.sourceChannel}` : undefined,
    hasCoordinateBounds(filters) ? '位置：按地图范围筛选' : undefined,
    filters.limit !== undefined ? `最多返回：${filters.limit} 套` : undefined,
  ].filter((condition): condition is string => Boolean(condition));

  if (conditions.length === 0) {
    return '我把你的需求转换成了搜索条件：全部房源。';
  }

  return `我把你的需求转换成了这些搜索条件：${conditions.join('；')}。`;
}

function formatRangeCondition(label: string, min?: number, max?: number): string | undefined {
  if (min === undefined && max === undefined) return undefined;
  if (min !== undefined && max !== undefined && min === max) return `${label}：${min} 个`;
  if (min !== undefined && max !== undefined) return `${label}：${min}-${max} 个`;
  if (min !== undefined) return `${label}：不少于 ${min} 个`;
  return `${label}：不多于 ${max} 个`;
}

function hasCoordinateBounds(filters: HouseFilters): boolean {
  return (
    filters.minLatitude !== undefined ||
    filters.maxLatitude !== undefined ||
    filters.minLongitude !== undefined ||
    filters.maxLongitude !== undefined
  );
}

function formatPendingHouseDetails(house: z.infer<typeof createHouseSchema>): string {
  const optionalLines = [
    house.sourceChannel ? `来源：${house.sourceChannel}` : undefined,
    house.rentPaymentPeriods?.length ? `付款周期：${house.rentPaymentPeriods.join(', ')}` : undefined,
    house.earnestMoney !== undefined ? `定金：${house.earnestMoney}` : undefined,
    house.deposit !== undefined ? `押金：${house.deposit}` : undefined,
    house.propertyFee !== undefined ? `物业费：${house.propertyFee}` : undefined,
    house.waterFeePerTon !== undefined ? `水费：${house.waterFeePerTon}/吨` : undefined,
    house.electricityFeePerKwh !== undefined ? `电费：${house.electricityFeePerKwh}/度` : undefined,
    ...(house.customFees?.map(fee => `自定义费用-${fee.name}：${fee.amount}`) ?? []),
    house.feeNotes ? `费用备注：${house.feeNotes}` : undefined,
    house.contactName ? `联系人：${house.contactName}` : undefined,
    house.phone ? `电话：${house.phone}` : undefined,
    house.wechat ? `微信：${house.wechat}` : undefined,
    house.contactNotes ? `联系备注：${house.contactNotes}` : undefined,
  ].filter(Boolean);

  return [
    `${house.name} | 租金: ${house.rentPrice}元/月 | ${formatHouseLayout(house)} | ${house.address} | 状态: ${houseStatusLabels[house.status]}`,
    house.latitude !== undefined && house.longitude !== undefined ? `坐标：${house.latitude}, ${house.longitude}` : undefined,
    ...optionalLines,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatHouseLayout(house: Pick<House, 'bedroomCount' | 'livingRoomCount' | 'bathroomCount'>): string {
  return `${house.bedroomCount}室${house.livingRoomCount}厅${house.bathroomCount}卫`;
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function formatHouseDetails(house: House): string {
  const optionalLines = [
    house.sourceChannel ? `来源：${house.sourceChannel}` : undefined,
    house.rentPaymentPeriods?.length ? `付款周期：${house.rentPaymentPeriods.join(', ')}` : undefined,
    house.earnestMoney !== undefined ? `定金：${house.earnestMoney}` : undefined,
    house.deposit !== undefined ? `押金：${house.deposit}` : undefined,
    house.propertyFee !== undefined ? `物业费：${house.propertyFee}` : undefined,
    house.waterFeePerTon !== undefined ? `水费：${house.waterFeePerTon}/吨` : undefined,
    house.electricityFeePerKwh !== undefined ? `电费：${house.electricityFeePerKwh}/度` : undefined,
    ...(house.customFees?.map(fee => `自定义费用-${fee.name}：${fee.amount}`) ?? []),
    house.feeNotes ? `费用备注：${house.feeNotes}` : undefined,
    house.contactName ? `联系人：${house.contactName}` : undefined,
    house.phone ? `电话：${house.phone}` : undefined,
    house.wechat ? `微信：${house.wechat}` : undefined,
    house.contactNotes ? `联系备注：${house.contactNotes}` : undefined,
  ].filter(Boolean);

  return [
    formatHouseLine(house),
    house.latitude !== undefined && house.longitude !== undefined ? `坐标：${house.latitude}, ${house.longitude}` : undefined,
    ...optionalLines,
  ]
    .filter(Boolean)
    .join('\n');
}
