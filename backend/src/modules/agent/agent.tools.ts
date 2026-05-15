import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { tool } from '@langchain/core/tools';
import { houseSourceChannels, houseStatuses, rentPaymentPeriods, type House, type HouseFilters } from '../houses/domain/house.js';
import { createHouseSchema, idParamsSchema, listHousesQuerySchema, updateHouseSchema } from '../houses/dto/house.schema.js';
import { locationCategories, type Location } from '../locations/domain/location.js';
import { createLocationSchema } from '../locations/dto/location.schema.js';
import type { HouseRepository } from '../houses/house.repository.js';
import type { LocationRepository } from '../locations/location.repository.js';
import type { AmapService } from '../maps/amap.service.js';

export const agentToolNames = [
  'search_houses',
  'get_house',
  'create_house',
  'update_house',
  'delete_house',
  'search_locations',
  'get_location',
  'create_location',
  'update_location',
  'delete_location',
  'get_focus_location',
] as const;

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

export interface ConfirmCreateLocationAction {
  id: string;
  type: 'confirm_create_location';
  title: string;
  payload: z.infer<typeof createLocationSchema>;
}

export interface ShowHouseSearchResultsAction {
  id: string;
  type: 'show_house_search_results';
  title: string;
  houses: House[];
}

export interface ShowLocationSearchResultsAction {
  id: string;
  type: 'show_location_search_results';
  title: string;
  locations: Location[];
}

export type AgentFrontendAction = ConfirmCreateHouseAction | ConfirmCreateLocationAction | ShowHouseSearchResultsAction | ShowLocationSearchResultsAction;

export interface ToolResult {
  kind: 'houses' | 'house' | 'mutation' | 'frontend_action' | 'focus_location' | 'empty' | 'invalid_params' | 'unknown_tool';
  content: string;
  houses: House[];
  actions?: AgentFrontendAction[];
  reply?: string;
}

interface AgentToolContext {
  houseRepository: HouseRepository;
  locationRepository: LocationRepository;
  amapService: AmapService;
}

const toolResultToJson = (result: ToolResult) => JSON.stringify(result);

const optionalNumberToolSchema = z.number().finite().optional();

