<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../../stores/user.js'
import { mockApprovalFlows, ROLES, NODE_TYPES, TIMEOUT_ACTION_OPTIONS, REMINDER_TYPES, FLOW_STATUS } from '../../mock/approvalFlow.js'

const userStore = useUserStore()

// Mock 审批流程模板数据
const flowTemplates = ref([...mockApprovalFlows])

// 模拟审批人列表
const availableApprovers = ref([
  { userId: 'user001', userName: '张三', deptName: '财务部' },
  { userId: 'user002', userName: '李四', deptName: '财务部' },
  { userId: 'user003', userName: '王五', deptName: '审计部' },
  { userId: 'user004', userName: '赵六', deptName: '审计部' },
  { userId: 'user005', userName: '钱七', deptName: '数据中心' },
])

// 筛选条件
const filterForm = ref({
  flowName: '',
  status: '',
})

const filteredData = computed(() => {
  let list = flowTemplates.value
  if (filterForm.value.flowName) {
    list = list.filter(f => f.flowName.includes(filterForm.value.flowName) || f.flowCode.includes(filterForm.value.flowName))
  }
  if (filterForm.value.status !== '') {
    list = list.filter(f => f.status === Number(filterForm.value.status))
  }
  return list
})

function resetFilter() {
  filterForm.value = { flowName: '', status: '' }
}

// 业务域选项
const BIZ_DOMAINS = {
  FINANCE: '财务域',
  PRODUCTION: '生产域',
  SALES: '销售域',
  SUPPLY: '供应链域',
}

// 编辑弹窗
const dialogVisible = ref(false)
const editingFlow = ref(null)
const editingIndex = ref(-1)

function openAddDialog() {
  editingFlow.value = {
    id: null,
    flowCode: '',
    flowName: '',
    status: 0,
    nodes: [
      {
        nodeId: `node_${Date.now()}`,
        nodeName: '审批节点1',
        nodeType: 'ROLE',
        nodeOrder: 1,
        assignType: 'ROLE',
        assignValue: 'UNIT_ADMIN',
        timeoutHours: 24,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP'],
      }
    ],
    remark: '',
  }
  editingIndex.value = -1
  dialogVisible.value = true
}

function openEditDialog(row, index) {
  editingFlow.value = JSON.parse(JSON.stringify(row))
  editingIndex.value = index
  dialogVisible.value = true
}

function saveFlow() {
  if (!editingFlow.value.flowName) {
    ElMessage.warning('请输入流程名称')
    return
  }
  if (editingFlow.value.nodes.length === 0) {
    ElMessage.warning('至少需要一个审批节点')
    return
  }

  // 校验节点配置
  for (let i = 0; i < editingFlow.value.nodes.length; i++) {
    const node = editingFlow.value.nodes[i]
    if (!node.nodeName) {
      ElMessage.warning(`第 ${i + 1} 个节点名称不能为空`)
      return
    }
    // 只有非"自定义审批人"类型才需要验证 assignValue
    if (node.nodeType !== 'MANUAL_SELECT' && !node.assignValue) {
      ElMessage.warning(`第 ${i + 1} 个节点未配置审批人`)
      return
    }
  }

  if (editingIndex.value === -1) {
    // 新增
    const newId = flowTemplates.value.length > 0 ? Math.max(...flowTemplates.value.map(f => f.id)) + 1 : 1
    const newCode = `FLOW_${String(newId).padStart(3, '0')}`
    flowTemplates.value.push({
      ...editingFlow.value,
      id: newId,
      flowCode: newCode,
      createBy: '当前用户',
      createTime: new Date().toLocaleString('zh-CN'),
      updateTime: new Date().toLocaleString('zh-CN'),
    })
    ElMessage.success('流程已添加')
  } else {
    // 编辑
    flowTemplates.value[editingIndex.value] = {
      ...editingFlow.value,
      updateTime: new Date().toLocaleString('zh-CN'),
    }
    ElMessage.success('流程已更新')
  }

  dialogVisible.value = false
}

function toggleStatus(row) {
  if (row.status === 1) {
    ElMessageBox.confirm('停用后，使用此流程的模板将无法创建新单据，确认停用？', '停用确认', {
      type: 'warning',
      confirmButtonText: '确认停用',
    }).then(() => {
      row.status = 2
      ElMessage.success('流程已停用')
    }).catch(() => {})
  } else {
    row.status = 1
    ElMessage.success('流程已启用')
  }
}

