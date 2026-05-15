<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';

const router = useRouter();

const capabilities = [
  {
    icon: '🔍',
    title: '搜索房源',
    description: '按状态、来源渠道、租金范围、户型（卧室/客厅/卫生间数量）、坐标范围等多种条件组合筛选房源。',
    examples: ['帮我找月租3000以内的一室一厅', '查找所有已关注的房源', '附近有什么在出租的房子？']
  },
  {
    icon: '📋',
    title: '查看房源详情',
    description: '查看单套房源的完整信息，包括名称、租金、户型、地址、状态、坐标、费用明细和联系方式。',
    examples: ['看看这套房子的详细信息', '这个房源的联系方式是什么？']
  },
  {
    icon: '➕',
    title: '新增房源',
    description: '提供房源名称、地址和租金等信息，系统自动将地址解析为经纬度坐标，并通过前端弹窗让您确认后入库。',
    examples: ['新增一个房源，地址在xxx，月租2500', '记录一个新房子']
  },
  {
    icon: '✏️',
    title: '更新房源',
    description: '更新已有房源的信息，支持修改任意字段。需要提供房源 ID 确认目标。',
    examples: ['把月租改为2800', '更新这个房源的状态为已签']
  },
  {
    icon: '🗑️',
    title: '删除房源',
    description: '删除不再需要的房源记录。删除操作不可逆，需要明确房源 ID 才能执行。',
    examples: ['删除这个房源', '把ID为xxx的房源删掉']
  },
  {
    icon: '📍',
    title: '查询焦点地点',
    description: '查询当前设置的焦点地点信息。焦点地点是通勤路线计算的终点。',
    examples: ['我的焦点地点在哪里？', '当前焦点地点是什么？']
  }
];

const features = [
  {
    title: '通勤路线规划',
    description: '系统自动为每个有坐标的房源计算到焦点地点的驾车通勤路线，并在房源卡片和地图上直观展示。'
  },
  {
    title: '对话式交互',
    description: '在对话页面中与 AI 助手自然语言交互，助手可以边聊天边在地图上展示搜索结果。'
  },
  {
    title: '智能地址解析',
    description: '新增房源时，自动调用高德地图 API 将文本地址解析为精确的经纬度坐标。'
  },
  {
    title: '历史会话管理',
    description: '所有对话自动保存，支持查看历史会话、继续之前的对话。'
  }
];

const screenshots = [
  {
    id: 'chat',
    caption: '在对话页面中与 AI 助手交流，助手搜索房源后地图同步展示结果',
    description: '请截取对话页面全屏，左侧为聊天窗口（包含用户提问和AI回答），右侧高德地图上标记了搜索到的房源位置'
  },
  {
    id: 'route',
    caption: '通勤路线规划，地图上展示从房源到焦点地点的驾车路线',
    description: '请截取地图主界面，包含左侧房源列表和右侧地图，地图上显示从房源到焦点地点的驾车路线（蓝色线条）'
  }
];
</script>

<template>
  <el-container class="help-page" direction="vertical">
    <el-header class="help-header">
      <div class="help-title-row">
        <el-tooltip content="返回地图" placement="bottom">
          <el-button class="help-back-button" :icon="ArrowLeft" text aria-label="返回地图" @click="router.push('/')" />
        </el-tooltip>
        <h1>帮助</h1>
      </div>
    </el-header>

    <el-main class="help-main">
      <el-scrollbar class="help-scrollbar">
        <div class="help-content">
          <section class="help-intro">
            <img class="help-logo" src="/favicon.png" alt="FindMyHouse" />
            <h2>AI 找房助手</h2>
            <p class="help-intro-text">
              FindMyHouse 内置了一个智能找房助手，您可以在「对话」页面中通过自然语言与其交流。
              助手可以帮您搜索、查看、新增、更新和删除房源，也可以查询焦点地点信息。
            </p>
          </section>

          <section class="help-section">
            <h2 class="help-section-title">助手能力</h2>
            <p class="help-section-desc">助手目前支持以下能力，您可以在对话中这样使用：</p>

            <div class="help-capabilities">
              <article
                v-for="cap in capabilities"
                :key="cap.title"
                class="help-capability-card"
              >
                <div class="help-capability-icon">{{ cap.icon }}</div>
                <div class="help-capability-body">
                  <h3>{{ cap.title }}</h3>
                  <p>{{ cap.description }}</p>
                  <div class="help-capability-examples">
                    <span
                      v-for="(example, idx) in cap.examples"
                      :key="idx"
                      class="help-example-tag"
                    >{{ example }}</span>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section class="help-section">
            <h2 class="help-section-title">系统功能</h2>
            <p class="help-section-desc">除了 AI 助手，系统还提供以下功能：</p>

            <div class="help-features">
              <div v-for="feature in features" :key="feature.title" class="help-feature-card">
                <h3>{{ feature.title }}</h3>
                <p>{{ feature.description }}</p>
              </div>
            </div>
          </section>

          <section class="help-section">
            <h2 class="help-section-title">界面预览</h2>
            <p class="help-section-desc">以下为系统运行时的界面截图，帮助您快速了解操作方式：</p>

            <div class="help-screenshots">
              <figure v-for="shot in screenshots" :key="shot.id" class="help-screenshot-figure">
                <img
                  class="help-screenshot-img"
                  :src="`/images/screenshots/${shot.id}.png`"
                  :alt="shot.caption"
                />
                <figcaption>{{ shot.caption }}</figcaption>
              </figure>
            </div>
          </section>

          <section class="help-section">
            <h2 class="help-section-title">注意事项</h2>
            <el-alert
              title="AI 生成的内容可能不准确，涉及房源价格、联系方式、地址等信息请以实际情况为准，注意甄别。"
              type="warning"
              :closable="false"
              show-icon
            />
            <ul class="help-notes">
              <li>所有对话记录保存在本地，刷新页面后仍可查看历史会话。</li>
              <li>新增房源需要经过地址解析和二次确认，不会直接入库。</li>
              <li>删除房源不可逆，请谨慎操作。</li>
              <li>焦点地点是通勤路线计算的终点，系统中同一时间只能有一个焦点地点。</li>
            </ul>
          </section>
        </div>
      </el-scrollbar>
    </el-main>
  </el-container>
