<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { fetchConfig, saveConfig, type ConfigData } from '../../api/config/config-api';
import type { FormInstance, FormRules } from 'element-plus';

const router = useRouter();

const formRef = ref<FormInstance>();
const loading = ref(true);
const saving = ref(false);

const defaultConfig: ConfigData = {
  openaiBaseUrl: 'https://api.deepseek.com',
  openaiApiKey: '',
  openaiModel: 'deepseek-v4-flash',
  openaiTemperature: 0.7,
  amapWebServiceKey: '',
  viteAmapJsKey: '',
  viteAmapSecurityJsCode: ''
};

const form = reactive<ConfigData>({ ...defaultConfig });

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

const rules: FormRules<ConfigData> = {
  openaiBaseUrl: [requiredTextRule('请输入 LLM Base URL')],
  openaiApiKey: [requiredTextRule('请输入 LLM API Key')],
  openaiModel: [requiredTextRule('请输入模型名称')],
  openaiTemperature: [{ required: true, message: '请选择温度', trigger: 'change' }],
  amapWebServiceKey: [requiredTextRule('请输入高德 Web Service Key')],
  viteAmapJsKey: [requiredTextRule('请输入高德 JS API Key')],
  viteAmapSecurityJsCode: [requiredTextRule('请输入高德 Security JS Code')]
};

function applyConfig(data: Partial<ConfigData>) {
  form.openaiBaseUrl = data.openaiBaseUrl || defaultConfig.openaiBaseUrl;
  form.openaiApiKey = data.openaiApiKey || defaultConfig.openaiApiKey;
  form.openaiModel = data.openaiModel || defaultConfig.openaiModel;
  form.openaiTemperature = data.openaiTemperature ?? defaultConfig.openaiTemperature;
  form.amapWebServiceKey = data.amapWebServiceKey || defaultConfig.amapWebServiceKey;
  form.viteAmapJsKey = data.viteAmapJsKey || defaultConfig.viteAmapJsKey;
  form.viteAmapSecurityJsCode = data.viteAmapSecurityJsCode || defaultConfig.viteAmapSecurityJsCode;
}

async function loadConfig() {
  loading.value = true;
  try {
    applyConfig(await fetchConfig());
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '读取配置失败');
  } finally {
    loading.value = false;
  }
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    await saveConfig({
      openaiBaseUrl: form.openaiBaseUrl.trim(),
      openaiApiKey: form.openaiApiKey.trim(),
      openaiModel: form.openaiModel.trim(),
      openaiTemperature: form.openaiTemperature,
      amapWebServiceKey: form.amapWebServiceKey.trim(),
      viteAmapJsKey: form.viteAmapJsKey.trim(),
      viteAmapSecurityJsCode: form.viteAmapSecurityJsCode.trim()
    });
    ElMessage.success('设置已保存');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存配置失败');
  } finally {
    saving.value = false;
  }
}

onMounted(loadConfig);
</script>

<template>
  <el-container class="settings-page" direction="vertical">
    <el-header class="settings-header">
      <div class="settings-title-row">
        <el-tooltip content="返回地图" placement="bottom">
          <el-button class="settings-back-button" :icon="ArrowLeft" text aria-label="返回地图" @click="router.push('/')" />
        </el-tooltip>
        <h1>设置</h1>
      </div>
    </el-header>

    <el-main class="settings-main">
      <el-scrollbar class="settings-scrollbar">
        <section v-loading="loading" class="settings-content">
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="settings-form">
            <section class="settings-section">
              <div class="settings-section-heading">
                <h2>模型服务</h2>
              </div>

              <el-alert title="仅支持 OpenAI 协议" type="info" :closable="false" show-icon />

              <div class="settings-grid">
                <el-form-item label="Base URL" prop="openaiBaseUrl">
                  <el-input v-model="form.openaiBaseUrl" placeholder="https://api.deepseek.com" />
                </el-form-item>
                <el-form-item label="模型名称" prop="openaiModel">
                  <el-input v-model="form.openaiModel" placeholder="deepseek-v4-flash" />
                </el-form-item>
                <el-form-item class="settings-grid-wide" label="API Key" prop="openaiApiKey">
                  <el-input v-model="form.openaiApiKey" type="password" show-password placeholder="输入 LLM API Key" />
                </el-form-item>
                <el-form-item class="settings-grid-wide" label="温度" prop="openaiTemperature">
                  <el-input-number
                    v-model="form.openaiTemperature"
                    :min="0"
                    :max="2"
                    :step="0.1"
                    :precision="1"
                  />
                </el-form-item>
              </div>
            </section>

            <section class="settings-section">
              <div class="settings-section-heading">
                <h2>高德地图</h2>
              </div>

              <div class="settings-grid">
                <el-form-item label="Web Service Key" prop="amapWebServiceKey">
                  <el-input
                    v-model="form.amapWebServiceKey"
                    type="password"
                    show-password
                    placeholder="输入高德 Web Service Key"
                  />
                </el-form-item>
                <el-form-item label="JS API Key" prop="viteAmapJsKey">
                  <el-input v-model="form.viteAmapJsKey" type="password" show-password placeholder="输入高德 JS API Key" />
                </el-form-item>
                <el-form-item class="settings-grid-wide" label="Security JS Code" prop="viteAmapSecurityJsCode">
                  <el-input
                    v-model="form.viteAmapSecurityJsCode"
                    type="password"
                    show-password
                    placeholder="输入高德 Security JS Code"
                  />
                </el-form-item>
              </div>
            </section>

            <footer class="settings-actions">
              <el-button :disabled="saving" @click="loadConfig">重新加载</el-button>
              <el-button type="primary" :loading="saving" @click="submit">保存设置</el-button>
            </footer>
          </el-form>
        </section>
      </el-scrollbar>
    </el-main>
  </el-container>
</template>

<style scoped>
.settings-page {
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  background: #f3f6f8;
  color: #17202a;
}

.settings-header {
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

.settings-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-back-button {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #17202a;
  font-size: 16px;
}

.settings-back-button:hover,
.settings-back-button:focus {
  background: transparent;
  color: #111111;
}

.settings-header h1,
.settings-section-heading h2 {
  margin: 0;
  font-weight: 700;
}

.settings-header h1 {
  font-size: 20px;
}

.settings-header p,
.settings-section-heading p {
  margin: 6px 0 0;
  color: #647383;
}

.settings-main {
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.settings-scrollbar {
  height: 100%;
}

.settings-content {
  width: min(100%, 980px);
  margin: 0 auto;
  padding: 24px;
}

.settings-form {
  display: grid;
  gap: 16px;
}

.settings-section {
  display: grid;
  gap: 18px;
  border: 1px solid #e2e9ee;
  border-radius: 8px;
  background: #ffffff;
  padding: 20px;
}

.settings-section-heading {
  border-bottom: 1px solid #edf1f4;
  padding-bottom: 14px;
}

.settings-section-heading h2 {
  font-size: 17px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 16px;
}

.settings-grid-wide {
  grid-column: 1 / -1;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 4px 0;
}

.settings-back-button :deep(.el-icon) {
  font-size: 16px;
}

@media (max-width: 720px) {
  .settings-header {
    padding: 10px 16px;
  }

  .settings-content {
    padding: 14px;
  }

  .settings-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
