<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Aim } from '@element-plus/icons-vue';
import { geocodeAddress } from '../../api/map/map-api';
import { createEmptyLocationForm, locationToForm } from '../../lib/location/location-form';
import { locationCategories, locationCategoryLabels, type Location, type LocationForm } from '../../model/location/location';
import CoordinatePickerMap from '../map/CoordinatePickerMap.vue';

const props = defineProps<{
  modelValue: boolean;
  location: Location | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  submit: [form: LocationForm];
}>();

const formRef = ref<FormInstance>();
const geocoding = ref(false);
const form = reactive<LocationForm>(createEmptyLocationForm());

const rules: FormRules<LocationForm> = {
  name: [{ required: true, message: '请输入地点名称', trigger: 'blur' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }]
};

watch(
  () => [props.modelValue, props.location] as const,
  ([visible, location]) => {
    if (!visible) return;
    Object.assign(form, location ? locationToForm(location) : createEmptyLocationForm());
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
    :title="location ? '编辑地点' : '新增地点'"
    width="760px"
    class="house-form-dialog location-form-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-scrollbar class="house-form-scrollbar location-form-scrollbar">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：公司" />
        </el-form-item>
        <el-form-item label="类型" prop="category">
          <el-select v-model="form.category">
            <el-option v-for="category in locationCategories" :key="category" :label="locationCategoryLabels[category]" :value="category" />
          </el-select>
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <div class="address-row">
            <el-input v-model="form.address" placeholder="输入关键地点地址" />
            <el-button :icon="Aim" :loading="geocoding" @click="geocode">定位</el-button>
          </div>
        </el-form-item>
        <el-form-item label="定位">
          <div class="coordinate-map-field">
            <CoordinatePickerMap
              v-if="modelValue"
              :active="modelValue"
              :longitude="form.longitude"
              :latitude="form.latitude"
              marker-label="地点"
              marker-class="location"
              marker-title="地点坐标"
              @change="applyPickedCoordinate"
            />
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="3" placeholder="例如：通勤终点或常去地点" />
        </el-form-item>
      </el-form>
    </el-scrollbar>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
    </template>
  </el-dialog>
</template>
