<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { UploadProps, UploadRawFile, UploadUserFile } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown, ArrowUp, Delete, Star, UploadFilled } from '@element-plus/icons-vue';
import {
  deleteHouseImage,
  fetchHouseImages,
  reorderHouseImages,
  updateHouseImage,
  uploadHouseImages
} from '../../api/house/house-api';
import type { House, HouseImage } from '../../model/house/house';

const props = defineProps<{
  house: House | null;
  visible: boolean;
}>();

const emit = defineEmits<{
  changed: [];
}>();

const images = ref<HouseImage[]>([]);
const uploadFiles = ref<UploadUserFile[]>([]);
const loading = ref(false);
const uploading = ref(false);

const sortedImages = computed(() =>
  [...images.value].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt.localeCompare(b.createdAt);
  })
);

const previewUrls = computed(() => sortedImages.value.map((image) => image.thumbnailUrl || image.url));

watch(
  () => [props.visible, props.house?.id] as const,
  ([visible, houseId]) => {
    uploadFiles.value = [];
    if (!visible || !houseId) {
      images.value = [];
      return;
    }

    void loadImages();
  },
  { immediate: true }
);

async function loadImages() {
  if (!props.house) return;

  loading.value = true;
  try {
    images.value = await fetchHouseImages(props.house.id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载房源图片失败');
  } finally {
    loading.value = false;
  }
}

const handleUploadChange: UploadProps['onChange'] = async (_file, fileList) => {
  uploadFiles.value = fileList;
  await submitUpload();
};

async function submitUpload() {
  if (!props.house) {
    ElMessage.info('请先保存房源，再上传图片');
    uploadFiles.value = [];
    return;
  }

  const files = uploadFiles.value.map((item) => item.raw).filter((file): file is UploadRawFile => Boolean(file));
  if (!files.length || uploading.value) {
    return;
  }

  uploading.value = true;
  try {
    await uploadHouseImages(props.house.id, files);
    uploadFiles.value = [];
    ElMessage.success('图片已上传');
    await loadImages();
    emit('changed');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '上传图片失败');
  } finally {
    uploading.value = false;
  }
}

async function removeImage(image: HouseImage) {
  if (!props.house) return;

  try {
    await ElMessageBox.confirm('确认删除这张图片吗？', '删除房源图片', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });

    await deleteHouseImage(props.house.id, image.id);
    images.value = images.value.filter((item) => item.id !== image.id);
    ElMessage.success('图片已删除');
    emit('changed');
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message || '删除图片失败');
    }
  }
}

async function setCover(image: HouseImage) {
  if (!props.house || image.isCover) return;

  try {
    await updateHouseImage(props.house.id, image.id, { isCover: true });
    ElMessage.success('封面已更新');
    await loadImages();
    emit('changed');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '设置封面失败');
  }
}

async function moveImage(image: HouseImage, offset: -1 | 1) {
  if (!props.house) return;

  const nextImages = [...sortedImages.value];
  const index = nextImages.findIndex((item) => item.id === image.id);
  const nextIndex = index + offset;
  if (index < 0 || nextIndex < 0 || nextIndex >= nextImages.length) return;

  const [current] = nextImages.splice(index, 1);
  nextImages.splice(nextIndex, 0, current);

  try {
    images.value = await reorderHouseImages(props.house.id, nextImages.map((item) => item.id));
    emit('changed');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存图片排序失败');
    await loadImages();
  }
}
</script>

<template>
  <div class="house-image-manager" v-loading="loading">
    <div v-if="!house" class="house-image-placeholder">
      保存房源后可上传和管理图片
    </div>

    <el-empty v-else-if="!sortedImages.length" description="暂无房源图片" />

    <div v-else class="house-image-grid">
      <div v-for="(image, index) in sortedImages" :key="image.id" class="house-image-grid-item">
        <el-image
          class="house-image-grid-preview"
          :src="image.thumbnailUrl || image.url"
          :alt="image.originalName || image.fileName || `房源图片 ${index + 1}`"
          :preview-src-list="previewUrls"
          :initial-index="index"
          fit="cover"
          loading="lazy"
          preview-teleported
        />
        <span v-if="image.isCover" class="house-image-cover-badge">封面</span>
        <div class="house-image-grid-actions">
          <el-tooltip content="上移" placement="top">
            <el-button
              :icon="ArrowUp"
              circle
              size="small"
              :disabled="index === 0"
              @click.stop="moveImage(image, -1)"
            />
          </el-tooltip>
          <el-tooltip content="下移" placement="top">
            <el-button
              :icon="ArrowDown"
              circle
              size="small"
              :disabled="index === sortedImages.length - 1"
              @click.stop="moveImage(image, 1)"
            />
          </el-tooltip>
          <el-tooltip content="设为封面" placement="top">
            <el-button
              :icon="Star"
              circle
              size="small"
              type="primary"
              :disabled="image.isCover"
              @click.stop="setCover(image)"
            />
          </el-tooltip>
          <el-tooltip content="删除" placement="top">
            <el-button :icon="Delete" circle size="small" type="danger" @click.stop="removeImage(image)" />
          </el-tooltip>
        </div>
      </div>
    </div>

    <div class="house-image-upload-row">
      <el-upload
        v-model:file-list="uploadFiles"
        action="#"
        multiple
        accept="image/*"
        :auto-upload="false"
        :show-file-list="false"
        :disabled="!house || uploading"
        :on-change="handleUploadChange"
      >
        <el-button type="primary" :icon="UploadFilled" :loading="uploading" :disabled="!house">
          上传图片
        </el-button>
      </el-upload>
    </div>
  </div>
</template>
