<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { mockGroups } from '../../mock/group.js'
import { FIELD_TYPES } from '../../mock/template.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

// 分组列表
const groupList = ref([...mockGroups])

// 分组状态
const GROUP_STATUS = {
  0: { label: '草稿', type: 'info' },
  1: { label: '已发布', type: 'success' },
}

// 分组类型
const GROUP_TYPES = {
  NORMAL: { label: '普通分组', color: '#1677ff' },
  MASTER_SLAVE: { label: '主从分组', color: '#722ed1' },
}

// 编辑对话框
const editDialogVisible = ref(false)
const editForm = ref({
  id: null,
  groupName: '',
  groupDesc: '',
  groupType: 'NORMAL',
  status: 0,
  fields: [],
})
const isEditMode = ref(true)
const isViewMode = ref(false) // 是否为查看模式

// 字段抽屉
const fieldDrawerVisible = ref(false)
const editingField = ref(null)
const editingFieldIdx = ref(-1)

// 打开新增对话框
function openAddDialog() {
  isEditMode.value = false
  isViewMode.value = false
  editForm.value = {
    id: null,
    groupName: '',
    groupDesc: '',
    groupType: 'NORMAL',
    status: 0,
    fields: [],
  }
  editDialogVisible.value = true
}

// 打开编辑对话框
function openEditDialog(row) {
  if (row.status === 1) {
    ElMessage.warning('已发布的分组不可编辑')
    return
  }
  isEditMode.value = true
  isViewMode.value = false
  editForm.value = { ...row, fields: [...(row.fields || [])] }
  editDialogVisible.value = true
}

// 打开查看对话框
function openViewDialog(row) {
  isEditMode.value = true
  isViewMode.value = true
  editForm.value = { ...row, fields: [...(row.fields || [])] }
  editDialogVisible.value = true
}

