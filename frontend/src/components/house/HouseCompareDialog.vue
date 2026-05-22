<script setup lang="ts">
import { computed } from 'vue';
import { formatCurrency } from '../../lib/format';
import {
  houseSourceChannelLabels,
  rentPaymentPeriodLabels,
  type House
} from '../../model/house/house';
import type { DrivingRouteResult } from '../../model/map/geocode';
import { statusLabels } from '../../model/house/house-status';

const props = defineProps<{
  modelValue: boolean;
  houses: House[];
  drivingRoutes: Map<string, DrivingRouteResult>;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
}>();

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
    values: props.houses.map((house) => formatCurrency(house.otherFee))
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
    label: '备注',
    values: props.houses.map((house) => house.contactNotes || '-')
  }
]);

function getMonthlyTotalCost(house: House) {
  return house.rentPrice + (house.propertyFee ?? 0) + (house.otherFee ?? 0);
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
  const route = props.drivingRoutes.get(house.id);
  if (!route) return house.latitude !== undefined && house.longitude !== undefined ? '计算中' : '无坐标';

  return `${formatDuration(route.duration)} / ${formatDistance(route.distance)}`;
}

function formatContact(house: House) {
  const contacts = [house.phone, house.wechat].filter(Boolean);
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
    <el-scrollbar class="house-compare-scrollbar">
      <section v-loading="loading" class="compare-table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th>项目</th>
              <th v-for="house in houses" :key="house.id">
                <div class="compare-house-heading">
                  <strong>{{ house.name }}</strong>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in comparisonRows" :key="row.label">
              <th>{{ row.label }}</th>
              <td v-for="(value, index) in row.values" :key="`${row.label}-${houses[index]?.id}`">
                {{ value }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </el-scrollbar>
  </el-dialog>
</template>
