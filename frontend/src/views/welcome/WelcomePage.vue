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
  openaiTemperature: 0.7,
  amapWebServiceKey: '',
  viteAmapJsKey: '',
  viteAmapSecurityJsCode: '',
});

function requiredTextRule(message: string) {
  return {
    required: true,
    validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
      if (value?.trim()) {
        callback();
        return;
      }

      callback(new Error(message));
    },
    trigger: 'blur'
  };
}

function hasCompleteConfig() {
  return Boolean(
    configData.openaiBaseUrl.trim() &&
    configData.openaiApiKey.trim() &&
    configData.openaiModel.trim() &&
    configData.openaiTemperature !== undefined &&
    configData.amapWebServiceKey.trim() &&
    configData.viteAmapJsKey.trim() &&
    configData.viteAmapSecurityJsCode.trim()
  );
}

const configRules: FormRules<ConfigData> = {
  openaiBaseUrl: [requiredTextRule('请输入 LLM Base URL')],
  openaiApiKey: [requiredTextRule('请输入 LLM API Key')],
  openaiModel: [requiredTextRule('请输入模型名称')],
  openaiTemperature: [{ required: true, message: '请选择温度', trigger: 'change' }],
  amapWebServiceKey: [requiredTextRule('请输入高德 Web Service Key')],
  viteAmapJsKey: [requiredTextRule('请输入高德 JS API Key')],
  viteAmapSecurityJsCode: [requiredTextRule('请输入高德 Security JS Code')],
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

    if (hasCompleteConfig()) {
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
      viteAmapSecurityJsCode: configData.viteAmapSecurityJsCode.trim(),
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
  <el-container class="welcome-page" direction="vertical">
    <el-header class="welcome-header">
      <div class="welcome-title-row">
        <h1>欢迎使用 FindMyHouse</h1>
      </div>
    </el-header>

    <el-main class="welcome-main">
      <el-scrollbar class="welcome-scrollbar">
        <section v-loading="loading" class="welcome-content">
          <div class="welcome-step-shell">
            <el-steps :active="activeStep" align-center>
              <el-step title="服务配置" />
              <el-step title="焦点地点" />
            </el-steps>
          </div>

          <el-form
            v-if="activeStep === 0"
            ref="configFormRef"
            :model="configData"
            :rules="configRules"
            label-position="top"
            class="welcome-form"
          >
            <section class="welcome-section">
              <div class="welcome-section-heading">
                <h2>模型服务</h2>
              </div>

              <el-alert title="仅支持 OpenAI 协议" type="info" :closable="false" show-icon />

              <div class="welcome-grid">
                <el-form-item label="Base URL" prop="openaiBaseUrl">
                  <el-input v-model="configData.openaiBaseUrl" placeholder="https://api.deepseek.com" />
                </el-form-item>
                <el-form-item label="模型名称" prop="openaiModel">
                  <el-input v-model="configData.openaiModel" placeholder="deepseek-v4-flash" />
                </el-form-item>
                <el-form-item class="welcome-grid-wide" label="API Key" prop="openaiApiKey">
                  <el-input v-model="configData.openaiApiKey" type="password" show-password placeholder="输入 LLM API Key" />
                </el-form-item>
                <el-form-item class="welcome-grid-wide" label="温度" prop="openaiTemperature">
                  <el-input-number
                    v-model="configData.openaiTemperature"
                    :min="0"
                    :max="2"
                    :step="0.1"
                    :precision="1"
                  />
                </el-form-item>
              </div>
            </section>

            <section class="welcome-section">
              <div class="welcome-section-heading">
                <h2>高德地图</h2>
              </div>

              <div class="welcome-grid">
                <el-form-item label="Web Service Key" prop="amapWebServiceKey">
                  <el-input
                    v-model="configData.amapWebServiceKey"
                    type="password"
                    show-password
                    placeholder="输入高德 Web Service Key"
                  />
                </el-form-item>
                <el-form-item label="JS API Key" prop="viteAmapJsKey">
                  <el-input v-model="configData.viteAmapJsKey" type="password" show-password placeholder="输入高德 JS API Key" />
                </el-form-item>
                <el-form-item class="welcome-grid-wide" label="Security JS Code" prop="viteAmapSecurityJsCode">
                  <el-input
                    v-model="configData.viteAmapSecurityJsCode"
                    type="password"
                    show-password
                    placeholder="输入高德 Security JS Code"
                  />
                </el-form-item>
              </div>
            </section>

            <footer class="welcome-actions">
              <el-button type="primary" :loading="saving" @click="saveAndNext">下一步</el-button>
            </footer>
          </el-form>

          <el-form
            v-if="activeStep === 1"
            ref="locationFormRef"
            :model="locationForm"
            :rules="locationRules"
            label-position="top"
            class="welcome-form"
          >
            <section class="welcome-section">
              <div class="welcome-section-heading">
                <h2>焦点地点</h2>
              </div>

              <el-alert title="创建公司、学校等焦点地点，作为通勤路线的终点" type="info" :closable="false" show-icon />

              <div class="welcome-grid">
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
                <el-form-item class="welcome-grid-wide" label="地址" prop="address">
                  <div class="address-row">
                    <el-input v-model="locationForm.address" placeholder="输入焦点地点地址" />
                    <el-button class="welcome-action-button" :icon="Aim" :loading="geocoding" @click="geocode">定位</el-button>
                  </div>
                </el-form-item>
                <el-form-item class="welcome-grid-wide" label="定位">
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
              </div>
            </section>

            <footer class="welcome-actions">
              <el-button :disabled="saving" @click="activeStep = 0">上一步</el-button>
              <el-button type="primary" :loading="saving" @click="submitForm">
                创建并开始使用
              </el-button>
            </footer>
          </el-form>
        </section>
      </el-scrollbar>
    </el-main>
  </el-container>
</template>

<style scoped>
.welcome-page {
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  background: #f3f6f8;
  color: #17202a;
}

.welcome-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  height: auto;
  padding: 12px 24px;
  border-bottom: 1px solid #e2e9ee;
  background: #ffffff;
}

.welcome-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.welcome-header h1,
.welcome-section-heading h2 {
  margin: 0;
  font-weight: 700;
}

.welcome-header h1 {
  font-size: 20px;
}

.welcome-main {
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.welcome-scrollbar {
  height: 100%;
}

.welcome-content {
  width: min(100%, 980px);
  margin: 0 auto;
  padding: 24px;
}

.welcome-step-shell {
  display: grid;
  gap: 18px;
  border: 1px solid #e2e9ee;
  border-radius: 8px;
  background: #ffffff;
  padding: 20px;
  margin-bottom: 16px;
}

.welcome-form {
  display: grid;
  gap: 16px;
}

.welcome-section {
  display: grid;
  gap: 18px;
  border: 1px solid #e2e9ee;
  border-radius: 8px;
  background: #ffffff;
  padding: 20px;
}

.welcome-section-heading {
  border-bottom: 1px solid #edf1f4;
  padding-bottom: 14px;
}

.welcome-section-heading h2 {
  font-size: 17px;
}

.welcome-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 16px;
}

.welcome-grid-wide {
  grid-column: 1 / -1;
}

.welcome-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 4px 0;
}

.welcome-action-button {
  height: 32px;
  min-width: 96px;
  border-radius: 6px;
  font-weight: 600;
}

.welcome-action-button :deep(.el-icon) {
  font-size: 16px;
}

@media (max-width: 720px) {
  .welcome-header {
    padding: 10px 16px;
  }

  .welcome-content {
    padding: 14px;
  }

  .welcome-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