// 保存分组
function saveGroup() {
  if (!editForm.value.groupName.trim()) {
    ElMessage.warning('请输入分组名称')
    return
  }

  // 生成唯一性校验规则
  const uniqueRule = generateUniqueRule()

  if (isEditMode.value) {
    const group = groupList.value.find(g => g.id === editForm.value.id)
    if (group) {
      group.groupName = editForm.value.groupName
      group.groupDesc = editForm.value.groupDesc
      group.groupType = editForm.value.groupType
      group.fields = editForm.value.fields
      group.uniqueRule = uniqueRule // 保存唯一性规则
      group.updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
      ElMessage.success('分组已更新')
    }
  } else {
    const maxId = Math.max(...groupList.value.map(g => g.id), 0)
    groupList.value.push({
      id: maxId + 1,
      groupName: editForm.value.groupName,
      groupDesc: editForm.value.groupDesc,
      groupType: editForm.value.groupType,
      status: 0,
      fields: editForm.value.fields,
      uniqueRule: uniqueRule, // 保存唯一性规则
      createBy: 'admin_group',
      createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updateTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    ElMessage.success('分组已创建')
  }

  editDialogVisible.value = false
}

// 生成唯一性校验规则
function generateUniqueRule() {
  if (!editForm.value.fields || editForm.value.fields.length === 0) {
    return null
  }

  // 组装所有字段的编码作为联合唯一键
  const fieldCodes = editForm.value.fields.map(f => f.fieldCode)

  return {
    ruleCode: 'AUTO_UNIQUE_RULE',
    ruleName: '分组字段联合唯一性校验',
    ruleType: 'UNIQUE',
    ruleDesc: `分组字段联合唯一性校验：${fieldCodes.join(' + ')}`,
    fieldCodes: fieldCodes,
    expression: fieldCodes.join(','),
    errorMessage: `该组合数据已存在，请检查：${fieldCodes.map(c => editForm.value.fields.find(f => f.fieldCode === c)?.fieldName || c).join('、')}`,
  }
}

// 发布分组
function publishGroup(row) {
  if (row.status === 1) {
    ElMessage.warning('分组已发布')
    return
  }

  if (!row.fields || row.fields.length === 0) {
    ElMessage.warning('请至少配置一个字段后再发布')
    return
  }

  ElMessageBox.confirm(
    `确认发布分组「${row.groupName}」？发布后将不可编辑，只能删除`,
    '发布确认',
    {
      type: 'warning',
      confirmButtonText: '确认发布',
    }
  ).then(() => {
    row.status = 1
    row.updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    ElMessage.success('分组已发布')
  }).catch(() => {})
}

// 删除分组
function deleteGroup(row) {
  ElMessageBox.confirm(
    `确认删除分组「${row.groupName}」？此操作不可恢复`,
    '删除确认',
    {
      type: 'error',
      confirmButtonText: '确认删除',
    }
  ).then(() => {
    const idx = groupList.value.findIndex(g => g.id === row.id)
    if (idx > -1) {
      groupList.value.splice(idx, 1)
      ElMessage.success('分组已删除')
    }
  }).catch(() => {})
}

// ==================== 字段配置 ====================
function openAddField() {
  editingFieldIdx.value = -1
  editingField.value = {
    fieldCode: '',
    fieldName: '',
    fieldType: 'TEXT',
    isRequired: 0,
    isSensitive: 0,
    remark: '',
    displayOrder: editForm.value.fields.length + 1,
  }
  fieldDrawerVisible.value = true
}

function openEditField(field, idx) {
  editingFieldIdx.value = idx
  editingField.value = { ...field }
  fieldDrawerVisible.value = true
}

function saveField() {
  if (!editingField.value.fieldCode.trim()) {
    ElMessage.warning('请输入字段编码')
    return
  }
  if (!editingField.value.fieldName.trim()) {
    ElMessage.warning('请输入字段名称')
    return
  }

  // 检查字段编码是否重复
  const existingIdx = editForm.value.fields.findIndex(
    (f, idx) => f.fieldCode === editingField.value.fieldCode && idx !== editingFieldIdx.value
  )
  if (existingIdx > -1) {
    ElMessage.warning('字段编码已存在')
    return
  }

  if (editingFieldIdx.value === -1) {
    editForm.value.fields.push({ ...editingField.value })
  } else {
    editForm.value.fields[editingFieldIdx.value] = { ...editingField.value }
  }

  fieldDrawerVisible.value = false
  ElMessage.success(editingFieldIdx.value === -1 ? '字段已添加' : '字段已更新')
}

function deleteField(idx) {
  ElMessageBox.confirm('确认删除该字段？', '删除确认', {
    type: 'warning',
  }).then(() => {
    editForm.value.fields.splice(idx, 1)
    ElMessage.success('字段已删除')
  }).catch(() => {})
}

function moveFieldUp(idx) {
  if (idx === 0) return
  const temp = editForm.value.fields[idx]
  editForm.value.fields[idx] = editForm.value.fields[idx - 1]
  editForm.value.fields[idx - 1] = temp
}

function moveFieldDown(idx) {
  if (idx === editForm.value.fields.length - 1) return
  const temp = editForm.value.fields[idx]
  editForm.value.fields[idx] = editForm.value.fields[idx + 1]
  editForm.value.fields[idx + 1] = temp
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">模板分组管理</div>
        <div class="page-desc">管理模板分组及其字段配置，发布后的分组可被模板引用</div>
      </div>
      <el-button type="primary" :icon="'Plus'" @click="openAddDialog">新增分组</el-button>
    </div>

    <!-- 分组列表 -->
    <el-card shadow="never">
      <template #header>
        <span style="font-weight:600">分组列表（{{ groupList.length }} 个）</span>
      </template>

      <el-table :data="groupList" style="width:100%" stripe>
        <el-table-column prop="groupName" label="分组名称" width="200">
          <template #default="{ row }">
            <div style="font-weight:500">{{ row.groupName }}</div>
          </template>
        </el-table-column>
        <el-table-column label="分组类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :color="GROUP_TYPES[row.groupType].color" style="color:#fff" size="small">
              {{ GROUP_TYPES[row.groupType].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="groupDesc" label="分组描述" min-width="200">
          <template #default="{ row }">
            <span style="color:#666">{{ row.groupDesc || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="字段配置" min-width="280">
          <template #default="{ row }">
            <div v-if="row.fields && row.fields.length > 0" style="display:flex;flex-wrap:wrap;gap:4px">
              <el-tag v-for="field in row.fields" :key="field.fieldCode" size="small" type="info">
                {{ field.fieldName }}
              </el-tag>
            </div>
            <span v-else style="color:#ccc">未配置字段</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="GROUP_STATUS[row.status].type" size="small">
              {{ GROUP_STATUS[row.status].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createBy" label="创建人" width="120">
          <template #default="{ row }">
            <span style="color:#666">{{ row.createBy }}</span>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="160">
          <template #default="{ row }">
            <div style="font-size:12px;color:#666">{{ row.updateTime }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 0" link type="primary" size="small" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button v-if="row.status === 1" link type="primary" size="small" @click="openViewDialog(row)">
              查看
            </el-button>
            <el-button v-if="row.status === 0" link type="success" size="small" @click="publishGroup(row)">
              发布
            </el-button>
            <el-button link type="danger" size="small" @click="deleteGroup(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑分组对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="isViewMode ? '查看分组' : (isEditMode ? '编辑分组' : '新增分组')"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分组名称" required>
              <el-input v-model="editForm.groupName" :disabled="isViewMode" placeholder="如：财务综合报表数据组" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item required>
              <template #label>
                <span>分组类型</span>
                <el-tooltip placement="top" effect="light">
                  <template #content>
                    <div style="line-height:1.8;max-width:350px">
                      <div style="margin-bottom:8px">
                        <strong style="color:#1677ff">普通分组：</strong>
                        <div style="color:#666;font-size:13px">分组内的所有模板数据，根据唯一标识进行整合后上传集团数据中台</div>
                      </div>
                      <div>
                        <strong style="color:#722ed1">主从分组：</strong>
                        <div style="color:#666;font-size:13px">与同组其他模板数据合并上传，并进行主从关联校验。主模板必填，从模板可选</div>
                      </div>
                    </div>
                  </template>
                  <el-icon style="color:#999;cursor:help;margin-left:4px"><QuestionFilled /></el-icon>
                </el-tooltip>
              </template>
              <el-select v-model="editForm.groupType" :disabled="isViewMode" style="width:100%">
                <el-option label="普通分组" value="NORMAL" />
                <el-option label="主从分组" value="MASTER_SLAVE" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="分组描述">
          <el-input v-model="editForm.groupDesc" :disabled="isViewMode" type="textarea" :rows="2" placeholder="描述该分组的用途" />
        </el-form-item>

        <el-divider />

        <el-form-item label="字段配置">
          <div style="width:100%">
            <div v-if="!isViewMode" style="margin-bottom:12px">
              <el-button type="primary" size="small" :icon="'Plus'" @click="openAddField">
                添加字段
              </el-button>
              <span style="margin-left:12px;font-size:13px;color:#999">
                已配置 {{ editForm.fields.length }} 个字段
              </span>
            </div>
            <div v-else style="margin-bottom:12px;font-size:13px;color:#666">
              共 {{ editForm.fields.length }} 个字段
            </div>

            <el-table :data="editForm.fields" border size="small" style="width:100%">
              <el-table-column prop="fieldCode" label="字段编码" width="150" />
              <el-table-column prop="fieldName" label="字段名称" width="150" />
              <el-table-column label="字段类型" width="120">
                <template #default="{ row }">
                  {{ FIELD_TYPES[row.fieldType] }}
                </template>
              </el-table-column>
              <el-table-column label="必填" width="80" align="center">
                <template #default="{ row }">
                  <el-icon v-if="row.isRequired" style="color:#52c41a"><Select /></el-icon>
                  <el-icon v-else style="color:#d9d9d9"><Close /></el-icon>
                </template>
              </el-table-column>
              <el-table-column label="敏感" width="80" align="center">
                <template #default="{ row }">
                  <el-icon v-if="row.isSensitive" style="color:#f56c6c"><Lock /></el-icon>
                  <el-icon v-else style="color:#d9d9d9"><Unlock /></el-icon>
                </template>
              </el-table-column>
              <el-table-column prop="remark" label="说明" min-width="150" show-overflow-tooltip />
              <el-table-column v-if="!isViewMode" label="操作" width="180" fixed="right">
                <template #default="{ row, $index }">
                  <el-button link type="primary" size="small" @click="openEditField(row, $index)">
                    编辑
                  </el-button>
                  <el-button link type="info" size="small" @click="moveFieldUp($index)" :disabled="$index === 0">
                    上移
                  </el-button>
                  <el-button link type="info" size="small" @click="moveFieldDown($index)" :disabled="$index === editForm.fields.length - 1">
                    下移
                  </el-button>
                  <el-button link type="danger" size="small" @click="deleteField($index)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form-item>

        <el-divider />

        <el-form-item label="唯一性规则">
          <div style="width:100%">
            <el-alert
              v-if="editForm.fields.length > 0"
              type="info"
              :closable="false"
              show-icon
            >
              <template #title>
                <div style="line-height:1.8">
                  <div style="font-weight:600;margin-bottom:4px">自动生成联合唯一性校验规则</div>
                  <div style="font-size:13px;color:#666">
                    规则描述：{{ generateUniqueRule()?.ruleDesc || '—' }}
                  </div>
                  <div style="font-size:13px;color:#666">
                    错误提示：{{ generateUniqueRule()?.errorMessage || '—' }}
                  </div>
                </div>
              </template>
            </el-alert>
            <el-empty v-else description="请先配置字段，系统将自动生成唯一性规则" :image-size="80" />
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">{{ isViewMode ? '关闭' : '取消' }}</el-button>
        <el-button v-if="!isViewMode" type="primary" @click="saveGroup">保存</el-button>
      </template>
    </el-dialog>

    <!-- 字段编辑抽屉 -->
    <el-drawer
      v-model="fieldDrawerVisible"
      :title="editingFieldIdx === -1 ? '添加字段' : '编辑字段'"
      size="500px"
    >
      <el-form v-if="editingField" :model="editingField" label-width="100px">
        <el-form-item label="字段编码" required>
          <el-input v-model="editingField.fieldCode" placeholder="如：revenue" />
        </el-form-item>
        <el-form-item label="字段名称" required>
          <el-input v-model="editingField.fieldName" placeholder="如：营业收入" />
        </el-form-item>
        <el-form-item label="字段类型" required>
          <el-select v-model="editingField.fieldType" style="width:100%">
            <el-option v-for="(label, key) in FIELD_TYPES" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否必填">
          <el-switch v-model="editingField.isRequired" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="是否敏感">
          <el-switch v-model="editingField.isSensitive" :active-value="1" :inactive-value="0" />
          <div style="font-size:12px;color:#999;margin-top:4px">
            敏感字段导出时需要审批
          </div>
        </el-form-item>
        <el-form-item label="字段说明">
          <el-input v-model="editingField.remark" type="textarea" :rows="3" placeholder="字段的用途说明" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="fieldDrawerVisible = false">取消</el-button>
        <el-button type="primary" @click="saveField">保存</el-button>
      </template>
    </el-drawer>
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
