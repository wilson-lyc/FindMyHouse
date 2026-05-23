<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Aim, Delete as DeleteIcon, Edit as EditIcon, LocationFilled, Plus } from '@element-plus/icons-vue';
import { geocodeAddress, reverseGeocodeCoordinates } from '../../api/map/map-api';
import CoordinatePicker from '../map/CoordinatePicker.vue';
import {
  houseSourceChannelLabels,
  houseSourceChannels,
  houseStatuses,
  rentPaymentPeriodLabels,
  rentPaymentPeriods,
  type CustomFeeItem,
  type House,
  type HouseForm
} from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import { createEmptyHouseForm, houseToForm } from '../../lib/house/house-form';
import { formatCurrency } from '../../lib/format';
import CustomFeeDialog from './CustomFeeDialog.vue';

const props = defineProps<{
  modelValue: boolean;
  house: House | null;
  initialForm?: HouseForm | null;
  saving: boolean;
  title?: string;
  cancelText?: string;
  submitText?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  submit: [form: HouseForm];
}>();

const formRef = ref<FormInstance>();
const scrollbarRef = ref();
const addressGeocoding = ref(false);
const coordinateGeocoding = ref(false);
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
  () => [props.modelValue, props.house, props.initialForm] as const,
  ([visible, house, initialForm]) => {
    if (!visible) return;
    Object.assign(form, house ? houseToForm(house) : { ...createEmptyHouseForm(), ...(initialForm ?? {}) });
    formRef.value?.clearValidate();
    nextTick(() => {
      scrollbarRef.value?.wrapRef?.scrollTo(0, 0);
    });
  },
  { immediate: true }
);

async function convertAddressToCoordinates() {
  if (!form.address.trim()) {
    ElMessage.warning('请先输入地址');
    return;
  }

  addressGeocoding.value = true;
  try {
    const result = await geocodeAddress(form.address);
    form.address = result.formattedAddress || form.address;
    form.latitude = result.latitude;
    form.longitude = result.longitude;
    ElMessage.success('已将地址转为坐标');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '地址转坐标失败');
  } finally {
    addressGeocoding.value = false;
  }
}

async function convertCoordinatesToAddress() {
  if (form.longitude === undefined || form.latitude === undefined) {
    ElMessage.warning('请先选择或输入坐标');
    return;
  }

  coordinateGeocoding.value = true;
  try {
    const result = await reverseGeocodeCoordinates(form.longitude, form.latitude);
    form.address = result.formattedAddress || form.address;
    form.latitude = result.latitude;
    form.longitude = result.longitude;
    ElMessage.success('已将坐标转为地址');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '坐标转地址失败');
  } finally {
    coordinateGeocoding.value = false;
  }
}



const feeItemDialogVisible = ref(false);
const feeItemDialogItem = ref<CustomFeeItem | null>(null);
const feeEditingIndex = ref(-1);
const customFeesTotal = computed(() =>
  (form.customFees ?? []).reduce((total, item) => total + (Number(item.amount) || 0), 0)
);

