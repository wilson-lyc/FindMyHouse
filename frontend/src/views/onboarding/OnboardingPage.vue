<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Aim } from '@element-plus/icons-vue';
import { geocodeAddress } from '../../api/map/map-api';
import { createLocation } from '../../api/location/location-api';
import { locationCategories, locationCategoryLabels, type LocationForm } from '../../model/location/location';
import type { FormInstance, FormRules } from 'element-plus';
import CoordinatePicker from '../../components/map/CoordinatePicker.vue';

const router = useRouter();

const formRef = ref<FormInstance>();
const geocoding = ref(false);
const saving = ref(false);

const form = reactive<LocationForm>({
  name: '',
  category: 'work',
  address: '',
  latitude: undefined,
  longitude: undefined,
  isFocus: true,
  notes: ''
});

const rules: FormRules<LocationForm> = {
  name: [{ required: true, message: '请输入地点名称', trigger: 'blur' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }]
};

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

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    await createLocation({
      ...form,
      name: form.name.trim(),
      address: form.address.trim(),
      latitude: form.latitude ?? undefined,
      longitude: form.longitude ?? undefined,
      isFocus: true,
      notes: form.notes?.trim() || undefined
    });
    ElMessage.success('地点已创建，系统已就绪！');
    router.push('/');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '创建地点失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="onboarding-page">
    <el-card class="onboarding-card" shadow="never">
      <template #header>
        <div class="onboarding-header">
          <h1>欢迎使用 FindMyHouse</h1>
        </div>
      </template>

      <el-alert
        title="请创建焦点地点（例如公司或学校）作为通勤路线的终点"
        type="info"
        :closable="false"
        show-icon
        class="onboarding-alert"
      />

      <el-form ref="formRef" :model="form" :rules="rules" label-width="70px" class="onboarding-form">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：公司" />
        </el-form-item>
        <el-form-item label="类型" prop="category">
          <el-select v-model="form.category">
            <el-option
              v-for="category in locationCategories"
              :key="category"
              :label="locationCategoryLabels[category]"
              :value="category"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <div class="address-row">
            <el-input v-model="form.address" placeholder="输入焦点地点地址" />
            <el-button :icon="Aim" :loading="geocoding" @click="geocode">定位</el-button>
          </div>
        </el-form-item>
        <el-form-item label="定位">
          <div class="coordinate-map-field">
            <CoordinatePicker
              v-model:longitude="form.longitude"
              v-model:latitude="form.latitude"
              marker-label="焦点"
              marker-class="location"
              marker-title="焦点地点坐标"
            />
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="onboarding-footer">
          <el-button type="primary" :loading="saving" @click="submitForm">创建并开始使用</el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped>
.onboarding-page {
  display: flex;
  min-height: 100dvh;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--el-bg-color-page);
}

.onboarding-card {
  width: min(100%, 640px);
}

.onboarding-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.onboarding-alert {
  margin-bottom: 18px;
}

.onboarding-form {
  margin: 0;
}

.onboarding-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
