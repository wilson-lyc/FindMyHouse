import { computed, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import html2canvas from 'html2canvas';
import { fetchChatSession } from '../../api/chat/chat-session-api';
import type { ChatMessage } from '../../model/chat/chat-message';

export function useChatShare() {
  const shareDialogVisible = ref(false);
  const shareImageUrl = ref('');
  const shareGenerating = ref(false);
  const shareRenderMessages = ref<ChatMessage[]>([]);

  const canShareConversation = computed(() => shareRenderMessages.value.length > 0 && !shareGenerating.value);

  async function openShareDialog(messages: ChatMessage[]) {
    if (messages.length === 0) return;

    try {
      await ElMessageBox.confirm(
        '分享图片会包含当前对话中展示的文字和房源信息，发送给他人后可能造成隐私泄露。请确认已检查内容，并注意识别敏感信息。',
        '确认分享对话',
        {
          type: 'warning',
          confirmButtonText: '确认生成',
          cancelButtonText: '取消'
        }
      );
    } catch {
      return;
    }

    shareImageUrl.value = '';
    shareRenderMessages.value = messages;
    shareDialogVisible.value = true;
    shareGenerating.value = true;
  }

  async function shareSession(sessionId: string) {
    if (shareGenerating.value) return;

    try {
      const session = await fetchChatSession(sessionId);
      const messages = session.messages.filter((message) => !message.hidden);
      await openShareDialog(messages);
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '加载会话失败');
    }
  }

  async function copyShareImage() {
    if (!shareImageUrl.value) return;

    try {
      const response = await fetch(shareImageUrl.value);
      const blob = await response.blob();

      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        throw new Error('当前浏览器不支持复制图片');
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      ElMessage.success('分享图已复制');
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '复制失败，请下载后分享');
    }
  }

  function downloadShareImage() {
    if (!shareImageUrl.value) return;

    const link = document.createElement('a');
    link.href = shareImageUrl.value;
    link.download = `findmyhouse-chat-${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  }

  return {
    shareDialogVisible,
    shareImageUrl,
    shareGenerating,
    shareRenderMessages,
    canShareConversation,
    openShareDialog,
    shareSession,
    copyShareImage,
    downloadShareImage
  };
}

export async function renderElementToPng(element: HTMLElement, width: number, height: number) {
  const MAX_CANVAS_SIZE = 8192;
  let scale = Math.min(window.devicePixelRatio || 1, 2);
  if (width * scale > MAX_CANVAS_SIZE || height * scale > MAX_CANVAS_SIZE) {
    scale = Math.min(scale, MAX_CANVAS_SIZE / Math.max(width, height));
  }

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    height,
    scale,
    useCORS: true,
    width,
    windowHeight: height,
    windowWidth: width
  });

  return canvas.toDataURL('image/png');
}
