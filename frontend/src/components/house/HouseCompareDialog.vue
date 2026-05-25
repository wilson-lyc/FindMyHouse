<script setup lang="ts">
import { computed } from 'vue';
import { formatCurrency } from '../../lib/format';
import {
  houseSourceChannelLabels,
  rentPaymentPeriodLabels,
  type CustomFeeItem,
  type House
} from '../../model/house/house';
import type { CommuteDistanceResult } from '../../model/map/geocode';
import { statusLabels } from '../../model/house/house-status';

const props = defineProps<{
  modelValue: boolean;
  houses: House[];
  routes: Map<string, CommuteDistanceResult>;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
}>();

const tableData = computed(() =>
  comparisonRows.value.map((row) => {
    const obj: Record<string, string> = { label: row.label };
    props.houses.forEach((house, index) => {
      obj[house.id] = row.values[index];
    });
    return obj;
  })
);

const comparisonRows = computed(() => [
  {
    label: '状态',
    values: props.houses.map((house) => statusLabels[house.status])
  },
  {
    label: '户型',
    values: props.houses.map((house) => `${house.bedroomCount}房${house.livingRoomCount}厅${house.bathroomCount}卫`)
  },
  {
    label: '月租',
    values: props.houses.map((house) => formatCurrency(house.rentPrice))
  },
  {
    label: '月成本',
    values: props.houses.map((house) => formatCurrency(getMonthlyTotalCost(house)))
  },
  {
    label: '付款周期',
    values: props.houses.map(formatPaymentPeriods)
  },
  {
    label: '定金',
    values: props.houses.map((house) => formatCurrency(house.earnestMoney))
  },
  {
    label: '押金',
    values: props.houses.map((house) => formatCurrency(house.deposit))
  },
  {
    label: '通勤',
    values: props.houses.map(formatRoute)
  },
  {
    label: '渠道',
    values: props.houses.map((house) => (house.sourceChannel ? houseSourceChannelLabels[house.sourceChannel] : '-'))
  },
  {
    label: '物业费',
    values: props.houses.map((house) => formatCurrency(house.propertyFee))
  },
  {
    label: '水费',
    values: props.houses.map((house) => formatUnitFee(house.waterFeePerTon, '/吨'))
  },
  {
    label: '电费',
    values: props.houses.map((house) => formatUnitFee(house.electricityFeePerKwh, '/度'))
  },
  {
    label: '其他费用',
    values: props.houses.map(formatCustomFees)
  },
  {
    label: '费用备注',
    values: props.houses.map((house) => house.feeNotes || '-')
  },
  {
    label: '联系方式',
    values: props.houses.map(formatContact)
  },
  {
    label: '地址',
    values: props.houses.map((house) => house.address || '-')
  },
  {
    label: '联系备注',
    values: props.houses.map((house) => house.contactNotes || '-')
  }
]);

function getMonthlyTotalCost(house: House) {
  const customFeesTotal = (house.customFees ?? []).reduce((sum, fee) => sum + fee.amount, 0);
  return house.rentPrice + (house.propertyFee ?? 0) + customFeesTotal;
}

function formatCustomFees(house: House) {
  if (!house.customFees?.length) return '-';
  return house.customFees.map((fee) => `${fee.name} ${formatCurrency(fee.amount)}`).join('、');
}

function formatPaymentPeriods(house: House) {
  if (!house.rentPaymentPeriods?.length) return '-';

  return house.rentPaymentPeriods.map((period) => rentPaymentPeriodLabels[period]).join('、');
}

function formatUnitFee(value: number | undefined, suffix: string) {
  if (value === undefined) return '-';

  return `${formatCurrency(value)}${suffix}`;
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`;
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}分钟`;

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return `${hours}小时${restMinutes ? `${restMinutes}分钟` : ''}`;
}

function formatRoute(house: House) {
  const route = props.routes.get(house.id);
  if (!route) return house.latitude !== undefined && house.longitude !== undefined ? '计算中' : '无坐标';

  return `${formatDuration(route.duration)} / ${formatDistance(route.distance)}`;
}

function formatContact(house: House) {
  const contacts = [house.contactName, house.phone, house.wechat].filter(Boolean);
  return contacts.length ? contacts.join(' / ') : '-';
}
</script>

<template>
  <el-dialog
    class="house-compare-dialog"
    :model-value="modelValue"
    title="房源对比"
    width="min(1080px, calc(100vw - 32px))"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-table
      :data="tableData"
      height="calc(70vh - 60px)"
      border
      v-loading="loading"
      header-cell-class-name="compare-table-header"
    >
      <el-table-column prop="label" label="项目" width="100" />
      <el-table-column
        v-for="house in houses"
        :key="house.id"
        :prop="house.id"
        :label="house.name"
        min-width="140"
      />
    </el-table>
  </el-dialog>
</template>

<style scoped>
.compare-table-header {
  background: var(--el-fill-color-light, #f5f7fa) !important;
}
</style>