function deleteFlow(row, index) {
  ElMessageBox.confirm(`确认删除流程「${row.flowName}」？此操作不可撤销。`, '删除确认', {
    type: 'error',
    confirmButtonText: '确认删除',
  }).then(() => {
    flowTemplates.value.splice(index, 1)
    ElMessage.success('流程已删除')
  }).catch(() => {})
}

function copyFlow(row) {
  const copied = JSON.parse(JSON.stringify(row))
  copied.id = null
  copied.flowCode = ''
  copied.flowName = `${row.flowName}（副本）`
  copied.status = 0
  editingFlow.value = copied
  editingIndex.value = -1
  dialogVisible.value = true
}

// 节点管理
function addNode() {
  const newOrder = editingFlow.value.nodes.length + 1
  editingFlow.value.nodes.push({
    nodeId: `node_${Date.now()}`,
    nodeName: `审批节点${newOrder}`,
    nodeType: 'ROLE',
    nodeOrder: newOrder,
    assignType: 'ROLE',
    assignValue: '',
    timeoutHours: 24,
    autoPass: false,
    timeoutAction: 'NOTIFY',
    reminderTypes: ['IN_APP'],
  })
}

function removeNode(index) {
  if (editingFlow.value.nodes.length === 1) {
    ElMessage.warning('至少需要保留一个审批节点')
    return
  }
  editingFlow.value.nodes.splice(index, 1)
  // 重新排序
  editingFlow.value.nodes.forEach((node, idx) => {
    node.nodeOrder = idx + 1
  })
}

function moveNode(index, direction) {
  const target = index + direction
  if (target < 0 || target >= editingFlow.value.nodes.length) return
  const temp = editingFlow.value.nodes[index]
  editingFlow.value.nodes[index] = editingFlow.value.nodes[target]
  editingFlow.value.nodes[target] = temp
  // 重新排序
  editingFlow.value.nodes.forEach((node, idx) => {
    node.nodeOrder = idx + 1
  })
}

// 获取用户名称
function getUserName(userId) {
  const user = availableApprovers.value.find(u => u.userId === userId)
  return user ? user.userName : userId
}

