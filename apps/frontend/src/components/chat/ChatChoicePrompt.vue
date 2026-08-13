<script setup lang="ts">
interface ChoiceOption {
  id: string;
  label: string;
  value: string;
}

interface ChoicePromptData {
  id: string;
  question: string;
  options: ChoiceOption[];
  customOptionLabel?: string;
  answeredValue?: string;
}

const props = defineProps<{
  prompt: ChoicePromptData;
  loading: boolean;
  disabled?: boolean;
  customInputValue: string;
}>();

const emit = defineEmits<{
  select: [value: string];
  'update:customInputValue': [value: string];
  submitCustom: [];
}>();

function isInteractionDisabled(): boolean {
  return props.disabled || props.loading || Boolean(props.prompt.answeredValue);
}

function handleOptionClick(optionValue: string) {
  if (isInteractionDisabled()) return;
  emit('select', optionValue);
}

function handleCustomInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:customInputValue', target.value);
}

function handleCustomSubmit() {
  if (isInteractionDisabled() || !props.customInputValue.trim()) return;
  emit('submitCustom');
}
</script>

<template>
  <div class="chat-choice-prompt">
    <div class="chat-choice-question">{{ prompt.question }}</div>
    <div
      class="chat-choice-options"
      role="radiogroup"
      :aria-label="prompt.question"
    >
      <button
        v-for="option in prompt.options"
        :key="option.id"
        class="chat-choice-option"
        type="button"
        role="radio"
        :aria-checked="prompt.answeredValue === option.value"
        :class="{ selected: prompt.answeredValue === option.value }"
        :disabled="isInteractionDisabled()"
        @click="handleOptionClick(option.value)"
      >
        <span class="chat-choice-radio" />
        <span class="chat-choice-label">{{ option.label }}</span>
      </button>
    </div>
    <form
      v-if="prompt.customOptionLabel"
      class="chat-choice-custom"
      @submit.prevent="handleCustomSubmit"
    >
      <input
        :value="customInputValue"
        class="chat-choice-custom-input"
        type="text"
        :placeholder="prompt.customOptionLabel"
        :disabled="isInteractionDisabled()"
        @input="handleCustomInput"
      >
      <el-button
        class="chat-choice-custom-submit"
        type="primary"
        native-type="submit"
        :disabled="isInteractionDisabled() || !customInputValue.trim()"
      >
        发送
      </el-button>
    </form>
  </div>
</template>

<style scoped>
.chat-choice-prompt {
  display: grid;
  gap: 10px;
  min-width: min(360px, 100%);
  white-space: normal;
}

.chat-choice-question {
  color: var(--app-text-primary);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}

.chat-choice-options {
  display: grid;
  gap: 8px;
}

.chat-choice-option {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
  color: var(--app-text-primary);
  cursor: pointer;
  font: inherit;
  line-height: 1.35;
  text-align: left;
}

.chat-choice-option:hover:not(:disabled) {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.chat-choice-option:disabled {
  cursor: default;
  opacity: 0.72;
}

.chat-choice-option.selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary-dark-2);
}

.chat-choice-radio {
  width: 14px;
  height: 14px;
  border: 1px solid var(--el-border-color-darker);
  border-radius: 50%;
  background: var(--el-bg-color);
  box-shadow: inset 0 0 0 3px var(--el-bg-color);
}

.chat-choice-option.selected .chat-choice-radio {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary);
}

.chat-choice-label {
  min-width: 0;
  overflow-wrap: anywhere;
}

.chat-choice-custom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.chat-choice-custom-input {
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  outline: 0;
  background: var(--el-bg-color);
  color: var(--app-text-primary);
  font: inherit;
  font-size: 13px;
  letter-spacing: 0;
}

.chat-choice-custom-input:focus {
  border-color: var(--el-color-primary);
}

.chat-choice-custom-submit {
  height: 34px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
}

.chat-choice-custom-submit:disabled {
  cursor: not-allowed;
  opacity: 0.32;
}
</style>