function scrollToSection(sectionKey: string) {
  document.getElementById(`house-form-${sectionKey}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

function openAddFeeDialog() {
  feeItemDialogItem.value = null;
  feeEditingIndex.value = -1;
  feeItemDialogVisible.value = true;
}

function openEditFeeDialog(item: CustomFeeItem, index: number) {
  feeItemDialogItem.value = { ...item };
  feeEditingIndex.value = index;
  feeItemDialogVisible.value = true;
}

function deleteFeeItem(index: number) {
  form.customFees?.splice(index, 1);
}

function onFeeItemSave(item: CustomFeeItem) {
  if (feeEditingIndex.value >= 0) {
    form.customFees![feeEditingIndex.value] = item;
  } else {
    (form.customFees ??= []).push(item);
  }
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
    :title="title ?? (house ? '房源详情' : '新增房源')"
    width="760px"
    class="house-form-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-scrollbar ref="scrollbarRef" class="house-form-scrollbar">
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
              <el-form-item label="状态" prop="status" required>
                <el-select v-model="form.status" placeholder="">
                  <el-option v-for="status in houseStatuses" :key="status" :label="statusLabels[status]" :value="status" />
                </el-select>
              </el-form-item>
              <el-form-item label="房型" class="span-2" required>
                <div class="room-count-row">
                  <label class="room-count-control">
                    <el-input-number v-model="form.bedroomCount" :min="0" :step="1" controls-position="right" />
                    <span>房</span>
                  </label>
                  <label class="room-count-control">
                    <el-input-number v-model="form.livingRoomCount" :min="0" :step="1" controls-position="right" />
                    <span>厅</span>
                  </label>
                  <label class="room-count-control">
                    <el-input-number v-model="form.bathroomCount" :min="0" :step="1" controls-position="right" />
                    <span>卫</span>
                  </label>
                </div>
              </el-form-item>
            </div>
          </section>

          <section id="house-form-location" class="house-form-section">
            <h3>地理位置</h3>
            <div class="form-grid">
              <el-form-item label="地址" prop="address" class="span-2">
                <div class="address-row geocode-address-row">
                  <el-input v-model="form.address" placeholder="" />
                  <div class="geocode-button-group">
                    <el-button :icon="Aim" :loading="addressGeocoding" @click="convertAddressToCoordinates">
                      地址转坐标
                    </el-button>
                    <el-button
                      :icon="LocationFilled"
                      :loading="coordinateGeocoding"
                      @click="convertCoordinatesToAddress"
                    >
                      坐标转地址
                    </el-button>
                  </div>
                </div>
              </el-form-item>
              <el-form-item label="定位" class="span-2" required>
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
              <el-form-item label="定金">
                <el-input-number v-model="form.earnestMoney" :min="0" :step="500" controls-position="right" />
              </el-form-item>
              <el-form-item label="押金">
                <el-input-number v-model="form.deposit" :min="0" :step="500" controls-position="right" />
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
              <el-form-item label="物业费">
                <el-input-number v-model="form.propertyFee" :min="0" :step="100" controls-position="right" />
              </el-form-item>
              <el-form-item label="自定义费用" class="span-2 custom-fees-form-item">
                <div class="custom-fees-wrap">
                  <div class="custom-fees-header">
                    <div class="custom-fees-summary">
                      <span class="custom-fees-count">共 {{ form.customFees?.length ?? 0 }} 项，合计 {{ formatCurrency(customFeesTotal) }}</span>
                    </div>
                    <el-button :icon="Plus" type="primary" plain size="small" @click="openAddFeeDialog">添加费用</el-button>
                  </div>
                  <el-table
                    :data="form.customFees ?? []"
                    stripe
                    size="small"
                    max-height="240"
                    class="custom-fees-table"
                    empty-text="暂无自定义费用"
                  >
                    <el-table-column label="费用项目" prop="name" show-overflow-tooltip />
                    <el-table-column label="金额" width="120">
                      <template #default="{ row }">
                        <span>{{ formatCurrency(row.amount) }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="132">
                      <template #default="{ row, $index }">
                        <el-button :icon="EditIcon" link type="primary" size="small" @click="openEditFeeDialog(row, $index)">编辑</el-button>
                        <el-button :icon="DeleteIcon" link type="danger" size="small" @click="deleteFeeItem($index)">删除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-form-item>
              <el-form-item label="费用备注" class="span-2">
                <el-input v-model="form.feeNotes" type="textarea" :rows="3" placeholder="" />
              </el-form-item>
              <CustomFeeDialog v-model="feeItemDialogVisible" :item="feeItemDialogItem" @save="onFeeItemSave" />
            </div>
          </section>

          <section id="house-form-contact" class="house-form-section">
            <h3>联系方式</h3>
            <div class="form-grid">
              <el-form-item label="联系人">
                <el-input v-model="form.contactName" placeholder="" />
              </el-form-item>
              <el-form-item label="电话">
                <el-input v-model="form.phone" placeholder="" />
              </el-form-item>
              <el-form-item label="微信">
                <el-input v-model="form.wechat" placeholder="" />
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
              <el-form-item label="联系备注" class="span-2">
                <el-input v-model="form.contactNotes" type="textarea" :rows="3" placeholder="" />
              </el-form-item>
            </div>
          </section>
        </div>
      </el-form>
    </el-scrollbar>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ cancelText ?? '取消' }}</el-button>
      <el-button type="primary" :loading="saving" @click="submitForm">{{ submitText ?? '保存' }}</el-button>
    </template>
  </el-dialog>
</template>