</template>

<style scoped>
.help-page {
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  background: #f3f6f8;
  color: #17202a;
}

.help-header {
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

.help-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.help-back-button {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #17202a;
  font-size: 16px;
}

.help-back-button:hover,
.help-back-button:focus {
  background: transparent;
  color: #111111;
}

.help-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.help-main {
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.help-scrollbar {
  height: 100%;
}

.help-content {
  width: min(100%, 980px);
  margin: 0 auto;
  padding: 24px;
  display: grid;
  gap: 24px;
}

.help-intro {
  text-align: center;
  padding: 32px 20px;
}

.help-logo {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  margin-bottom: 16px;
  display: inline-block;
}

.help-intro h2 {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
}

.help-intro-text {
  margin: 0;
  max-width: 600px;
  margin-inline: auto;
  color: #526270;
  font-size: 15px;
  line-height: 1.7;
}

.help-section-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
}

.help-section-desc {
  margin: 0 0 16px;
  color: #647383;
  font-size: 14px;
}

.help-capabilities {
  display: grid;
  gap: 12px;
}

.help-capability-card {
  display: flex;
  gap: 16px;
  border: 1px solid #e2e9ee;
  border-radius: 8px;
  background: #ffffff;
  padding: 20px;
}

.help-capability-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  border-radius: 8px;
  background: #f3f6f8;
}

.help-capability-body {
  flex: 1;
  min-width: 0;
}

.help-capability-body h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
}

.help-capability-body p {
  margin: 0 0 10px;
  color: #526270;
  font-size: 14px;
  line-height: 1.6;
}

.help-capability-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.help-example-tag {
  display: inline-block;
  border: 1px solid #dce5eb;
  border-radius: 6px;
  background: #f6fafc;
  padding: 4px 10px;
  color: #407899;
  font-size: 12px;
  line-height: 1.4;
}

.help-features {
  display: grid;
  gap: 12px;
}

.help-feature-card {
  border: 1px solid #e2e9ee;
  border-radius: 8px;
  background: #ffffff;
  padding: 20px;
}

.help-feature-card h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
}

.help-feature-card p {
  margin: 0;
  color: #526270;
  font-size: 14px;
  line-height: 1.6;
}

.help-notes {
  margin: 16px 0 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
}

.help-notes li {
  color: #526270;
  font-size: 14px;
  line-height: 1.6;
}

.help-screenshots {
  display: grid;
  gap: 16px;
}

.help-screenshot-figure {
  margin: 0;
  display: grid;
  gap: 8px;
}

.help-screenshot-img {
  width: 100%;
  border: 1px solid #e2e9ee;
  border-radius: 8px;
  background: #ffffff;
  display: block;
}

.help-screenshot-figure figcaption {
  color: #526270;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

.help-back-button :deep(.el-icon) {
  font-size: 16px;
}

@media (max-width: 720px) {
  .help-header {
    padding: 10px 16px;
  }

  .help-content {
    padding: 14px;
  }

  .help-intro {
    padding: 20px 14px;
  }

  .help-capability-card {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
