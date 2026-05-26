<script setup lang="ts">
import { computed } from 'vue';
import { formatCurrency } from '../../lib/format';
import { statusLabels, statusType } from '../../model/house/house-status';
import { houseSourceChannelLabels } from '../../model/house/house';
import type { House } from '../../model/house/house';
import type { CommuteDistanceResult, CommuteMode } from '../../model/map/geocode';
import { commuteModeLabels } from '../../model/map/geocode';

const props = defineProps<{
  house: House;
  drivingDistance?: CommuteDistanceResult;
  focusLocationName?: string;
  commuteMode?: CommuteMode;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [house: House];
}>();

const customFeesTotal = computed(() => {
  const total = (props.house.customFees ?? []).reduce((sum, fee) => sum + fee.amount, 0);
  return total > 0 ? total : undefined;
});

const hasFeeInfo = computed(() => {
  return (
    props.house.waterFeePerTon !== undefined ||
    props.house.electricityFeePerKwh !== undefined ||
    props.house.propertyFee !== undefined ||
    customFeesTotal.value !== undefined
  );
});

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1) + 'km';
  }
  return Math.round(meters) + 'm';
}

function formatDuration(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.round(seconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours + 'h' + (mins > 0 ? mins + 'min' : '');
    }
    return minutes + 'min';
  }
  return Math.round(seconds) + 's';
}

function formatFeeLabel(value: number | undefined, suffix: string) {
  if (value === undefined) return;
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 2
  }).format(value) + suffix;
}

function handleClick() {
  if (!props.disabled) {
    emit('select', props.house);
  }
}
</script>

<template>
  <div
    class="chat-house-card"
    :class="{ 'chat-house-card--disabled': disabled }"
    @click="handleClick"
  >
    <div class="chat-house-card-header">
      <div class="chat-house-card-title-row">
        <strong class="chat-house-card-name">{{ house.name }}</strong>
        <el-tag
          :type="statusType(house.status)"
          size="small"
          class="chat-house-card-status"
        >
          {{ statusLabels[house.status] }}
        </el-tag>
      </div>
      <div class="chat-house-card-meta">
        <span class="chat-house-card-price">{{ formatCurrency(house.rentPrice) }}</span>
        <span class="chat-house-card-divider">|</span>
        <span class="chat-house-card-layout">{{ house.bedroomCount }}室{{ house.livingRoomCount }}厅{{ house.bathroomCount }}卫</span>
      </div>
    </div>

    <div class="chat-house-card-body">
      <div class="chat-house-card-address">
        {{ house.address }}
      </div>

      <div
        v-if="drivingDistance && focusLocationName"
        class="chat-house-card-commute"
      >
        <span class="chat-house-card-commute-mode">{{ commuteMode ? commuteModeLabels[commuteMode] : '' }}</span>
        距{{ focusLocationName }}
        <span class="chat-house-card-commute-value">{{ formatDistance(drivingDistance.distance) }}</span>
        /
        <span class="chat-house-card-commute-value">{{ formatDuration(drivingDistance.duration) }}</span>
      </div>

      <div
        v-if="hasFeeInfo"
        class="chat-house-card-fees"
      >
        <span
          v-if="house.waterFeePerTon !== undefined"
          class="chat-house-card-fee-item"
        >
          水{{ formatFeeLabel(house.waterFeePerTon, '/吨') }}
        </span>
        <span
          v-if="house.electricityFeePerKwh !== undefined"
          class="chat-house-card-fee-item"
        >
          电{{ formatFeeLabel(house.electricityFeePerKwh, '/度') }}
        </span>
        <span
          v-if="house.propertyFee !== undefined"
          class="chat-house-card-fee-item"
        >
          物业{{ formatFeeLabel(house.propertyFee, '/月') }}
        </span>
        <span
          v-if="customFeesTotal"
          class="chat-house-card-fee-item"
        >
          其他{{ formatCurrency(customFeesTotal) }}
        </span>
      </div>
    </div>

    <div class="chat-house-card-footer">
      <div class="chat-house-card-footer-left">
        <el-tag
          v-if="house.sourceChannel && houseSourceChannelLabels[house.sourceChannel]"
          size="small"
          type="info"
          effect="plain"
          class="chat-house-card-source"
        >
          {{ houseSourceChannelLabels[house.sourceChannel] }}
        </el-tag>
      </div>
      <el-button
        v-if="!disabled"
        link
        type="primary"
        size="small"
        class="chat-house-card-detail-btn"
        @click.stop="handleClick"
      >
        查看详情
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.chat-house-card {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
  cursor: pointer;
  transition: all 0.18s ease;
}

.chat-house-card:hover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.chat-house-card--disabled {
  cursor: default;
}

.chat-house-card--disabled:hover {
  border-color: var(--el-border-color-light);
  background: var(--el-bg-color);
}

.chat-house-card-header {
  display: grid;
  gap: 4px;
}

.chat-house-card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.chat-house-card-name {
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--app-text-primary);
}

.chat-house-card-status {
  flex: 0 0 auto;
  font-weight: 600;
}

.chat-house-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 1.3;
}

.chat-house-card-price {
  color: var(--el-color-danger);
  font-weight: 700;
  font-size: 15px;
}

.chat-house-card-divider {
  color: var(--el-border-color);
  font-weight: 200;
}

.chat-house-card-layout {
  color: var(--el-text-color-secondary);
}

.chat-house-card-body {
  display: grid;
  gap: 4px;
}

.chat-house-card-address {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.chat-house-card-commute {
  font-size: 12px;
  color: var(--el-color-warning-dark-2);
  line-height: 1.4;
}

.chat-house-card-commute-mode {
  font-weight: 600;
  margin-right: 2px;
}

.chat-house-card-commute-value {
  font-weight: 600;
}

.chat-house-card-fees {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 2px;
}

.chat-house-card-fee-item {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  line-height: 1.3;
}

.chat-house-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  padding-top: 6px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.chat-house-card-footer-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.chat-house-card-source {
  flex: 0 0 auto;
  font-weight: 500;
}

.chat-house-card-detail-btn {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 600;
}
</style>
