<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// Mock 自定义规则数据
const customRules = ref([
  {
    id: 1,
    ruleCode: 'SQL_001',
    ruleName: '借贷平衡校验',
    ruleType: 'CUSTOM_SQL',
    sqlTemplate: 'ABS(SUM($1) - SUM($2)) > 0.01',
    paramCount: 2,
    paramNames: ['借方金额字段', '贷方金额字段'],
    errorMessage: '借方金额合计与贷方金额合计不相等',
    isEnabled: 1,
    remark: '校验借贷方金额平衡，$1=借方字段 $2=贷方字段',
    createBy: '系统管理员',
    createTime: '2026-09-01 10:00:00',
    updateTime: '2026-09-01 10:00:00',
  },
  {
    id: 2,
    ruleCode: 'SQL_002',
    ruleName: '金额区间合理性校验',
    ruleType: 'CUSTOM_SQL',
    sqlTemplate: '$1 < 0 OR $1 > 10000000',
    paramCount: 1,
    paramNames: ['金额字段'],
    errorMessage: '金额超出合理范围（0-1000万）',
    isEnabled: 1,
    remark: '校验金额字段是否在合理区间内，$1为金额字段',
    createBy: '系统管理员',
    createTime: '2026-09-10 09:00:00',
    updateTime: '2026-09-10 09:00:00',
  },
  {
    id: 3,
    ruleCode: 'SQL_003',
    ruleName: '日期逻辑校验',
    ruleType: 'CUSTOM_SQL',
    sqlTemplate: '$1 > $2',
    paramCount: 2,
    paramNames: ['开始日期字段', '结束日期字段'],
    errorMessage: '开始日期不能晚于结束日期',
    isEnabled: 1,
    remark: '校验日期逻辑关系，$1为开始日期 $2为结束日期',
    createBy: '系统管理员',
    createTime: '2026-09-12 11:00:00',
    updateTime: '2026-09-12 11:00:00',
  },
])

// 筛选条件
const filterForm = ref({
  ruleName: '',
  isEnabled: '',
})

// 筛选后的数据
const filteredData = computed(() => {
  let list = customRules.value
  if (filterForm.value.ruleName) {
    list = list.filter(r => r.ruleName.includes(filterForm.value.ruleName) || r.ruleCode.includes(filterForm.value.ruleName))
  }
  if (filterForm.value.isEnabled !== '') {
    list = list.filter(r => r.isEnabled === Number(filterForm.value.isEnabled))
  }
  return list
})

function resetFilter() {
  filterForm.value = { ruleName: '', isEnabled: '' }
}

// 编辑弹窗
const dialogVisible = ref(false)
const editingRule = ref(null)
const editingIndex = ref(-1)

function openAddDialog() {
  editingRule.value = {
    id: null,
    ruleCode: '',
    ruleName: '',
    ruleType: 'CUSTOM_SQL',
    sqlTemplate: '',
    paramCount: 1,
    paramNames: ['参数1'],
    errorMessage: '',
    isEnabled: 1,
    remark: '',
  }
  editingIndex.value = -1
  dialogVisible.value = true
}

function openEditDialog(row, index) {
  editingRule.value = { ...row }
  editingIndex.value = index
  dialogVisible.value = true
}

function saveRule() {
  if (!editingRule.value.ruleName) {
    ElMessage.warning('请输入规则名称')
    return
  }
  if (!editingRule.value.sqlTemplate) {
    ElMessage.warning('请输入SQL模板')
    return
  }
  if (!editingRule.value.errorMessage) {
    ElMessage.warning('请输入错误提示')
    return
  }

  if (editingIndex.value === -1) {
    // 新增
    const newId = customRules.value.length > 0 ? Math.max(...customRules.value.map(r => r.id)) + 1 : 1
    const newCode = `SQL_${String(newId).padStart(3, '0')}`
    customRules.value.push({
      ...editingRule.value,
      id: newId,
      ruleCode: newCode,
      createBy: '当前用户',
      createTime: new Date().toLocaleString('zh-CN'),
      updateTime: new Date().toLocaleString('zh-CN'),
    })
    ElMessage.success('规则已添加')
  } else {
    // 编辑
    customRules.value[editingIndex.value] = {
      ...editingRule.value,
      updateTime: new Date().toLocaleString('zh-CN'),
    }
    ElMessage.success('规则已更新')
  }

  dialogVisible.value = false
}

function toggleEnabled(row) {
  row.isEnabled = row.isEnabled === 1 ? 0 : 1
  ElMessage.success(row.isEnabled === 1 ? '规则已启用' : '规则已禁用')
}

function deleteRule(row, index) {
  ElMessageBox.confirm(`确认删除规则「${row.ruleName}」？此操作不可撤销。`, '删除确认', {
    type: 'error',
    confirmButtonText: '确认删除',
  }).then(() => {
    customRules.value.splice(index, 1)
    ElMessage.success('规则已删除')
  }).catch(() => {})
}

// 参数名称管理
function addParamName() {
  if (!editingRule.value.paramNames) {
    editingRule.value.paramNames = []
  }
  editingRule.value.paramNames.push('')
  editingRule.value.paramCount = editingRule.value.paramNames.length
}

function removeParamName(index) {
  editingRule.value.paramNames.splice(index, 1)
  editingRule.value.paramCount = editingRule.value.paramNames.length
}

