<template>
  <div class="avatar-editor">
    <button type="button" class="avatar-trigger" :title="$t('profile.avatar.hint')" :aria-label="$t('profile.avatar.hint')" @click="open = true">
      <a-avatar :key="`${session.avatar}:${avatarFailed}`" :size="72" :image-url="avatarFailed ? undefined : session.avatar" @error="avatarFailed = true">{{ (session.name || user?.username || 'M').slice(0, 1).toUpperCase() }}</a-avatar><span class="avatar-camera"><icon-camera /></span>
    </button>
    <AppModal v-model:visible="open" :title="$t('profile.avatar.dialogTitle')" :width="760" :mask-closable="false" :footer="false" :closable="!saving" :esc-to-close="!saving">
      <div class="avatar-crop-layout">
        <div class="avatar-crop"><VueCropper ref="cropper" :img="image" :info="true" :auto-crop="true" :auto-crop-width="200" :auto-crop-height="200" :fixed-box="true" @real-time="previews = $event" /></div>
        <div class="avatar-upload-preview"><img v-if="previews.url" :src="previews.url" :style="previews.img" alt=""></div>
      </div>
      <div class="avatar-controls">
        <a-upload action="#" :disabled="saving" :show-file-list="false" :on-before-upload="beforeUpload" accept="image/png,image/jpeg,image/webp"><a-button :disabled="saving"><template #icon><icon-upload /></template>{{ $t('profile.avatar.upload') }}</a-button></a-upload>
        <a-button :disabled="saving" :aria-label="$t('profile.avatar.zoomIn')" @click="cropper?.changeScale(1)"><icon-plus /></a-button>
        <a-button :disabled="saving" :aria-label="$t('profile.avatar.zoomOut')" @click="cropper?.changeScale(-1)"><icon-minus /></a-button>
        <a-button :disabled="saving" :aria-label="$t('profile.avatar.rotateLeft')" @click="cropper?.rotateLeft()"><icon-rotate-left /></a-button>
        <a-button :disabled="saving" :aria-label="$t('profile.avatar.rotateRight')" @click="cropper?.rotateRight()"><icon-rotate-right /></a-button>
        <a-button type="primary" :loading="saving" @click="upload">{{ $t('profile.avatar.submit') }}</a-button>
      </div>
    </AppModal>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { VueCropper } from 'vue-cropper'
import 'vue-cropper/dist/index.css'
import { useUserStore } from '@/stores/user'
import { uploadAvatar } from '@/api/admin/sys-user'
import { msgSuccess, msgError } from '@/utils/message'
import AppModal from '@/components/AppModal/index.vue'
import type { SysUser } from '@/types/admin'
defineProps<{ user?: SysUser }>()
const emit = defineEmits<{ uploaded: [avatar: string] }>()
const session = useUserStore(); const { t } = useI18n()
const avatarFailed = ref(false)
watch(() => session.avatar, () => { avatarFailed.value = false })
const open = ref(false); const saving = ref(false); const image = ref('')
const previews = ref<{ url?: string, img?: Record<string, string> }>({})
const cropper = ref<{ changeScale: (delta: number) => void, rotateLeft: () => void, rotateRight: () => void, getCropBlob: (callback: (data: Blob) => void) => void }>()
watch(open, visible => { if (visible) image.value = session.avatar; else { image.value = ''; previews.value = {} } })
const beforeUpload = (file: File) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { msgError(t('profile.avatar.fileRule')); return false }
  const reader = new FileReader()
  reader.onload = () => { if (open.value) image.value = String(reader.result) }
  reader.readAsDataURL(file)
  return false
}
const upload = () => {
  if (saving.value || !cropper.value || !image.value) return
  saving.value = true
  cropper.value.getCropBlob(async blob => {
    try {
      const data = new FormData(); data.append('upload[]', blob, 'avatar.png')
      const response = await uploadAvatar(data)
      session.setAvatar(response.data)
      emit('uploaded', response.data)
      open.value = false
      msgSuccess(response.msg)
    } catch { /* The interceptor reports the error; keep the crop for retry. */ } finally { saving.value = false }
  })
}
</script>
<style scoped>
.avatar-trigger { position: relative; padding: 0; border: 0; background: transparent; cursor: pointer; }
.avatar-trigger :deep(.arco-avatar) { background: var(--motor-avatar-background); box-shadow: var(--motor-avatar-shadow); }
.avatar-camera { position: absolute; bottom: -3px; right: -3px; width: 28px; height: 28px; display: grid; place-items: center; border: 2px solid var(--motor-surface); border-radius: 50%; background: var(--motor-primary); color: white; }
.avatar-crop-layout { display: grid; grid-template-columns: minmax(0, 1fr) 200px; gap: 24px; align-items: center; }
.avatar-crop { height: 320px; }
.avatar-upload-preview { width: 180px; height: 180px; border-radius: 50%; overflow: hidden; }
.avatar-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 20px; }
@media (max-width: 600px) { .avatar-crop-layout { grid-template-columns: 1fr; } .avatar-upload-preview { display: none; } .avatar-crop { height: 280px; } }
</style>
