<script setup lang="ts">
import { formatCurrency } from '../../../shared/utils/format';

defineProps<{
  total: number;
  averageRent: number;
  shortlistedCount: number;
}>();
</script>

<template>
  <section class="summary-grid">
    <div class="metric">
      <span>房源数量</span>
      <strong>{{ total }}</strong>
    </div>
    <div class="metric">
      <span>平均月租</span>
      <strong>{{ formatCurrency(averageRent) }}</strong>
    </div>
    <div class="metric">
      <span>收藏候选</span>
      <strong>{{ shortlistedCount }}</strong>
    </div>
  </section>
</template>
