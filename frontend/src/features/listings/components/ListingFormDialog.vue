<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Aim } from '@element-plus/icons-vue';
import { geocodeAddress } from '../../maps/api/maps-api';
import CoordinatePickerMap from '../../maps/components/CoordinatePickerMap.vue';
import { listingStatuses, type Listing, type ListingForm } from '../model/listing';
import { statusLabels } from '../model/listing-status';
import { createEmptyListingForm, listingToForm } from '../lib/listing-form';

const props = defineProps<{
  modelValue: boolean;
  listing: Listing | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  submit: [form: ListingForm];
}>();

const formRef = ref<FormInstance>();
const geocoding = ref(false);
const form = reactive<ListingForm>(createEmptyListingForm());

const rules: FormRules<ListingForm> = {
  title: [{ required: true, message: '请输入房源标题', trigger: 'blur' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }],
  rentPrice: [{ required: true, type: 'number', min: 0, message: '请输入有效月租金', trigger: 'blur' }]
};

watch(
  () => [props.modelValue, props.listing] as const,
  ([visible, listing]) => {
    if (!visible) return;
    Object.assign(form, listing ? listingToForm(listing) : createEmptyListingForm());
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
    ElMessage.success('已定位到高德坐标');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '定位失败');
  } finally {
    geocoding.value = false;
  }
}

function applyPickedCoordinate(coordinate: { longitude: number; latitude: number }) {
  form.longitude = coordinate.longitude;
  form.latitude = coordinate.latitude;
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
    :title="listing ? '编辑房源' : '新增房源'"
    width="760px"
    class="listing-form-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-scrollbar class="listing-form-scrollbar">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <div class="form-grid">
          <el-form-item label="标题" prop="title">
            <el-input v-model="form.title" placeholder="例如：科技园两房一厅" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="form.status">
              <el-option v-for="status in listingStatuses" :key="status" :label="statusLabels[status]" :value="status" />
            </el-select>
          </el-form-item>
          <el-form-item label="地址" prop="address" class="span-2">
            <div class="address-row">
              <el-input v-model="form.address" placeholder="输入房源地址" />
              <el-button :icon="Aim" :loading="geocoding" @click="geocode">定位</el-button>
            </div>
          </el-form-item>
          <el-form-item label="地图定位" class="span-2">
            <div class="coordinate-map-field">
              <CoordinatePickerMap
                v-if="modelValue"
                :active="modelValue"
                :longitude="form.longitude"
                :latitude="form.latitude"
                @change="applyPickedCoordinate"
              />
            </div>
          </el-form-item>
          <el-form-item label="月租" prop="rentPrice">
            <el-input-number v-model="form.rentPrice" :min="0" :step="500" controls-position="right" />
          </el-form-item>
          <el-form-item label="面积">
            <el-input-number v-model="form.areaSqm" :min="0" :precision="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="户型">
            <el-input v-model="form.layout" placeholder="两房一厅" />
          </el-form-item>
          <el-form-item label="楼层">
            <el-input v-model="form.floor" placeholder="8/18" />
          </el-form-item>
          <el-form-item label="押金">
            <el-input-number v-model="form.depositAmount" :min="0" :step="500" controls-position="right" />
          </el-form-item>
          <el-form-item label="中介费">
            <el-input-number v-model="form.agencyFee" :min="0" :step="500" controls-position="right" />
          </el-form-item>
          <el-form-item label="朝向">
            <el-input v-model="form.orientation" placeholder="南向" />
          </el-form-item>
          <el-form-item label="入住日期">
            <el-date-picker v-model="form.availableDate" value-format="YYYY-MM-DD" type="date" placeholder="选择日期" />
          </el-form-item>
          <el-form-item label="来源">
            <el-input v-model="form.source" placeholder="平台或中介" />
          </el-form-item>
          <el-form-item label="链接">
            <el-input v-model="form.sourceUrl" placeholder="原始房源链接" />
          </el-form-item>
          <el-form-item label="备注" class="span-2">
            <el-input v-model="form.notes" type="textarea" :rows="4" placeholder="记录亮点、风险点或沟通信息" />
          </el-form-item>
        </div>
      </el-form>
    </el-scrollbar>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
    </template>
  </el-dialog>
</template>