// 审批类型变化时清空 assignValue
function onNodeTypeChange(node) {
  // 切换审批类型时清空之前的 assignValue，避免显示错误的值
  node.assignValue = ''
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">审批流程模板管理</div>
        <div class="page-desc">配置可复用的审批流程模板，供补录模板绑定使用</div>
      </div>
      <el-button type="primary" :icon="'Plus'" @click="openAddDialog">新建流程</el-button>
    </div>

    <!-- 筛选 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filterForm" inline>
        <el-form-item label="流程名称">
          <el-input v-model="filterForm.flowName" placeholder="流程名称或编码" clearable style="width:200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable style="width:110px">
            <el-option v-for="(v, k) in FLOW_STATUS" :key="k" :label="v.label" :value="Number(k)" />
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
        <el-table-column prop="flowCode" label="流程编码" width="120" />
        <el-table-column prop="flowName" label="流程名称" width="200" />
        <el-table-column label="审批节点" min-width="400">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <el-tag v-for="(node, idx) in row.nodes" :key="idx" size="small" type="primary">
                <span v-if="node.nodeType === 'MANUAL_SELECT'">
                  {{ node.nodeName }}（手动指定人员）
                </span>
                <span v-else-if="node.nodeType === 'FIXED_USER'">
                  {{ node.nodeName }}（{{ getUserName(node.assignValue) }}）
                </span>
                <span v-else>
                  {{ node.nodeName }}（{{ ROLES[node.assignValue] }}）
                </span>
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="FLOW_STATUS[row.status].type" size="small">
              {{ FLOW_STATUS[row.status].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createBy" label="创建人" width="100" />
        <el-table-column prop="updateTime" label="更新时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row, $index }">
            <el-button link type="primary" size="small" @click="openEditDialog(row, $index)">编辑</el-button>
            <el-button
              link
              :type="row.status === 1 ? 'warning' : 'success'"
              size="small"
              @click="toggleStatus(row)"
            >
              {{ row.status === 1 ? '停用' : '启用' }}
            </el-button>
            <el-button link type="danger" size="small" @click="deleteFlow(row, $index)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无流程数据" :image-size="60" />
        </template>
      </el-table>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingIndex === -1 ? '新建审批流程' : '编辑审批流程'"
      width="800px"
      destroy-on-close
    >
      <el-form v-if="editingFlow" :model="editingFlow" label-width="100px">
        <el-form-item v-if="editingFlow.flowCode" label="流程编码">
          <span class="readonly-text">{{ editingFlow.flowCode }}</span>
        </el-form-item>

        <el-form-item label="流程名称" required>
          <el-input v-model="editingFlow.flowName" placeholder="请输入流程名称" style="width:100%" />
        </el-form-item>

        <el-divider content-position="left">审批节点配置</el-divider>

        <div style="margin-bottom:16px">
          <el-button size="small" :icon="'Plus'" @click="addNode">添加节点</el-button>
          <el-alert type="info" :closable="false" style="margin-top:8px">
            <template #default>
              <div style="font-size:12px">节点将按顺序执行，每个节点审批通过后进入下一节点</div>
            </template>
          </el-alert>
        </div>

        <div v-for="(node, index) in editingFlow.nodes" :key="node.nodeId" class="node-config-card">
          <div class="node-header">
            <span class="node-order">第 {{ index + 1 }} 级</span>
            <div class="node-actions">
              <el-button
                v-if="index > 0"
                :icon="'ArrowUp'"
                circle
                size="small"
                @click="moveNode(index, -1)"
              />
              <el-button
                v-if="index < editingFlow.nodes.length - 1"
                :icon="'ArrowDown'"
                circle
                size="small"
                @click="moveNode(index, 1)"
              />
              <el-button :icon="'Close'" circle size="small" @click="removeNode(index)" />
            </div>
          </div>

          <el-form :model="node" label-width="100px" style="margin-top:12px">
            <el-form-item label="节点名称" required>
              <el-input v-model="node.nodeName" placeholder="如：单位管理员审批" style="width:100%" />
            </el-form-item>

            <el-form-item label="审批类型" required>
              <el-radio-group v-model="node.nodeType" @change="onNodeTypeChange(node)">
                <el-radio value="ROLE">
                  指定角色
                  <el-tooltip
                    content="审批时自动分配给单据所属单位的该角色人员"
                    placement="top"
                  >
                    <el-icon style="margin-left:4px;color:#909399;cursor:help"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </el-radio>
                <el-radio value="FIXED_USER">
                  固定审批人
                  <el-tooltip
                    content="流程配置时直接指定固定的审批人，所有使用该流程的单据都由该人审批"
                    placement="top"
                  >
                    <el-icon style="margin-left:4px;color:#909399;cursor:help"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </el-radio>
                <el-radio value="MANUAL_SELECT">
                  自定义审批人
                  <el-tooltip
                    content="单据创建时由创建人指定本组织下的具体审批人"
                    placement="top"
                  >
                    <el-icon style="margin-left:4px;color:#909399;cursor:help"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="node.nodeType === 'ROLE'" label="审批角色" required>
              <el-select v-model="node.assignValue" placeholder="选择审批角色" style="width:200px">
                <el-option v-for="(label, key) in ROLES" :key="key" :label="label" :value="key" />
              </el-select>
            </el-form-item>

            <el-form-item v-if="node.nodeType === 'FIXED_USER'" label="固定审批人" required>
              <el-select v-model="node.assignValue" placeholder="选择固定审批人" style="width:300px" filterable>
                <el-option
                  v-for="user in availableApprovers"
                  :key="user.userId"
                  :label="`${user.userName}（${user.deptName}）`"
                  :value="user.userId"
                >
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span>{{ user.userName }}</span>
                    <el-tag size="small" type="info" effect="plain">{{ user.deptName }}</el-tag>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="超时时间">
              <el-input-number v-model="node.timeoutHours" :min="1" :max="720" style="width:140px" />
              <span style="margin-left:8px">小时</span>
            </el-form-item>

            <el-form-item label="超时策略">
              <el-radio-group v-model="node.timeoutAction">
                <el-radio value="NOTIFY">仅提醒</el-radio>
                <el-radio value="AUTO_PASS">自动通过</el-radio>
                <el-radio value="AUTO_REJECT">自动驳回</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="审批人提醒">
              <el-checkbox-group v-model="node.reminderTypes">
                <el-checkbox value="IN_APP">站内提醒</el-checkbox>
                <el-checkbox value="SMS">短信提醒</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-form>
        </div>

        <el-form-item label="流程说明">
          <el-input
            v-model="editingFlow.remark"
            type="textarea"
            :rows="3"
            placeholder="描述此流程的适用场景和注意事项"
            style="width:100%"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-radio-group v-model="editingFlow.status">
            <el-radio :value="0">草稿</el-radio>
            <el-radio :value="1">启用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveFlow">保存</el-button>
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

.node-config-card {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  background: #fafafa;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.node-order {
  font-weight: 600;
  color: #1677ff;
  font-size: 14px;
}

.node-actions {
  display: flex;
  gap: 4px;
}
</style>
