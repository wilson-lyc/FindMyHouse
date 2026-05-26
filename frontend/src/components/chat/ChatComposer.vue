<script setup lang="ts">
import { computed, ref } from 'vue';
import { Top } from '@element-plus/icons-vue';

const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
  placeholder?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [];
}>();

const inputRef = ref<HTMLTextAreaElement | null>(null);

const canSubmit = computed(() => props.modelValue.trim().length > 0 && !props.disabled);

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return;
  }
  event.preventDefault();
  handleSubmit();
}

function handleSubmit() {
  if (!canSubmit.value) return;
  emit('submit');
}
</script>

<template>
  <form class="chat-composer" @submit.prevent="handleSubmit">
    <textarea
      ref="inputRef"
      :value="modelValue"
      class="chat-composer-input"
      :placeholder="placeholder ?? '用自然语言描述你想要的房子...'"
      :disabled="disabled"
      @input="handleInput"
      @keydown="handleKeydown"
    />
    <div class="chat-composer-footer">
      <span class="chat-composer-hint">Shift + Enter 换行</span>
      <el-button
        class="chat-composer-send"
        type="primary"
        circle
        native-type="submit"
        :disabled="!canSubmit"
        :loading="disabled"
        :icon="disabled ? undefined : Top"
        aria-label="发送消息"
        title="发送"
      />
    </div>
  </form>
</template>

<style scoped>
.chat-composer {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 8px;
  height: 100%;
  width: 100%;
  min-width: 0;
  background: transparent;
}

.chat-composer-input {
  display: block;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--app-text-primary);
  font: inherit;
  font-size: 14px;
  line-height: 1.55;
  letter-spacing: 0;
  padding: 0;
}

.chat-composer-input::placeholder {
  color: var(--el-text-color-secondary);
}

.chat-composer-input:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.chat-composer-footer {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.chat-composer-hint {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-composer-send {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.chat-composer-send:hover:not(.is-disabled) {
  transform: translateY(-1px);
}

.chat-composer-send.is-disabled {
  opacity: 0.28;
}

@media (max-width: 520px) {
  .chat-composer-hint {
    display: none;
  }
}
</style>
