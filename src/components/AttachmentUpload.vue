<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  },
  maxSize: {
    type: Number,
    default: 20 // MB
  },
  accept: {
    type: String,
    default: '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx'
  },
  maxCount: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['update:modelValue'])

const fileList = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 文件类型图标映射
const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const iconMap = {
    jpg: 'Picture',
    jpeg: 'Picture',
    png: 'Picture',
    gif: 'Picture',
    pdf: 'Document',
    doc: 'Document',
    docx: 'Document',
    xls: 'DataAnalysis',
    xlsx: 'DataAnalysis',
  }
  return iconMap[ext] || 'Document'
}

// 文件大小格式化
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

// 文件上传前校验
const beforeUpload = (file) => {
  // 检查文件数量
  if (fileList.value.length >= props.maxCount) {
    ElMessage.warning(`最多只能上传 ${props.maxCount} 个附件`)
    return false
  }

  // 检查文件大小
  const isLtMaxSize = file.size / 1024 / 1024 < props.maxSize
  if (!isLtMaxSize) {
    ElMessage.error(`文件大小不能超过 ${props.maxSize}MB`)
    return false
  }

  // 检查文件类型
  const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
  const acceptList = props.accept.split(',').map(s => s.trim())
  if (!acceptList.includes(fileExt)) {
    ElMessage.error(`只支持上传 ${props.accept} 格式的文件`)
    return false
  }

  return true
}

// 模拟文件上传
const handleUpload = (file) => {
  if (!beforeUpload(file)) {
    return
  }

  // 模拟上传进度
  const newFile = {
    id: Date.now(),
    fileName: file.name,
    fileSize: file.size,
    fileType: getFileType(file.name),
    storagePath: `/uploads/${Date.now()}_${file.name}`,
    uploadTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    uploadProgress: 0,
    uploading: true,
  }

  const newList = [...fileList.value, newFile]
  fileList.value = newList

  // 模拟上传进度
  const timer = setInterval(() => {
    const fileIndex = fileList.value.findIndex(f => f.id === newFile.id)
    if (fileIndex === -1) {
      clearInterval(timer)
      return
    }

    const currentFile = fileList.value[fileIndex]
    if (currentFile.uploadProgress >= 100) {
      clearInterval(timer)
      currentFile.uploading = false
      ElMessage.success(`${file.name} 上传成功`)
    } else {
      currentFile.uploadProgress += 20
    }
  }, 300)
}

// 获取文件类型
const getFileType = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office'
  return 'other'
}

// 删除附件
const handleRemove = (file) => {
  const index = fileList.value.findIndex(f => f.id === file.id)
  if (index > -1) {
    const newList = [...fileList.value]
    newList.splice(index, 1)
    fileList.value = newList
    ElMessage.success('附件已删除')
  }
}

// 下载附件
const handleDownload = (file) => {
  ElMessage.success(`下载 ${file.fileName}`)
  // 实际项目中这里应该调用下载接口
}

// 预览附件
const handlePreview = (file) => {
  if (file.fileType === 'image') {
    ElMessage.info('预览图片功能（待实现）')
  } else if (file.fileType === 'pdf') {
    ElMessage.info('预览PDF功能（待实现）')
  } else {
    ElMessage.info('该文件类型不支持预览，请下载后查看')
  }
}

// 触发文件选择
const fileInputRef = ref(null)
const triggerUpload = () => {
  if (props.disabled) return
  fileInputRef.value?.click()
}

const handleFileChange = (event) => {
  const files = event.target.files
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      handleUpload(files[i])
    }
    // 清空input，允许重复选择同一文件
    event.target.value = ''
  }
}
</script>

<template>
  <div class="attachment-upload">
    <!-- 上传按钮 -->
    <div v-if="!disabled" class="upload-btn-wrapper">
      <el-button
        :icon="'Upload'"
        :disabled="fileList.length >= maxCount"
        @click="triggerUpload"
      >
        上传附件
      </el-button>
      <span style="font-size:12px;color:#888;margin-left:12px">
        支持 {{ accept }} 格式，单个文件不超过 {{ maxSize }}MB，最多 {{ maxCount }} 个
      </span>
      <input
        ref="fileInputRef"
        type="file"
        :accept="accept"
        multiple
        style="display:none"
        @change="handleFileChange"
      />
    </div>

    <!-- 附件列表 -->
    <div v-if="fileList.length > 0" class="attachment-list">
      <div v-for="file in fileList" :key="file.id" class="attachment-item">
        <div class="attachment-icon">
          <el-icon :size="24" :color="file.uploading ? '#ccc' : '#1677ff'">
            <component :is="getFileIcon(file.fileName)" />
          </el-icon>
        </div>
        <div class="attachment-info">
          <div class="attachment-name">
            {{ file.fileName }}
            <el-tag v-if="file.fileType === 'image'" size="small" type="success" effect="plain">图片</el-tag>
            <el-tag v-else-if="file.fileType === 'pdf'" size="small" type="danger" effect="plain">PDF</el-tag>
            <el-tag v-else-if="file.fileType === 'office'" size="small" type="warning" effect="plain">文档</el-tag>
          </div>
          <div class="attachment-meta">
            <span>{{ formatFileSize(file.fileSize) }}</span>
            <span v-if="file.uploadTime">{{ file.uploadTime }}</span>
          </div>
          <!-- 上传进度条 -->
          <el-progress
            v-if="file.uploading"
            :percentage="file.uploadProgress"
            :show-text="false"
            :stroke-width="3"
            style="margin-top:4px"
          />
        </div>
        <div class="attachment-actions">
          <el-button
            v-if="!file.uploading && ['image', 'pdf'].includes(file.fileType)"
            link
            type="primary"
            size="small"
            :icon="'View'"
            @click="handlePreview(file)"
          >
            预览
          </el-button>
          <el-button
            v-if="!file.uploading"
            link
            type="primary"
            size="small"
            :icon="'Download'"
            @click="handleDownload(file)"
          >
            下载
          </el-button>
          <el-button
            v-if="!disabled && !file.uploading"
            link
            type="danger"
            size="small"
            :icon="'Delete'"
            @click="handleRemove(file)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="fileList.length === 0" class="attachment-empty">
      <el-icon :size="40" color="#ccc"><Document /></el-icon>
      <div style="margin-top:8px;color:#999;font-size:13px">暂无附件</div>
    </div>
  </div>
</template>

<style scoped>
.attachment-upload {
  width: 100%;
}

.upload-btn-wrapper {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attachment-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
  transition: all 0.2s;
}

.attachment-item:hover {
  background: #f5f5f5;
  border-color: #d9d9d9;
}

.attachment-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 4px;
}

.attachment-info {
  flex: 1;
  min-width: 0;
}

.attachment-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 8px;
}

.attachment-meta {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  display: flex;
  gap: 16px;
}

.attachment-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.attachment-empty {
  padding: 40px 0;
  text-align: center;
}
</style>