// 自动统计SQL中的参数个数
function countParams() {
  const sql = editingRule.value.sqlTemplate
  if (!sql) {
    ElMessage.warning('请先输入SQL模板')
    return
  }

  // 提取 $1, $2, $3... 格式的参数
  const regex = /\$(\d+)/g
  const matches = [...sql.matchAll(regex)]
  const params = [...new Set(matches.map(m => parseInt(m[1])))]

  if (params.length === 0) {
    ElMessage.info('未找到参数，请使用 $1, $2, $3... 格式')
  } else {
    const maxParam = Math.max(...params)
    const newParamNames = []
    for (let i = 1; i <= maxParam; i++) {
      newParamNames.push(editingRule.value.paramNames?.[i - 1] || `参数${i}`)
    }
    editingRule.value.paramNames = newParamNames
    editingRule.value.paramCount = maxParam
    ElMessage.success(`已识别 ${maxParam} 个参数`)
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">自定义规则配置</div>
        <div class="page-desc">配置基于SQL的自定义校验规则，供模板选择使用</div>
      </div>
      <el-button type="primary" :icon="'Plus'" @click="openAddDialog">新建规则</el-button>
    </div>

    <!-- 筛选 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filterForm" inline>
        <el-form-item label="规则名称">
          <el-input v-model="filterForm.ruleName" placeholder="规则名称或编码" clearable style="width:200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.isEnabled" placeholder="全部" clearable style="width:110px">
            <el-option label="已启用" :value="1" />
            <el-option label="已禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="'Search'">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="filteredData" stripe style="width:100%">
        <el-table-column prop="ruleCode" label="规则编码" width="120" />
        <el-table-column prop="ruleName" label="规则名称" width="180" />
        <el-table-column label="SQL模板" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">
            <code style="font-size:12px;color:#666">{{ row.sqlTemplate }}</code>
          </template>
        </el-table-column>
        <el-table-column label="参数说明" width="200">
          <template #default="{ row }">
            <div v-for="(name, idx) in row.paramNames" :key="idx" style="font-size:12px;color:#666">
              ${{ idx + 1 }}: {{ name }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled === 1 ? 'success' : 'info'" size="small">
              {{ row.isEnabled === 1 ? '已启用' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createBy" label="创建人" width="100" />
        <el-table-column prop="updateTime" label="更新时间" width="160" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row, $index }">
            <el-button link type="primary" size="small" @click="openEditDialog(row, $index)">编辑</el-button>
            <el-button link :type="row.isEnabled === 1 ? 'warning' : 'success'" size="small" @click="toggleEnabled(row)">
              {{ row.isEnabled === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="danger" size="small" @click="deleteRule(row, $index)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无规则数据" :image-size="60" />
        </template>
      </el-table>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingIndex === -1 ? '新建自定义规则' : '编辑自定义规则'"
      width="700px"
    >
      <el-form v-if="editingRule" :model="editingRule" label-width="100px">
        <el-form-item v-if="editingRule.ruleCode" label="规则编码">
          <span class="readonly-text">{{ editingRule.ruleCode }}</span>
        </el-form-item>

        <el-form-item label="规则名称" required>
          <el-input v-model="editingRule.ruleName" placeholder="请输入规则名称" style="width:100%" />
        </el-form-item>

        <el-form-item label="SQL模板" required>
          <el-input
            v-model="editingRule.sqlTemplate"
            type="textarea"
            :rows="6"
            placeholder="输入WHERE条件表达式，使用 $1, $2, $3... 作为参数占位符&#10;示例1：$1 > 1000000 AND $2 = $3&#10;示例2：ABS(SUM($1) - SUM($2)) > 0.01&#10;示例3：$1 < 0 OR $1 > 10000000"
            style="width:100%"
          />
          <div style="margin-top:8px">
            <el-button size="small" :icon="'MagicStick'" @click="countParams">自动识别参数</el-button>
            <el-alert type="info" :closable="false" style="margin-top:8px">
              <template #default>
                <div style="font-size:12px;line-height:1.6">
                  仅配置 WHERE 条件部分，使用 <code>$1</code>、<code>$2</code>、<code>$3</code>... 格式标记参数位置<br/>
                  系统会自动构建完整SQL：SELECT * FROM temp_data WHERE {你的条件}
                </div>
              </template>
            </el-alert>
          </div>
        </el-form-item>

        <el-form-item label="参数说明">
          <div style="width:100%">
            <div v-for="(name, index) in editingRule.paramNames" :key="index" style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
              <span style="width:40px;color:#666">${{ index + 1 }}:</span>
              <el-input v-model="editingRule.paramNames[index]" placeholder="参数含义说明" style="flex:1" />
              <el-button :icon="'Close'" circle size="small" @click="removeParamName(index)" />
            </div>
            <el-button size="small" :icon="'Plus'" @click="addParamName">添加参数</el-button>
          </div>
        </el-form-item>

        <el-form-item label="错误提示" required>
          <el-input
            v-model="editingRule.errorMessage"
            placeholder="校验不通过时展示给用户的提示"
            style="width:100%"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-radio-group v-model="editingRule.isEnabled">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="editingRule.remark"
            type="textarea"
            :rows="2"
            placeholder="规则说明"
            style="width:100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRule">保存</el-button>
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
.filter-card {
  margin-bottom: 16px;
}
.readonly-text {
  color: #606266;
  font-family: monospace;
}
code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}
</style>
