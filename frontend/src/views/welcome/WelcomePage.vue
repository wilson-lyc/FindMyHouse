<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Aim } from '@element-plus/icons-vue';
import { fetchConfig, saveConfig, type ConfigData } from '../../api/config/config-api';
import { geocodeAddress } from '../../api/map/map-api';
import { createLocation } from '../../api/location/location-api';
import { locationCategories, locationCategoryLabels, type LocationForm } from '../../model/location/location';
import type { FormInstance, FormRules } from 'element-plus';
import CoordinatePicker from '../../components/map/CoordinatePicker.vue';

const router = useRouter();

const activeStep = ref(0);
const loading = ref(true);
const saving = ref(false);
const geocoding = ref(false);

const configFormRef = ref<FormInstance>();
const locationFormRef = ref<FormInstance>();

const configData = reactive<ConfigData>({
  openaiBaseUrl: 'https://api.deepseek.com',
  openaiApiKey: '',
  openaiModel: 'deepseek-v4-flash',
  openaiTemperature: 0,
  amapWebServiceKey: '',
  viteAmapJsKey: '',
  viteAmapSecurityJsCode: '',
});

const configRules: FormRules<ConfigData> = {
  openaiBaseUrl: [{ required: true, message: '请输入 LLM Base URL', trigger: 'blur' }],
  openaiApiKey: [{ required: true, message: '请输入 LLM API Key', trigger: 'blur' }],
  openaiModel: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  amapWebServiceKey: [{ required: true, message: '请输入高德 Web Service Key', trigger: 'blur' }],
  viteAmapJsKey: [{ required: true, message: '请输入高德 JS API Key', trigger: 'blur' }],
  viteAmapSecurityJsCode: [{ required: true, message: '请输入高德 Security JS Code', trigger: 'blur' }],
};

const locationForm = reactive<LocationForm>({
  name: '',
  category: 'work',
  address: '',
  latitude: undefined,
  longitude: undefined,
  isFocus: true,
  notes: ''
});

const locationRules: FormRules<LocationForm> = {
  name: [{ required: true, message: '请输入地点名称', trigger: 'blur' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }]
};

async function loadConfig() {
  try {
    const data = await fetchConfig();
    if (data.openaiBaseUrl) configData.openaiBaseUrl = data.openaiBaseUrl;
    if (data.openaiApiKey) configData.openaiApiKey = data.openaiApiKey;
    if (data.openaiModel) configData.openaiModel = data.openaiModel;
    if (data.openaiTemperature !== undefined) configData.openaiTemperature = data.openaiTemperature;
    if (data.amapWebServiceKey) configData.amapWebServiceKey = data.amapWebServiceKey;
    if (data.viteAmapJsKey) configData.viteAmapJsKey = data.viteAmapJsKey;
    if (data.viteAmapSecurityJsCode) configData.viteAmapSecurityJsCode = data.viteAmapSecurityJsCode;

    if (configData.openaiBaseUrl && configData.openaiApiKey && configData.openaiModel && configData.amapWebServiceKey && configData.viteAmapJsKey && configData.viteAmapSecurityJsCode) {
      activeStep.value = 1;
    }
  } catch {
    // 初次使用，无配置，使用默认值
  } finally {
    loading.value = false;
  }
}

async function saveAndNext() {
  const valid = await configFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    await saveConfig({
      openaiBaseUrl: configData.openaiBaseUrl.trim(),
      openaiApiKey: configData.openaiApiKey.trim(),
      openaiModel: configData.openaiModel.trim(),
      openaiTemperature: configData.openaiTemperature,
      amapWebServiceKey: configData.amapWebServiceKey.trim(),
      viteAmapJsKey: configData.viteAmapJsKey.trim(),
      viteAmapSecurityJsCode: configData.viteAmapSecurityJsCode?.trim() || '',
    });
    ElMessage.success('配置已保存');
    activeStep.value = 1;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存配置失败');
  } finally {
    saving.value = false;
  }
}

async function geocode() {
  if (!locationForm.address.trim()) {
    ElMessage.warning('请先输入地址');
    return;
  }

  geocoding.value = true;
  try {
    const result = await geocodeAddress(locationForm.address);
    locationForm.address = result.formattedAddress || locationForm.address;
    locationForm.latitude = result.latitude;
    locationForm.longitude = result.longitude;
    ElMessage.success('已定位');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '定位失败');
  } finally {
    geocoding.value = false;
  }
}

async function submitForm() {
  const valid = await locationFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    await createLocation({
      ...locationForm,
      name: locationForm.name.trim(),
      address: locationForm.address.trim(),
      latitude: locationForm.latitude ?? undefined,
      longitude: locationForm.longitude ?? undefined,
      isFocus: true,
      notes: locationForm.notes?.trim() || undefined
    });
    ElMessage.success('地点已创建，系统已就绪！');
    router.push('/');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '创建地点失败');
  } finally {
    saving.value = false;
  }
}

