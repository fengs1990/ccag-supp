<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

// 系统参数配置列表
const configList = ref([
  {
    id: 1,
    configKey: 'URGE_EXTEND_DAYS',
    configName: '督办单据延期天数',
    configValue: '30',
    description: '督办单生成时，自动设置的延期截止日期（生成时间 + 该天数）',
    updateTime: '2026-10-20 10:00:00',
    updateBy: 'admin_group',
  },
  {
    id: 2,
    configKey: 'REJECT_THRESHOLD_COUNT',
    configName: '驳回督办阈值',
    configValue: '3',
    description: '单据被驳回次数超过该值后，自动生成督办任务',
    updateTime: '2026-10-18 14:30:00',
    updateBy: 'admin_group',
  }
])

// 编辑对话框
const editDialogVisible = ref(false)
const editForm = ref({
  id: null,
  configKey: '',
  configName: '',
  configValue: '',
  description: '',
})
const isEditMode = ref(true) // true=编辑模式，false=新增模式

// 打开新增对话框
function openAddDialog() {
  isEditMode.value = false
  editForm.value = {
    id: null,
    configKey: '',
    configName: '',
    configValue: '',
    description: '',
  }
  editDialogVisible.value = true
}

// 打开编辑对话框
function openEditDialog(row) {
  isEditMode.value = true
  editForm.value = { ...row }
  editDialogVisible.value = true
}

// 保存配置
function saveConfig() {
  // 基础验证
  if (!editForm.value.configKey.trim()) {
    ElMessage.warning('请输入参数标识')
    return
  }
  if (!editForm.value.configName.trim()) {
    ElMessage.warning('请输入参数名称')
    return
  }
  if (!editForm.value.configValue.trim()) {
    ElMessage.warning('请输入参数值')
    return
  }

  // 新增模式：检查参数标识是否重复
  if (!isEditMode.value) {
    const exists = configList.value.find(c => c.configKey === editForm.value.configKey.trim())
    if (exists) {
      ElMessage.warning('参数标识已存在，请使用不同的标识')
      return
    }
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  if (isEditMode.value) {
    // 编辑模式
    const config = configList.value.find(c => c.id === editForm.value.id)
    if (config) {
      config.configValue = editForm.value.configValue
      config.updateTime = now
      config.updateBy = 'admin_group'
      ElMessage.success('参数配置已更新')
    }
  } else {
    // 新增模式
    const maxId = Math.max(...configList.value.map(c => c.id), 0)
    configList.value.push({
      id: maxId + 1,
      configKey: editForm.value.configKey.trim(),
      configName: editForm.value.configName.trim(),
      configValue: editForm.value.configValue,
      description: editForm.value.description.trim(),
      updateTime: now,
      updateBy: 'admin_group',
    })
    ElMessage.success('参数配置已添加')
  }

  editDialogVisible.value = false
}

// 刷新缓存
const refreshing = ref(false)
function refreshCache() {
  refreshing.value = true
  // 模拟刷新缓存的API调用
  setTimeout(() => {
    refreshing.value = false
    ElMessage.success('系统参数缓存已刷新，配置已生效')
  }, 1000)
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">系统参数配置</div>
        <div class="page-desc">管理系统运行的全局参数，修改后需刷新缓存才能生效</div>
      </div>
      <div style="display:flex;gap:8px">
        <el-button type="warning" :icon="'Refresh'" :loading="refreshing" @click="refreshCache">
          刷新缓存
        </el-button>
        <el-button type="primary" :icon="'Plus'" @click="openAddDialog">新增参数</el-button>
      </div>
    </div>

    <!-- 参数列表 -->
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600">系统参数（{{ configList.length }} 项）</span>
          <el-tag type="info" size="small">
            <el-icon style="margin-right:4px"><InfoFilled /></el-icon>
            参数存储在 Redis 缓存中，修改后点击"刷新缓存"生效
          </el-tag>
        </div>
      </template>

      <el-table :data="configList" style="width:100%" stripe>
        <el-table-column prop="configName" label="参数名称" width="200">
          <template #default="{ row }">
            <div style="font-weight:500">{{ row.configName }}</div>
            <div style="font-size:12px;color:#999;margin-top:2px">{{ row.configKey }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="configValue" label="参数值" width="200" align="center">
          <template #default="{ row }">
            <span style="font-size:16px;font-weight:600;color:#1677ff">{{ row.configValue }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="280">
          <template #default="{ row }">
            <div style="color:#666;line-height:1.6">{{ row.description }}</div>
          </template>
        </el-table-column>
        <el-table-column label="最后更新" width="160">
          <template #default="{ row }">
            <div style="font-size:12px;color:#666">{{ row.updateTime }}</div>
            <div style="font-size:11px;color:#999">{{ row.updateBy }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEditDialog(row)">
              <el-icon style="margin-right:4px"><Edit /></el-icon>
              修改
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible" :title="isEditMode ? `修改参数：${editForm.configName}` : '新增系统参数'" width="600px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="参数标识" required>
          <el-input v-model="editForm.configKey" :disabled="isEditMode" placeholder="如：URGE_EXTEND_DAYS" />
          <div style="font-size:12px;color:#999;margin-top:4px">参数的唯一标识符，建议使用大写字母和下划线</div>
        </el-form-item>
        <el-form-item label="参数名称" required>
          <el-input v-model="editForm.configName" :disabled="isEditMode" placeholder="如：督办单据延期天数" />
        </el-form-item>
        <el-form-item label="参数说明">
          <el-input v-model="editForm.description" type="textarea" :rows="3" :disabled="isEditMode" placeholder="描述该参数的作用和影响范围" />
        </el-form-item>
        <el-form-item label="参数值" required>
          <el-input v-model="editForm.configValue" placeholder="输入参数值" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">{{ isEditMode ? '保存' : '确认新增' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}
.page-desc {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}
</style>