const searchHousesToolSchema = z.object({
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
  propertyFee: optionalNumberToolSchema.describe('物业费'),
  waterFeePerTon: optionalNumberToolSchema.describe('水费，单位元/吨'),
  electricityFeePerKwh: optionalNumberToolSchema.describe('电费，单位元/度'),
  otherFee: optionalNumberToolSchema.describe('其他费用'),
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

const searchLocationsToolSchema = z.object({
  category: z.enum(locationCategories).optional().describe('地点分类'),
});

const locationInputToolSchema = z.object({
  name: z.string().trim().min(1).describe('地点名称'),
  category: z.enum(locationCategories).optional().describe('地点分类，默认 other'),
  address: z.string().trim().min(1).describe('地址'),
  latitude: optionalNumberToolSchema.describe('纬度'),
  longitude: optionalNumberToolSchema.describe('经度'),
  isFocus: z.boolean().optional().describe('是否设为焦点地点'),
  notes: z.string().trim().optional().describe('备注'),
});

const createLocationToolSchema = locationInputToolSchema;

const updateLocationToolSchema = z.object({
  id: idParamsSchema.shape.id,
  data: locationInputToolSchema.partial(),
});

const deleteLocationToolSchema = idParamsSchema;
const getLocationToolSchema = idParamsSchema;

export function createAgentTools(context: AgentToolContext) {
  return [
    tool(
      async (params) => toolResultToJson(await runAgentTool({ tool: 'search_houses', params }, context)),
      {
        name: 'search_houses',
        description: '根据租金、户型、状态、来源渠道或坐标范围搜索房源。用户想找、筛选、列出或比较房源时使用。',
        schema: searchHousesToolSchema,
      }
    ),
    tool(
      async (params) => toolResultToJson(await runAgentTool({ tool: 'get_house', params }, context)),
      {
        name: 'get_house',
        description: '根据明确的房源 ID 查询单套房源详情。',
        schema: getHouseToolSchema,
      }
    ),
    tool(
      async (params) => toolResultToJson(await runAgentTool({ tool: 'create_house', params }, context)),
      {
        name: 'create_house',
        description: '准备新增一套房源并交给前端弹窗让用户确认。必填项与手动创建一致：名称、地址、定位坐标、房租；工具会根据地址获取坐标，缺少名称/地址/房租或无法定位时不能创建。卧室数、客厅数、卫生间数未提供时默认 1。调用后不会直接入库。',
        schema: createHouseToolSchema,
      }
    ),
    tool(
      async (params) => toolResultToJson(await runAgentTool({ tool: 'update_house', params }, context)),
      {
        name: 'update_house',
        description: '更新一套已存在房源。必须有明确房源 ID 和要更新的字段；如果用户只描述房源名称或特征，先搜索候选房源。',
        schema: updateHouseToolSchema,
      }
    ),
    tool(
      async (params) => toolResultToJson(await runAgentTool({ tool: 'delete_house', params }, context)),
      {
        name: 'delete_house',
        description: '删除一套房源。删除不可逆，只有用户明确要求删除且提供明确房源 ID 时使用；否则先搜索或要求确认。',
        schema: deleteHouseToolSchema,
      }
    ),
    tool(
      async (params) => toolResultToJson(await runAgentTool({ tool: 'search_locations', params }, context)),
      {
        name: 'search_locations',
        description: '根据分类搜索地点。用户想找、列出或查看地点时使用。',
        schema: searchLocationsToolSchema,
      }
    ),
    tool(
      async (params) => toolResultToJson(await runAgentTool({ tool: 'get_location', params }, context)),
      {
        name: 'get_location',
        description: '根据明确的地点 ID 查询单条地点详情。',
        schema: getLocationToolSchema,
      }
    ),
    tool(
      async (params) => toolResultToJson(await runAgentTool({ tool: 'create_location', params }, context)),
      {
        name: 'create_location',
        description: '准备新增一个地点并交给前端弹窗让用户确认。必填项：名称、地址；工具会根据地址获取坐标，缺少名称/地址或无法定位时不能创建。调用后不会直接入库。',
        schema: createLocationToolSchema,
      }
    ),
    tool(
      async (params) => toolResultToJson(await runAgentTool({ tool: 'update_location', params }, context)),
      {
        name: 'update_location',
        description: '更新一个已存在地点。必须有明确地点 ID 和要更新的字段；如果用户只描述地点名称或特征，先搜索候选地点。',
        schema: updateLocationToolSchema,
      }
    ),
    tool(
      async (params) => toolResultToJson(await runAgentTool({ tool: 'delete_location', params }, context)),
      {
        name: 'delete_location',
        description: '删除一个地点。删除不可逆，只有用户明确要求删除且提供明确地点 ID 时使用；否则先搜索或要求确认。',
        schema: deleteLocationToolSchema,
      }
    ),
    tool(
      async () => toolResultToJson(await runAgentTool({ tool: 'get_focus_location', params: {} }, context)),
      {
        name: 'get_focus_location',
        description: '仅当用户明确询问焦点地点在哪里、是什么或要求查询焦点地点时使用。用户创建房源时提到“焦点地点是...”通常只是上下文，不要调用这个工具。',
        schema: z.object({}),
      }
    ),
  ];
}

export function toolParamsAsSearchFilters(params: Record<string, unknown> = {}): HouseFilters {
  return listHousesQuerySchema.parse({
    ...params,
    limit: params.limit ?? 20,
  });
}

export function formatHouseSummary(houses: House[]): string {
  return houses.map((house) => `- ${formatHouseLine(house)}`).join('\n');
}

export async function runAgentTool(toolCall: AgentToolCall, context: AgentToolContext): Promise<ToolResult> {
  const params = toolCall.params ?? {};

  try {
    if (toolCall.tool === 'search_houses') {
      return searchHouses(params, context);
    }

    if (toolCall.tool === 'get_house') {
      return getHouse(params, context);
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

    if (toolCall.tool === 'search_locations') {
      return searchLocations(params, context);
    }

    if (toolCall.tool === 'get_location') {
      return getLocation(params, context);
    }

    if (toolCall.tool === 'create_location') {
      return createLocation(params, context);
    }

    if (toolCall.tool === 'update_location') {
      return updateLocation(params, context);
    }

    if (toolCall.tool === 'delete_location') {
      return deleteLocation(params, context);
    }

    if (toolCall.tool === 'get_focus_location') {
      return getFocusLocation(context);
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

function searchHouses(params: Record<string, unknown>, { houseRepository }: AgentToolContext): ToolResult {
  const houses = houseRepository.list(toolParamsAsSearchFilters(params));

  if (houses.length === 0) {
    return {
      kind: 'empty',
      content: '没有找到匹配的房源。',
      houses: [],
      reply: '没有找到匹配的房源，建议调整预算、户型、状态或来源渠道后再试。',
    };
  }

  return {
    kind: 'houses',
    content: formatHouseSummary(houses),
    houses,
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
      content: `未找到 ID 为 ${id} 的房源。`,
      houses: [],
      reply: `没有找到 ID 为 ${id} 的房源。`,
    };
  }

  return {
    kind: 'house',
    content: formatHouseDetails(house),
    houses: [house],
    reply: `找到这套房源：\n${formatHouseDetails(house)}`,
  };
}

async function createHouse(params: Record<string, unknown>, { amapService }: AgentToolContext): Promise<ToolResult> {
  const toolInput = createHouseToolSchema.parse(params);
  let geocodeResult;

  try {
    geocodeResult = await amapService.geocode(toolInput.address);
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
      content: `无法定位地址：${toolInput.address}`,
      houses: [],
      reply: `房源还没有创建成功：无法定位地址「${toolInput.address}」。请提供更完整的城市、区县、小区或楼栋地址。`,
    };
  }

  const normalizedInput = createHouseSchema.parse({
    ...toolInput,
    bedroomCount: toolInput.bedroomCount ?? 1,
    livingRoomCount: toolInput.livingRoomCount ?? 1,
    bathroomCount: toolInput.bathroomCount ?? 1,
  });

  const input = createHouseSchema.parse({
    ...normalizedInput,
    address: geocodeResult.formattedAddress,
    latitude: geocodeResult.latitude,
    longitude: geocodeResult.longitude,
  });

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
    reply: `我已识别出一套待新增房源，请在弹窗中确认后再入库。\n${formatPendingHouseDetails(input)}`,
  };
}

function updateHouse(params: Record<string, unknown>, { houseRepository }: AgentToolContext): ToolResult {
  const { id, data } = updateHouseToolSchema.parse(params);
  const house = houseRepository.update(id, data);

  if (!house) {
    return {
      kind: 'empty',
      content: `未找到 ID 为 ${id} 的房源。`,
      houses: [],
      reply: `没有找到 ID 为 ${id} 的房源，无法更新。`,
    };
  }

  return {
    kind: 'mutation',
    content: formatHouseDetails(house),
    houses: [house],
    reply: `已更新房源「${house.name}」。\n${formatHouseDetails(house)}`,
  };
}

function deleteHouse(params: Record<string, unknown>, { houseRepository }: AgentToolContext): ToolResult {
  const { id } = deleteHouseToolSchema.parse(params);
  const house = houseRepository.findById(id);

  if (!house) {
    return {
      kind: 'empty',
      content: `未找到 ID 为 ${id} 的房源。`,
      houses: [],
      reply: `没有找到 ID 为 ${id} 的房源，无法删除。`,
    };
  }

  houseRepository.delete(id);

  return {
    kind: 'mutation',
    content: `已删除房源：${formatHouseLine(house)}`,
    houses: [],
    reply: `已删除房源「${house.name}」。`,
  };
}

function getFocusLocation({ locationRepository }: AgentToolContext): ToolResult {
  const focusLocation = locationRepository.list().find((location) => location.isFocus);

  if (!focusLocation) {
    return {
      kind: 'focus_location',
      content: '当前没有设置焦点地点。',
      houses: [],
      reply: '当前没有设置焦点地点。',
    };
  }

  return {
    kind: 'focus_location',
    content: `焦点地点是「${focusLocation.name}」，地址：${focusLocation.address}`,
    houses: [],
    reply: `焦点地点是「${focusLocation.name}」，地址：${focusLocation.address}`,
  };
}

function searchLocations(params: Record<string, unknown>, { locationRepository }: AgentToolContext): ToolResult {
  const locations = locationRepository.list(searchLocationsToolSchema.parse(params));

  if (locations.length === 0) {
    return {
      kind: 'empty',
      content: '没有找到匹配的地点。',
      houses: [],
      reply: '没有找到匹配的地点。',
    };
  }

  return {
    kind: 'houses',
    content: formatLocationSummary(locations),
    houses: [],
    actions: [
      {
        id: randomUUID(),
        type: 'show_location_search_results',
        title: `找到 ${locations.length} 个地点`,
        locations,
      },
    ],
  };
}

function getLocation(params: Record<string, unknown>, { locationRepository }: AgentToolContext): ToolResult {
  const { id } = getLocationToolSchema.parse(params);
  const location = locationRepository.findById(id);

  if (!location) {
    return {
      kind: 'empty',
      content: `未找到 ID 为 ${id} 的地点。`,
      houses: [],
      reply: `没有找到 ID 为 ${id} 的地点。`,
    };
  }

  return {
    kind: 'house',
    content: formatLocationDetails(location),
    houses: [],
    reply: `找到这个地点：\n${formatLocationDetails(location)}`,
  };
}

async function createLocation(params: Record<string, unknown>, { amapService }: AgentToolContext): Promise<ToolResult> {
  const toolInput = createLocationToolSchema.parse(params);
  let geocodeResult;

  try {
    geocodeResult = await amapService.geocode(toolInput.address);
  } catch (error) {
    return {
      kind: 'invalid_params',
      content: error instanceof Error ? error.message : '地址定位失败。',
      houses: [],
      reply: '地点还没有创建成功：地址定位失败。请确认地址足够完整，或稍后再试。',
    };
  }

  if (!geocodeResult) {
    return {
      kind: 'invalid_params',
      content: `无法定位地址：${toolInput.address}`,
      houses: [],
      reply: `地点还没有创建成功：无法定位地址「${toolInput.address}」。请提供更完整的城市、区县、小区或楼栋地址。`,
    };
  }

  const input = createLocationSchema.parse({
    ...toolInput,
    address: geocodeResult.formattedAddress,
    latitude: geocodeResult.latitude,
    longitude: geocodeResult.longitude,
  });

  return {
    kind: 'frontend_action',
    content: formatPendingLocationDetails(input),
    houses: [],
    actions: [
      {
        id: randomUUID(),
        type: 'confirm_create_location',
        title: `确认新增地点「${input.name}」`,
        payload: input,
      },
    ],
    reply: `我已识别出一个待新增地点，请在弹窗中确认后再入库。\n${formatPendingLocationDetails(input)}`,
  };
}

function updateLocation(params: Record<string, unknown>, { locationRepository }: AgentToolContext): ToolResult {
  const { id, data } = updateLocationToolSchema.parse(params);
  const location = locationRepository.update(id, data);

  if (!location) {
    return {
      kind: 'empty',
      content: `未找到 ID 为 ${id} 的地点。`,
      houses: [],
      reply: `没有找到 ID 为 ${id} 的地点，无法更新。`,
    };
  }

  return {
    kind: 'mutation',
    content: formatLocationDetails(location),
    houses: [],
    reply: `已更新地点「${location.name}」。\n${formatLocationDetails(location)}`,
  };
}

function deleteLocation(params: Record<string, unknown>, { locationRepository }: AgentToolContext): ToolResult {
  const { id } = deleteLocationToolSchema.parse(params);
  const location = locationRepository.findById(id);

  if (!location) {
    return {
      kind: 'empty',
      content: `未找到 ID 为 ${id} 的地点。`,
      houses: [],
      reply: `没有找到 ID 为 ${id} 的地点，无法删除。`,
    };
  }

  locationRepository.delete(id);

  return {
    kind: 'mutation',
    content: `已删除地点：${formatLocationLine(location)}`,
    houses: [],
    reply: `已删除地点「${location.name}」。`,
  };
}

function formatLocationLine(location: Location): string {
  return `${location.name} | ID: ${location.id} | 地址: ${location.address} | 分类: ${location.category}${location.isFocus ? ' | 焦点地点' : ''}`;
}

function formatLocationSummary(locations: Location[]): string {
  return locations.map((location) => `- ${formatLocationLine(location)}`).join('\n');
}

function formatLocationDetails(location: Location): string {
  const lines = [
    formatLocationLine(location),
    location.latitude !== undefined && location.longitude !== undefined ? `坐标：${location.latitude}, ${location.longitude}` : undefined,
    location.notes ? `备注：${location.notes}` : undefined,
  ].filter(Boolean);

  return lines.join('\n');
}

function formatPendingLocationDetails(location: z.infer<typeof createLocationSchema>): string {
  const lines = [
    formatLocationLine(location as Location),
    location.latitude !== undefined && location.longitude !== undefined ? `坐标：${location.latitude}, ${location.longitude}` : undefined,
    location.notes ? `备注：${location.notes}` : undefined,
  ].filter(Boolean);

  return lines.join('\n');
}

function formatHouseLine(house: House): string {
  return `${house.name} | ID: ${house.id} | 租金: ${house.rentPrice}元/月 | ${house.bedroomCount}室${house.livingRoomCount}厅${house.bathroomCount}卫 | ${house.address} | 状态: ${house.status}`;
}

function formatPendingHouseDetails(house: z.infer<typeof createHouseSchema>): string {
  const optionalLines = [
    house.sourceChannel ? `来源：${house.sourceChannel}` : undefined,
    house.rentPaymentPeriods?.length ? `付款周期：${house.rentPaymentPeriods.join(', ')}` : undefined,
    house.propertyFee !== undefined ? `物业费：${house.propertyFee}` : undefined,
    house.waterFeePerTon !== undefined ? `水费：${house.waterFeePerTon}/吨` : undefined,
    house.electricityFeePerKwh !== undefined ? `电费：${house.electricityFeePerKwh}/度` : undefined,
    house.otherFee !== undefined ? `其他费用：${house.otherFee}` : undefined,
    house.phone ? `电话：${house.phone}` : undefined,
    house.wechat ? `微信：${house.wechat}` : undefined,
    house.contactNotes ? `联系备注：${house.contactNotes}` : undefined,
  ].filter(Boolean);

  return [
    `${house.name} | 租金: ${house.rentPrice}元/月 | ${house.bedroomCount}室${house.livingRoomCount}厅${house.bathroomCount}卫 | ${house.address} | 状态: ${house.status}`,
    house.latitude !== undefined && house.longitude !== undefined ? `坐标：${house.latitude}, ${house.longitude}` : undefined,
    ...optionalLines,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatHouseDetails(house: House): string {
  const optionalLines = [
    house.sourceChannel ? `来源：${house.sourceChannel}` : undefined,
    house.rentPaymentPeriods?.length ? `付款周期：${house.rentPaymentPeriods.join(', ')}` : undefined,
    house.propertyFee !== undefined ? `物业费：${house.propertyFee}` : undefined,
    house.waterFeePerTon !== undefined ? `水费：${house.waterFeePerTon}/吨` : undefined,
    house.electricityFeePerKwh !== undefined ? `电费：${house.electricityFeePerKwh}/度` : undefined,
    house.otherFee !== undefined ? `其他费用：${house.otherFee}` : undefined,
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