onMounted(loadConfig);
</script>

<template>
  <div class="welcome-page">
    <el-card class="welcome-card" shadow="never">
      <template #header>
        <div class="welcome-header">
          <h1>欢迎使用 FindMyHouse</h1>
        </div>
      </template>

      <div class="steps-wrap">
        <el-steps :active="activeStep" align-center>
          <el-step title="服务配置" />
          <el-step title="焦点地点" />
        </el-steps>
      </div>

      <div v-loading="loading" class="step-content">
        <!-- Step 0: Service Configuration -->
        <template v-if="activeStep === 0">
          <el-alert
            title="请配置 LLM 和高德地图服务，用于 AI 对话和地图功能"
            type="info"
            :closable="false"
            show-icon
            class="step-alert"
          />

          <el-form ref="configFormRef" :model="configData" :rules="configRules" label-width="180px" class="welcome-form">
            <el-form-item label="LLM Base URL" prop="openaiBaseUrl">
              <el-input v-model="configData.openaiBaseUrl" placeholder="仅支持 OpenAI 兼容协议" />
            </el-form-item>
            <el-form-item label="LLM API Key" prop="openaiApiKey">
              <el-input v-model="configData.openaiApiKey" type="password" show-password placeholder="输入 API Key" />
            </el-form-item>
            <el-form-item label="模型名称" prop="openaiModel">
              <el-input v-model="configData.openaiModel" placeholder="例如 deepseek-v4-flash 或 deepseek-v4-pro" />
            </el-form-item>
            <el-form-item label="温度" prop="openaiTemperature">
              <el-slider v-model="configData.openaiTemperature" :min="0" :max="2" :step="0.1" show-input />
            </el-form-item>
            <el-form-item label="高德 Web Service Key" prop="amapWebServiceKey">
              <el-input v-model="configData.amapWebServiceKey" type="password" show-password placeholder="输入高德 Web Service Key" />
            </el-form-item>
            <el-form-item label="高德 JS API Key" prop="viteAmapJsKey">
              <el-input v-model="configData.viteAmapJsKey" type="password" show-password placeholder="输入高德 JS API Key" />
            </el-form-item>
            <el-form-item label="高德 Security JS Code" prop="viteAmapSecurityJsCode">
              <el-input v-model="configData.viteAmapSecurityJsCode" type="password" show-password placeholder="输入高德 Security JS Code" />
            </el-form-item>
          </el-form>
        </template>

        <!-- Step 1: Focus Location -->
        <template v-if="activeStep === 1">
          <el-alert
            title="请创建焦点地点（例如公司或学校）作为通勤路线的终点"
            type="info"
            :closable="false"
            show-icon
            class="step-alert"
          />

          <el-form ref="locationFormRef" :model="locationForm" :rules="locationRules" label-width="70px" class="welcome-form">
            <el-form-item label="名称" prop="name">
              <el-input v-model="locationForm.name" placeholder="例如：公司" />
            </el-form-item>
            <el-form-item label="类型" prop="category">
              <el-select v-model="locationForm.category">
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
                <el-input v-model="locationForm.address" placeholder="输入焦点地点地址" />
                <el-button :icon="Aim" :loading="geocoding" @click="geocode">定位</el-button>
              </div>
            </el-form-item>
            <el-form-item label="定位">
              <div class="coordinate-map-field">
                <CoordinatePicker
                  v-model:longitude="locationForm.longitude"
                  v-model:latitude="locationForm.latitude"
                  marker-label="焦点"
                  marker-class="location"
                  marker-title="焦点地点坐标"
                />
              </div>
            </el-form-item>
          </el-form>
        </template>
      </div>

      <template #footer>
        <div class="welcome-footer">
          <el-button v-if="activeStep === 1" @click="activeStep = 0">上一步</el-button>
          <el-button
            v-if="activeStep === 0"
            type="primary"
            :loading="saving"
            @click="saveAndNext"
          >
            下一步
          </el-button>
          <el-button
            v-if="activeStep === 1"
            type="primary"
            :loading="saving"
            @click="submitForm"
          >
            创建并开始使用
          </el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped>
.welcome-page {
  display: flex;
  min-height: 100dvh;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--el-bg-color-page);
}

.welcome-card {
  width: min(100%, 800px);
}

.welcome-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.steps-wrap {
  margin-bottom: 24px;
}

.step-content {
  min-height: 280px;
}

.step-alert {
  margin-bottom: 18px;
}

.welcome-form {
  margin: 0;
}

.welcome-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
