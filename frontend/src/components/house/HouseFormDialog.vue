<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Aim } from '@element-plus/icons-vue';
import { geocodeAddress } from '../../api/map/map-api';
import CoordinatePicker from '../map/CoordinatePicker.vue';
import {
  houseSourceChannelLabels,
  houseSourceChannels,
  houseStatuses,
  rentPaymentPeriodLabels,
  rentPaymentPeriods,
  type House,
  type HouseForm
} from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import { createEmptyHouseForm, houseToForm } from '../../lib/house/house-form';

const props = defineProps<{
  modelValue: boolean;
  house: House | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  submit: [form: HouseForm];
}>();

const formRef = ref<FormInstance>();
const geocoding = ref(false);
const form = reactive<HouseForm>(createEmptyHouseForm());

const formSections = [
  { key: 'basic', label: '基础信息' },
  { key: 'location', label: '地理位置' },
  { key: 'fees', label: '租金费用' },
  { key: 'contact', label: '联系方式' }
];

const rules: FormRules<HouseForm> = {
  name: [{ required: true, message: '请输入房源名称', trigger: 'blur' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }],
  rentPrice: [{ required: true, type: 'number', min: 0, message: '请输入有效月租金', trigger: 'blur' }]
};

watch(
  () => [props.modelValue, props.house] as const,
  ([visible, house]) => {
    if (!visible) return;
    Object.assign(form, house ? houseToForm(house) : createEmptyHouseForm());
    formRef.value?.clearValidate();
  },
  { immediate: true }
);

async function geocode() {
  if (!form.address.trim()) {
    ElMessage.warning('请先输入地址');
    return;
  }

  geocoding.value = true;
  try {
    const result = await geocodeAddress(form.address);
    form.address = result.formattedAddress || form.address;
    form.latitude = result.latitude;
    form.longitude = result.longitude;
    ElMessage.success('已定位');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '定位失败');
  } finally {
    geocoding.value = false;
  }
}



function scrollToSection(sectionKey: string) {
  document.getElementById(`house-form-${sectionKey}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  emit('submit', { ...form });
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="house ? '房源详情' : '新增房源'"
    width="760px"
    class="house-form-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-scrollbar class="house-form-scrollbar">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <nav class="house-form-nav" aria-label="房源详情分区导航">
          <button
            v-for="section in formSections"
            :key="section.key"
            type="button"
            @click="scrollToSection(section.key)"
          >
            {{ section.label }}
          </button>
        </nav>

        <div class="house-form-sections">
          <section id="house-form-basic" class="house-form-section">
            <h3>基础信息</h3>
            <div class="form-grid">
              <el-form-item label="名称" prop="name">
                <el-input v-model="form.name" placeholder="" />
              </el-form-item>
              <el-form-item label="状态" prop="status">
                <el-select v-model="form.status" placeholder="">
                  <el-option v-for="status in houseStatuses" :key="status" :label="statusLabels[status]" :value="status" />
                </el-select>
              </el-form-item>
              <el-form-item label="房">
                <el-input-number v-model="form.bedroomCount" :min="0" :step="1" controls-position="right" />
              </el-form-item>
              <el-form-item label="厅">
                <el-input-number v-model="form.livingRoomCount" :min="0" :step="1" controls-position="right" />
              </el-form-item>
              <el-form-item label="卫">
                <el-input-number v-model="form.bathroomCount" :min="0" :step="1" controls-position="right" />
              </el-form-item>
              <el-form-item label="渠道">
                <el-select v-model="form.sourceChannel" clearable placeholder="">
                  <el-option
                    v-for="channel in houseSourceChannels"
                    :key="channel"
                    :label="houseSourceChannelLabels[channel]"
                    :value="channel"
                  />
                </el-select>
              </el-form-item>
            </div>
          </section>

          <section id="house-form-location" class="house-form-section">
            <h3>地理位置</h3>
            <div class="form-grid">
              <el-form-item label="地址" prop="address" class="span-2">
                <div class="address-row">
                  <el-input v-model="form.address" placeholder="" />
                  <el-button :icon="Aim" :loading="geocoding" @click="geocode">定位</el-button>
                </div>
              </el-form-item>
              <el-form-item label="定位" class="span-2">
                <div class="coordinate-map-field">
                  <CoordinatePicker
                    v-if="modelValue"
                    v-model:longitude="form.longitude"
                    v-model:latitude="form.latitude"
                  />
                </div>
              </el-form-item>
            </div>
          </section>

          <section id="house-form-fees" class="house-form-section">
            <h3>租金费用</h3>
            <div class="form-grid">
              <el-form-item label="租金" prop="rentPrice">
                <el-input-number v-model="form.rentPrice" :min="0" :step="500" controls-position="right" />
              </el-form-item>
              <el-form-item label="交租周期">
                <el-select v-model="form.rentPaymentPeriods" multiple collapse-tags collapse-tags-tooltip placeholder="">
                  <el-option
                    v-for="period in rentPaymentPeriods"
                    :key="period"
                    :label="rentPaymentPeriodLabels[period]"
                    :value="period"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="物业费">
                <el-input-number v-model="form.propertyFee" :min="0" :step="100" controls-position="right" />
              </el-form-item>
              <el-form-item label="水费/吨">
                <el-input-number v-model="form.waterFeePerTon" :min="0" :precision="2" :step="0.5" controls-position="right" />
              </el-form-item>
              <el-form-item label="电费/度">
                <el-input-number
                  v-model="form.electricityFeePerKwh"
                  :min="0"
                  :precision="2"
                  :step="0.1"
                  controls-position="right"
                />
              </el-form-item>
              <el-form-item label="其他费用">
                <el-input-number v-model="form.otherFee" :min="0" :step="50" controls-position="right" />
              </el-form-item>
            </div>
          </section>

          <section id="house-form-contact" class="house-form-section">
            <h3>联系方式</h3>
            <div class="form-grid">
              <el-form-item label="电话">
                <el-input v-model="form.phone" placeholder="" />
              </el-form-item>
              <el-form-item label="微信">
                <el-input v-model="form.wechat" placeholder="" />
              </el-form-item>
              <el-form-item label="备注" class="span-2">
                <el-input v-model="form.contactNotes" type="textarea" :rows="3" placeholder="" />
              </el-form-item>
            </div>
          </section>
        </div>
      </el-form>
    </el-scrollbar>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
    </template>
  </el-dialog>
</template>
