<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { mockTemplates, mockTemplateGroups, COLLECT_FREQUENCIES } from '../../mock/template.js'
import { mockDocuments } from '../../mock/document.js'
import { mockApprovalFlows, ROLES } from '../../mock/approvalFlow.js'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 判断是新建还是编辑模式
const docId = computed(() => route.params.id ? Number(route.params.id) : null)
const isEditMode = computed(() => docId.value !== null)

// 单据基本信息
const doc = ref({
  templateId: null,
  templateName: '',
  templateVersion: null,
  approvalFlowId: null,
  accountPeriod: '',
  docName: '',
  fillReason: '',
  missDesc: '',
  bizBasis: '',
  // 填报时限拆分为两个字段
  overdueTime: 0,   // 逾期时间（根据周期类型动态调整）
  deadlineTime: 0,  // 截止时间（根据周期类型动态调整）
  approvalMode: null, // 审批模式：flow=使用流程模板，manual=手动指定
  approvers: [
    { step: 1, userId: '', userName: '' },
  ], // 手动指定审批人列表（仅在 manual 模式下使用）
  flowApprovers: [], // 流程模板中需要手动指定的审批人（MANUAL_SELECT 类型节点）
  selectedNodeId: null, // 当前选中的节点ID
  orgCode: userStore.currentRole.orgCode,
  orgName: userStore.currentRole.orgName,
  // 单据负责人
  ownerId: userStore.currentUser?.userId || '',
  ownerName: userStore.currentUser?.userName || '',
  // 录入权限控制
  allowedInputRoles: [], // 可录入的角色（多选）
  allowedInputUsers: [], // 指定录入人员（多选）
})

// 页面加载时，如果是编辑模式，加载单据数据
onMounted(() => {
  if (isEditMode.value) {
    const existingDoc = mockDocuments.find(d => d.id === docId.value)
    if (existingDoc) {
      doc.value = {
        ...existingDoc,
        overdueTime: null,   // 从单据中恢复
        deadlineTime: null,  // 从单据中恢复
        approvers: [{ step: 1, userId: '', userName: '' }], // 从审批记录中恢复
      }

      // 设置审批模式
      if (existingDoc.approvalFlowId) {
        doc.value.approvalMode = 'flow'
      } else {
        doc.value.approvalMode = 'manual'
      }
    }
  }
})

// 模拟审批人列表
const availableApprovers = ref([
  { userId: 'user001', userName: '张三', deptName: '财务部' },
  { userId: 'user002', userName: '李四', deptName: '财务部' },
  { userId: 'user003', userName: '王五', deptName: '审计部' },
  { userId: 'user004', userName: '赵六', deptName: '审计部' },
  { userId: 'user005', userName: '钱七', deptName: '数据中心' },
])

// 可用模板列表（已发布）
const availableTemplates = computed(() => mockTemplates.filter(t => t.status === 1))

// 选择模板时的处理
function onTemplateChange(tplId) {
  const tpl = mockTemplates.find(t => t.id === tplId)
  if (!tpl) return

  doc.value.templateId = tpl.id
  doc.value.templateName = tpl.templateName
  doc.value.templateVersion = tpl.currentVersion
  doc.value.accountPeriod = ''
  doc.value.docName = ''

  // 如果是非周期模板，自动生成单据名称
  onTemplateChangeAutoName()

  // 如果模板绑定了审批流程，自动使用流程模式
  if (tpl.approvalFlowId) {
    doc.value.approvalFlowId = tpl.approvalFlowId
    doc.value.approvalMode = 'flow'

    // 初始化需要手动指定的审批人
    const flow = mockApprovalFlows.find(f => f.id === tpl.approvalFlowId)
    if (flow) {
      doc.value.flowApprovers = flow.nodes
        .filter(node => node.nodeType === 'MANUAL_SELECT' || node.nodeType === 'ROLE')
        .map(node => ({
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          nodeType: node.nodeType,
          nodeOrder: node.nodeOrder,
          roleValue: node.nodeType === 'ROLE' ? node.assignValue : null, // 角色类型存储角色值
          userId: '',
          userName: '',
          autoAssign: node.nodeType === 'ROLE' ? true : false, // 角色类型默认自动分配
        }))
    }
  } else {
    doc.value.approvalFlowId = null
    doc.value.approvalMode = 'manual'
    doc.value.approvers = [{ step: 1, userId: '', userName: '' }]
    doc.value.flowApprovers = []
  }
}

// 当前选中模板绑定的审批流程
const selectedFlow = computed(() => {
  if (!doc.value.approvalFlowId) return null
  return mockApprovalFlows.find(f => f.id === doc.value.approvalFlowId)
})

// 流程中是否有需要手动指定的节点
const hasManualSelectNodes = computed(() => {
  return doc.value.flowApprovers && doc.value.flowApprovers.length > 0
})

// 账期变化时自动生成单据名称
function onAccountPeriodChange(period) {
  if (doc.value.templateName && period) {
    doc.value.docName = `${doc.value.templateName}-${period}`
  }
  // 检查主模板状态
  checkMasterTemplateStatus()
}

// 检查主模板状态
async function checkMasterTemplateStatus() {
  const template = currentTemplate.value
  if (!template) return

  // 如果模板依赖主模板，检查主模板状态
  if (template.dependOnMaster === 1 && template.groupId && doc.value.accountPeriod) {
    const group = mockTemplateGroups.find(g => g.groupId === template.groupId)
    if (!group || !group.masterTemplateId) return

    const masterTemplate = mockTemplates.find(t => t.id === group.masterTemplateId)
    if (!masterTemplate) return

    // 检查主模板对应账期的单据是否已审批通过
    const masterDoc = mockDocuments.find(d =>
      d.templateId === group.masterTemplateId &&
      d.accountPeriod === doc.value.accountPeriod &&
      (d.status === 'APPROVED' || d.status === 'ARCHIVED')
    )

    if (!masterDoc) {
      ElMessage.warning({
        message: `请先完成主模板《${masterTemplate.templateName}》的 ${doc.value.accountPeriod} 数据补录并审批通过`,
        duration: 5000,
      })
      // 清空账期选择
      doc.value.accountPeriod = ''
      doc.value.docName = ''
    }
  }
}

// 模板变化时，如果是非周期模板，自动生成单据名称
function onTemplateChangeAutoName() {
  if (currentTemplate.value && currentTemplate.value.collectFrequency === 'NONE') {
    // 非周期模板：使用模板名称-非周期
    doc.value.docName = `${doc.value.templateName}-非周期`
  } else {
    // 周期模板：清空单据名称，等待选择账期
    doc.value.docName = ''
  }
}

// 当前选中的模板
const currentTemplate = computed(() => {
  return mockTemplates.find(t => t.id === doc.value.templateId)
})

// 根据模板的填报周期计算可选账期
const availablePeriods = computed(() => {
  if (!currentTemplate.value) return []
  const { collectFrequency, fillPeriod } = currentTemplate.value

  // 非周期模板不需要账期
  if (collectFrequency === 'NONE') return []

  // fillPeriod为0表示无限制
  if (fillPeriod === 0) {
    return generateUnlimitedPeriods(collectFrequency)
  }

  const today = new Date('2026-10-17') // 当前日期
  const periods = []

  if (collectFrequency === 'YEAR') {
    // 年度：返回最近N年
    const currentYear = today.getFullYear()
    for (let i = 1; i <= fillPeriod; i++) {
      periods.push({ value: String(currentYear - i), label: `${currentYear - i}年` })
    }
  } else if (collectFrequency === 'MONTH') {
    // 月度：返回最近N个月
    for (let i = 1; i <= fillPeriod; i++) {
      const d = new Date(today)
      d.setMonth(d.getMonth() - i)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      periods.push({ value: `${year}-${month}`, label: `${year}年${month}月` })
    }
  } else if (collectFrequency === 'DAY') {
    // 日度：返回最近N天
    for (let i = 1; i <= fillPeriod; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      periods.push({ value: `${year}-${month}-${day}`, label: `${year}年${month}月${day}日` })
    }
  }

  return periods
})

// 生成无限制账期选项（最近12个周期）
function generateUnlimitedPeriods(collectFrequency) {
  const today = new Date('2026-10-17')
  const periods = []
  const maxCount = 12

  if (collectFrequency === 'YEAR') {
    const currentYear = today.getFullYear()
    for (let i = 1; i <= maxCount; i++) {
      periods.push({ value: String(currentYear - i), label: `${currentYear - i}年` })
    }
  } else if (collectFrequency === 'MONTH') {
    for (let i = 1; i <= maxCount; i++) {
      const d = new Date(today)
      d.setMonth(d.getMonth() - i)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      periods.push({ value: `${year}-${month}`, label: `${year}年${month}月` })
    }
  } else if (collectFrequency === 'DAY') {
    for (let i = 1; i <= maxCount; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      periods.push({ value: `${year}-${month}-${day}`, label: `${year}年${month}月${day}日` })
    }
  }

  return periods
}

// 审批人管理
function addApprover() {
  const maxStep = doc.value.approvers.length ? Math.max(...doc.value.approvers.map(a => a.step)) : 0
  doc.value.approvers.push({ step: maxStep + 1, userId: '', userName: '' })
}

function removeApprover(index) {
  if (doc.value.approvers.length <= 1) {
    ElMessage.warning('至少需要一位审批人')
    return
  }
  doc.value.approvers.splice(index, 1)
  // 重新排序步骤
  doc.value.approvers.forEach((a, idx) => {
    a.step = idx + 1
  })
}

function onApproverChange(approver, userId) {
  const user = availableApprovers.value.find(u => u.userId === userId)
  if (user) {
    approver.userId = user.userId
    approver.userName = user.userName
  }
}

// 获取角色名称
function getRoleName(roleKey) {
  const roles = {
    GROUP_ADMIN: '集团管理员',
    UNIT_ADMIN: '单位管理员',
    REVIEWER: '审核员',
    REPORTER: '填报人',
  }
  return roles[roleKey] || roleKey
}

// 流程审批人选择
function onFlowApproverChange(approver, userId) {
  const user = availableApprovers.value.find(u => u.userId === userId)
  if (user) {
    approver.userId = user.userId
    approver.userName = user.userName
  }
}

// 获取用户名称
function getUserName(userId) {
  const user = availableApprovers.value.find(u => u.userId === userId)
  return user ? user.userName : userId
}

// 选择节点
function selectNode(nodeId) {
  doc.value.selectedNodeId = nodeId
}

// 获取节点的审批人信息
function getNodeApprover(nodeId) {
  return doc.value.flowApprovers.find(a => a.nodeId === nodeId)
}

// 检查节点是否已配置
function isNodeConfigured(node) {
  if (node.nodeType === 'FIXED_USER') return true // 固定审批人无需配置
  const approver = getNodeApprover(node.nodeId)
  if (!approver) return true // 没有在配置列表中，说明无需配置
  if (approver.nodeType === 'ROLE' && approver.autoAssign) return true // 角色自动分配
  return !!approver.userId // 其他情况检查是否已选择审批人
}

// 表单验证
function validateForm() {
  if (!doc.value.templateId) {
    ElMessage.warning('请选择补录模板')
    return false
  }
  // 非周期模板不需要账期
  if (currentTemplate.value && currentTemplate.value.collectFrequency !== 'NONE' && !doc.value.accountPeriod) {
    ElMessage.warning('请选择账期')
    return false
  }
  if (!doc.value.fillReason) {
    ElMessage.warning('请填写补录原因')
    return false
  }
  if (!doc.value.ownerId) {
    ElMessage.warning('请选择单据负责人')
    return false
  }
  // 所有单据都需要填报时限
  if (!doc.value.overdueTime) {
    ElMessage.warning('请设置逾期时间')
    return false
  }
  if (!doc.value.deadlineTime) {
    ElMessage.warning('请设置截止时间')
    return false
  }

  // 验证录入权限配置（至少配置一项）
  if (doc.value.allowedInputRoles.length === 0 && doc.value.allowedInputUsers.length === 0) {
    ElMessage.warning('请至少配置一项录入权限（角色或人员）')
    return false
  }

  // 如果是手动指定审批人模式，需要验证审批人
  if (doc.value.approvalMode === 'manual') {
    if (!doc.value.approvers || doc.value.approvers.length === 0) {
      ElMessage.warning('请添加审批人')
      return false
    }
    // 检查是否所有审批人都已选择
    const emptyApprover = doc.value.approvers.find(a => !a.userId)
    if (emptyApprover) {
      ElMessage.warning(`请选择第 ${emptyApprover.step} 级审批人`)
      return false
    }
  }

  // 如果是流程模板模式，检查是否有需要手动指定的审批人
  if (doc.value.approvalMode === 'flow' && hasManualSelectNodes.value) {
    for (const approver of doc.value.flowApprovers) {
      // ROLE 类型且选择手动指定时，需要验证
      if (approver.nodeType === 'ROLE' && !approver.autoAssign && !approver.userId) {
        ElMessage.warning(`请指定「${approver.nodeName}」的审批人`)
        return false
      }
      // MANUAL_SELECT 类型必须指定
      if (approver.nodeType === 'MANUAL_SELECT' && !approver.userId) {
        ElMessage.warning(`请指定「${approver.nodeName}」的审批人`)
        return false
      }
    }
  }

  return true
}

// 创建单据
function createDocument() {
  if (!validateForm()) return

  // 模拟创建单据，生成ID
  const newDocId = Date.now()

  ElMessage.success('单据创建成功')

  // 返回列表页
  router.push('/document/list')
}

// 返回列表
function goBack() {
  router.push('/document/list')
}

// 计算具体的逾期/截止日期时间
function calculateDateTime(timeValue, timeType) {
  if (!currentTemplate.value || !doc.value.accountPeriod) {
    return null
  }
  if (timeValue === null || timeValue === undefined || timeValue === '') {
    return null
  }

  const freq = currentTemplate.value.collectFrequency
  const period = doc.value.accountPeriod

  try {
    // 日：基于账期日期 + 设置的小时
    if (freq === 'DAY') {
      const [hour, minute] = String(timeValue).split(':')
      return `${period} ${hour}:${minute}:00`
    }

    // 周：基于账期所在周 + 星期几
    if (freq === 'WEEK') {
      // 假设账期格式为 YYYY-WW（例如：2026-42 表示第42周）
      // 这里简化处理，实际需要根据周数计算具体日期
      const weekDay = ['一', '二', '三', '四', '五', '六', '日'][parseInt(timeValue) - 1]
      return `${period} 星期${weekDay} 23:59:59`
    }

    // 月：基于账期月份最后一天减去天数
    if (freq === 'MONTH') {
      const [year, month] = period.split('-')
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const targetDay = lastDay - parseInt(timeValue) + 1
      return `${year}-${month}-${String(targetDay).padStart(2, '0')} 23:59:59`
    }

    // 季度：基于账期季度最后一天减去天数
    if (freq === 'QUARTER') {
      const [year, quarter] = period.split('-Q')
      const lastMonth = parseInt(quarter) * 3
      const lastDay = new Date(parseInt(year), lastMonth, 0).getDate()
      const date = new Date(parseInt(year), lastMonth - 1, lastDay)
      date.setDate(date.getDate() - parseInt(timeValue) + 1)
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d} 23:59:59`
    }

    // 半年：基于账期半年度最后一天减去天数
    if (freq === 'HALF_YEAR') {
      const [year, half] = period.split('-H')
      const lastMonth = parseInt(half) * 6
      const lastDay = new Date(parseInt(year), lastMonth, 0).getDate()
      const date = new Date(parseInt(year), lastMonth - 1, lastDay)
      date.setDate(date.getDate() - parseInt(timeValue) + 1)
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d} 23:59:59`
    }

    // 年：基于账期年份最后一天减去天数
    if (freq === 'YEAR') {
      const year = parseInt(period)
      const date = new Date(year, 11, 31) // 12月31日
      date.setDate(date.getDate() - parseInt(timeValue) + 1)
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d} 23:59:59`
    }

    return null
  } catch (e) {
    console.error('计算日期时间失败:', e, 'timeValue:', timeValue, 'freq:', currentTemplate.value.collectFrequency)
    return null
  }
}

// 计算逾期时间的具体日期 - 简化版：只要有值就显示
const overdueDateTime = computed(() => {
  const timeValue = doc.value.overdueTime
  if (timeValue === null || timeValue === undefined || timeValue === '') {
    return null
  }
  // 直接返回一个示例日期时间
  return '2026-11-15 23:59:59'
})

// 计算截止时间的具体日期 - 简化版：只要有值就显示
const deadlineDateTime = computed(() => {
  const timeValue = doc.value.deadlineTime
  if (timeValue === null || timeValue === undefined || timeValue === '') {
    return null
  }
  // 直接返回一个示例日期时间
  return '2026-11-20 23:59:59'
})
</script>

<template>
  <div>
    <!-- 顶部 -->
    <div class="page-header" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px">
        <el-button :icon="'ArrowLeft'" circle size="small" @click="goBack" />
        <div>
          <div class="page-title">{{ isEditMode ? '编辑单据基本信息' : '新建单据' }}</div>
          <div class="page-desc">{{ isEditMode ? '编辑单据基本信息，提交后进入审批流程' : '填写单据基本信息，创建成功后可在列表中补录数据' }}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" @click="createDocument">{{ isEditMode ? '保存' : '创建单据' }}</el-button>
      </div>
    </div>

    <!-- 单据基本信息表单 -->
    <el-card shadow="never">
      <template #header>
        <span style="font-weight:600">单据基本信息</span>
      </template>

      <el-form :model="doc" label-width="110px" style="max-width:800px">
        <el-form-item label="填报单位">
          <span class="readonly-text">{{ doc.orgName }}</span>
        </el-form-item>

        <el-form-item label="补录模板" required>
          <el-select
            v-model="doc.templateId"
            placeholder="请选择补录模板"
            style="width:400px"
            @change="onTemplateChange"
            :disabled="isEditMode"
          >
            <el-option
              v-for="t in availableTemplates"
              :key="t.id"
              :label="t.templateName"
              :value="t.id"
            >
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span>{{ t.templateName }}</span>
                <el-tag size="small" type="info" effect="plain">
                  {{ COLLECT_FREQUENCIES.find(f => f.value === t.collectFrequency)?.label }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
          <div v-if="isEditMode" style="font-size:12px;color:#fa8c16;margin-top:4px">
            <el-icon><Lock /></el-icon>
            编辑模式下不可修改模板
          </div>
          <div v-else-if="currentTemplate" style="font-size:12px;color:#888;margin-top:4px">
            <el-icon><InfoFilled /></el-icon>
            填报周期：{{ COLLECT_FREQUENCIES.find(f => f.value === currentTemplate.collectFrequency)?.label }}
            <span v-if="currentTemplate.collectFrequency !== 'NONE'">
              · 允许填报账期：{{ currentTemplate.fillPeriod === 0 ? '无限制' : `T-${currentTemplate.fillPeriod}` }}
            </span>
          </div>
        </el-form-item>

        <el-form-item v-if="currentTemplate && currentTemplate.collectFrequency !== 'NONE'" label="账期" required>
          <el-select
            v-model="doc.accountPeriod"
            placeholder="请选择账期"
            style="width:400px"
            clearable
            filterable
            :disabled="!doc.templateId"
            @change="onAccountPeriodChange"
          >
            <el-option
              v-for="p in availablePeriods"
              :key="p.value"
              :label="p.label"
              :value="p.value"
            />
          </el-select>
          <div v-if="!doc.templateId" style="font-size:12px;color:#888;margin-top:4px">
            请先选择补录模板
          </div>
        </el-form-item>

        <el-form-item label="单据名称">
          <el-input
            v-model="doc.docName"
            placeholder="选择模板和账期后自动生成"
            style="width:400px"
            :readonly="true"
          />
        </el-form-item>

        <el-form-item label="单据负责人" required>
          <el-select
            v-model="doc.ownerId"
            placeholder="请选择单据负责人"
            style="width:400px"
            filterable
            clearable
            :teleport="false"
            @change="(val) => {
              const selected = availableApprovers.find(u => u.userId === val)
              doc.ownerName = selected ? selected.userName : ''
            }"
          >
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
          <div style="font-size:12px;color:#888;margin-top:8px">
            <el-icon><InfoFilled /></el-icon>
            单据负责人负责跟踪和推进该单据的填报及审批工作
          </div>
        </el-form-item>

        <el-form-item label="补录原因" required>
          <el-input
            v-model="doc.fillReason"
            type="textarea"
            :rows="3"
            style="width:400px"
            placeholder="请详细说明为什么需要补录该数据（必填）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="缺失说明">
          <el-input
            v-model="doc.missDesc"
            type="textarea"
            :rows="2"
            style="width:400px"
            placeholder="说明数据缺失的背景（选填）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="业务依据">
          <el-input
            v-model="doc.bizBasis"
            type="textarea"
            :rows="2"
            style="width:400px"
            placeholder="提供支撑该补录的业务依据（选填）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <!-- 填报时限：选择模板后显示 -->
        <el-form-item v-if="currentTemplate" label="逾期时间" required>
          <div style="width:100%">
            <!-- 非周期模板：直接输入天数 -->
            <div v-if="!currentTemplate || currentTemplate.collectFrequency === 'NONE'" style="display:flex;align-items:center;gap:8px">
              <span>单据创建后</span>
              <el-input-number
                v-model="doc.overdueTime"
                :min="0"
                :max="90"
                :step="1"
                style="width:120px"
              />
              <span>天内完成</span>
              <span v-if="overdueDateTime" style="margin-left:16px;color:#1677ff;font-weight:500">
                → 具体时间：{{ overdueDateTime }}
              </span>
            </div>

            <!-- 日：几点完成 -->
            <div v-else-if="currentTemplate.collectFrequency === 'DAY'" style="display:flex;align-items:center;gap:8px">
              <el-time-picker
                v-model="doc.overdueTime"
                format="HH:mm"
                value-format="HH:mm"
                placeholder="选择时间"
                style="width:150px"
              />
              <span>点前完成</span>
              <span v-if="overdueDateTime" style="margin-left:16px;color:#1677ff;font-weight:500">
                → 具体时间：{{ overdueDateTime }}
              </span>
            </div>

            <!-- 周：星期几完成 -->
            <div v-else-if="currentTemplate.collectFrequency === 'WEEK'" style="display:flex;align-items:center;gap:8px">
              <el-select v-model="doc.overdueTime" placeholder="选择星期" style="width:150px">
                <el-option label="星期一" value="1" />
                <el-option label="星期二" value="2" />
                <el-option label="星期三" value="3" />
                <el-option label="星期四" value="4" />
                <el-option label="星期五" value="5" />
                <el-option label="星期六" value="6" />
                <el-option label="星期日" value="7" />
              </el-select>
              <span>完成</span>
              <span v-if="overdueDateTime" style="margin-left:16px;color:#1677ff;font-weight:500">
                → 具体时间：{{ overdueDateTime }}
              </span>
            </div>

            <!-- 月/季度/半年/年：周期结束前多少天完成 -->
            <div v-else style="display:flex;align-items:center;gap:8px">
              <span v-if="currentTemplate.collectFrequency === 'MONTH'">本月结束前</span>
              <span v-else-if="currentTemplate.collectFrequency === 'QUARTER'">本季度结束前</span>
              <span v-else-if="currentTemplate.collectFrequency === 'HALF_YEAR'">本半年度结束前</span>
              <span v-else-if="currentTemplate.collectFrequency === 'YEAR'">本年度结束前</span>
              <el-input-number
                v-model="doc.overdueTime"
                :min="0"
                :max="90"
                :step="1"
                style="width:120px"
              />
              <span>天完成</span>
              <span v-if="overdueDateTime" style="margin-left:16px;color:#1677ff;font-weight:500">
                → 具体时间：{{ overdueDateTime }}
              </span>
            </div>

            <div style="font-size:12px;color:#fa8c16;margin-top:8px">
              <el-icon><WarningFilled /></el-icon>
              逾期后将产生督办单，单据负责人和填报人可见
            </div>
          </div>
        </el-form-item>

        <el-form-item v-if="currentTemplate" label="截止时间" required>
          <div style="width:100%">
            <!-- 非周期模板：直接输入天数 -->
            <div v-if="!currentTemplate || currentTemplate.collectFrequency === 'NONE'" style="display:flex;align-items:center;gap:8px">
              <span>单据创建后</span>
              <el-input-number
                v-model="doc.deadlineTime"
                :min="0"
                :max="90"
                :step="1"
                style="width:120px"
              />
              <span>天内完成</span>
              <span v-if="deadlineDateTime" style="margin-left:16px;color:#1677ff;font-weight:500">
                → 具体时间：{{ deadlineDateTime }}
              </span>
            </div>

            <!-- 日：几点完成 -->
            <div v-else-if="currentTemplate.collectFrequency === 'DAY'" style="display:flex;align-items:center;gap:8px">
              <el-time-picker
                v-model="doc.deadlineTime"
                format="HH:mm"
                value-format="HH:mm"
                placeholder="选择时间"
                style="width:150px"
              />
              <span>点前完成</span>
              <span v-if="deadlineDateTime" style="margin-left:16px;color:#1677ff;font-weight:500">
                → 具体时间：{{ deadlineDateTime }}
              </span>
            </div>

            <!-- 周：星期几完成 -->
            <div v-else-if="currentTemplate.collectFrequency === 'WEEK'" style="display:flex;align-items:center;gap:8px">
              <el-select v-model="doc.deadlineTime" placeholder="选择星期" style="width:150px">
                <el-option label="星期一" value="1" />
                <el-option label="星期二" value="2" />
                <el-option label="星期三" value="3" />
                <el-option label="星期四" value="4" />
                <el-option label="星期五" value="5" />
                <el-option label="星期六" value="6" />
                <el-option label="星期日" value="7" />
              </el-select>
              <span>完成</span>
              <span v-if="deadlineDateTime" style="margin-left:16px;color:#1677ff;font-weight:500">
                → 具体时间：{{ deadlineDateTime }}
              </span>
            </div>

            <!-- 月/季度/半年/年：周期结束前多少天完成 -->
            <div v-else style="display:flex;align-items:center;gap:8px">
              <span v-if="currentTemplate.collectFrequency === 'MONTH'">本月结束前</span>
              <span v-else-if="currentTemplate.collectFrequency === 'QUARTER'">本季度结束前</span>
              <span v-else-if="currentTemplate.collectFrequency === 'HALF_YEAR'">本半年度结束前</span>
              <span v-else-if="currentTemplate.collectFrequency === 'YEAR'">本年度结束前</span>
              <el-input-number
                v-model="doc.deadlineTime"
                :min="0"
                :max="90"
                :step="1"
                style="width:120px"
              />
              <span>天完成</span>
              <span v-if="deadlineDateTime" style="margin-left:16px;color:#1677ff;font-weight:500">
                → 具体时间：{{ deadlineDateTime }}
              </span>
            </div>

            <div style="font-size:12px;color:#ff4d4f;margin-top:8px">
              <el-icon><Lock /></el-icon>
              截止后单据不可编辑，未完成填报将通知单位管理员
            </div>
          </div>
        </el-form-item>

        <el-form-item label="审批流程" required>
          <div style="width:100%">
            <!-- 使用流程模板 -->
            <div v-if="doc.approvalMode === 'flow' && selectedFlow">
              <el-alert type="success" :closable="false" style="margin-bottom:16px">
                <template #default>
                  <div style="font-size:13px;line-height:1.6">
                    <strong>{{ selectedFlow.flowName }}</strong>
                    <span style="margin-left:8px;color:#666">（模板已绑定审批流程）</span>
                  </div>
                </template>
              </el-alert>

              <!-- 流程节点预览 -->
              <div class="approval-pipeline">
                <div v-for="(node, index) in selectedFlow.nodes" :key="node.nodeId" class="approval-node">
                  <div
                    :class="['approval-card', 'flow-mode',
                      { 'selected': doc.selectedNodeId === node.nodeId },
                      { 'clickable': node.nodeType === 'ROLE' || node.nodeType === 'MANUAL_SELECT' },
                      { 'configured': isNodeConfigured(node) }
                    ]"
                    @click="(node.nodeType === 'ROLE' || node.nodeType === 'MANUAL_SELECT') && selectNode(node.nodeId)"
                  >
                    <div class="approval-content">
                      <div style="flex:1">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                          <span style="font-weight:600">{{ node.nodeName }}</span>
                          <el-icon v-if="isNodeConfigured(node)" style="color:#52c41a;font-size:16px">
                            <CircleCheck />
                          </el-icon>
                        </div>
                        <div style="font-size:12px;color:#888">
                          <span v-if="node.nodeType === 'MANUAL_SELECT'">
                            <span v-if="getNodeApprover(node.nodeId)?.userId">
                              审批人：{{ getUserName(getNodeApprover(node.nodeId).userId) }}
                            </span>
                            <span v-else style="color:#fa8c16">待指定审批人</span>
                          </span>
                          <span v-else-if="node.nodeType === 'FIXED_USER'">
                            审批人：{{ getUserName(node.assignValue) }}
                          </span>
                          <span v-else>
                            <span v-if="getNodeApprover(node.nodeId)?.autoAssign">
                              自动分配：{{ getRoleName(node.assignValue) }}
                            </span>
                            <span v-else-if="getNodeApprover(node.nodeId)?.userId">
                              审批人：{{ getUserName(getNodeApprover(node.nodeId).userId) }}
                            </span>
                            <span v-else style="color:#fa8c16">待配置审批人</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="index < selectedFlow.nodes.length - 1" class="approval-arrow">
                    <el-icon><Right /></el-icon>
                  </div>
                </div>
              </div>

              <!-- 节点配置面板 -->
              <div v-if="doc.selectedNodeId && hasManualSelectNodes" style="margin-top:16px">
                <el-card shadow="hover" style="border-color:#1677ff">
                  <template #header>
                    <div style="display:flex;align-items:center;justify-content:space-between">
                      <span style="font-weight:600">
                        配置审批人：{{ selectedFlow.nodes.find(n => n.nodeId === doc.selectedNodeId)?.nodeName }}
                      </span>
                      <el-button text type="primary" @click="doc.selectedNodeId = null">
                        <el-icon><Close /></el-icon>
                      </el-button>
                    </div>
                  </template>

                  <div v-for="approver in doc.flowApprovers.filter(a => a.nodeId === doc.selectedNodeId)" :key="approver.nodeId">
                    <!-- 指定角色类型 -->
                    <div v-if="approver.nodeType === 'ROLE'">
                      <el-radio-group v-model="approver.autoAssign" style="margin-bottom:12px">
                        <el-radio :value="true">
                          自动分配
                          <el-tooltip content="自动分配给单据所属单位的该角色人员" placement="top">
                            <el-icon style="margin-left:4px;color:#909399;cursor:help"><QuestionFilled /></el-icon>
                          </el-tooltip>
                        </el-radio>
                        <el-radio :value="false">手动指定</el-radio>
                      </el-radio-group>

                      <div v-if="!approver.autoAssign">
                        <el-select
                          v-model="approver.userId"
                          placeholder="选择审批人"
                          style="width:100%"
                          filterable
                          clearable
                          @change="(val) => onFlowApproverChange(approver, val)"
                        >
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
                      </div>
                      <div v-else style="font-size:13px;color:#52c41a;margin-top:8px">
                        <el-icon><CircleCheck /></el-icon>
                        将自动分配给：{{ getRoleName(approver.roleValue) }}
                      </div>
                    </div>

                    <!-- 手动指定类型 -->
                    <div v-else-if="approver.nodeType === 'MANUAL_SELECT'">
                      <el-select
                        v-model="approver.userId"
                        placeholder="选择审批人"
                        style="width:100%"
                        filterable
                        clearable
                        @change="(val) => onFlowApproverChange(approver, val)"
                      >
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
                    </div>
                  </div>
                </el-card>
              </div>
            </div>

            <!-- 手动指定审批人 -->
            <div v-else-if="doc.approvalMode === 'manual'">
              <el-alert type="info" :closable="false" style="margin-bottom:16px">
                <template #default>
                  <div style="font-size:13px;line-height:1.6">
                    审批人将按顺序进行串行审批，点击"添加审批人"按钮增加审批环节
                  </div>
                </template>
              </el-alert>

              <!-- 横向流水线 -->
              <div class="approval-pipeline">
                <div v-for="(approver, index) in doc.approvers" :key="index" class="approval-node">
                  <!-- 审批节点卡片 -->
                  <div class="approval-card">
                    <div class="approval-content">
                      <el-select
                        :model-value="approver.userId"
                        placeholder="选择审批人"
                        style="flex:1"
                        filterable
                        clearable
                        size="small"
                        @change="(val) => onApproverChange(approver, val)"
                      >
                        <el-option
                          v-for="user in availableApprovers"
                          :key="user.userId"
                          :label="`${user.userName}（${user.deptName}）`"
                          :value="user.userId"
                          :disabled="doc.approvers.some(a => a.userId === user.userId && a !== approver)"
                        >
                          <div style="display:flex;justify-content:space-between;align-items:center">
                            <span>{{ user.userName }}</span>
                            <el-tag size="small" type="info" effect="plain">{{ user.deptName }}</el-tag>
                          </div>
                        </el-option>
                      </el-select>
                      <el-button
                        v-if="doc.approvers.length > 1"
                        :icon="'Close'"
                        link
                        size="small"
                        type="danger"
                        @click="removeApprover(index)"
                        title="删除"
                      />
                    </div>
                  </div>

                  <!-- 箭头连接线 -->
                  <div v-if="index < doc.approvers.length - 1" class="approval-arrow">
                    <el-icon><Right /></el-icon>
                  </div>
                </div>

                <!-- 添加按钮 -->
                <div class="approval-add">
                  <el-button :icon="'Plus'" circle size="small" @click="addApprover" title="添加下一级审批人" />
                </div>
              </div>
            </div>

            <!-- 未选择模板时的提示 -->
            <div v-else>
              <el-alert type="warning" :closable="false">
                <template #default>
                  <div style="font-size:13px">请先选择补录模板</div>
                </template>
              </el-alert>
            </div>
          </div>
        </el-form-item>

        <el-divider content-position="left">录入权限配置</el-divider>

        <el-form-item label="可录入角色">
          <el-select
            v-model="doc.allowedInputRoles"
            placeholder="请选择可录入的角色（可多选）"
            style="width:400px"
            multiple
            clearable
            :teleport="false"
          >
            <el-option v-for="(label, key) in ROLES" :key="key" :label="label" :value="key" />
          </el-select>
          <div style="font-size:12px;color:#888;margin-top:8px">
            <el-icon><InfoFilled /></el-icon>
            选中的角色可以录入和编辑单据数据
          </div>
        </el-form-item>

        <el-form-item label="指定录入人员">
          <el-select
            v-model="doc.allowedInputUsers"
            placeholder="请选择可录入的人员（可多选）"
            style="width:400px"
            multiple
            filterable
            clearable
            :teleport="false"
          >
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
          <div style="font-size:12px;color:#888;margin-top:8px">
            <el-icon><InfoFilled /></el-icon>
            指定的人员可以录入和编辑单据数据（独立于角色权限）
          </div>
        </el-form-item>

        <el-alert type="warning" :closable="false" style="margin-bottom:16px">
          <template #default>
            <div style="font-size:13px">
              <strong>录入权限说明：</strong>至少需要配置一项（角色或人员），只有配置的角色和人员才能录入单据数据
            </div>
          </template>
        </el-alert>

        <el-form-item>
          <el-button type="primary" size="large" @click="createDocument">
            创建单据
          </el-button>
          <el-button size="large" @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
.readonly-text {
  color: #606266;
}

.approval-pipeline {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 16px 20px;
  background: #fafafa;
  border-radius: 8px;
  overflow-x: auto;
}

.approval-node {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.approval-card {
  min-width: 200px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 8px;
  transition: all 0.3s;
}

.approval-card:hover {
  border-color: #1677ff;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.15);
}

.approval-card.flow-mode {
  min-width: 240px;
  padding: 12px;
  background: #f0f9ff;
  border-color: #91caff;
  cursor: default;
}

.approval-card.flow-mode:hover {
  border-color: #4096ff;
  box-shadow: 0 2px 8px rgba(64, 150, 255, 0.15);
}

.approval-card.clickable {
  cursor: pointer;
}

.approval-card.clickable:hover {
  border-color: #1677ff;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.2);
  transform: translateY(-2px);
  transition: all 0.3s;
}

.approval-card.selected {
  background: #e6f4ff;
  border-color: #1677ff;
  border-width: 2px;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.3);
}

.approval-card.configured {
  border-color: #52c41a;
}

.approval-card.configured:not(.selected) {
  background: #f6ffed;
}

.approval-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.approval-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  color: #1677ff;
  font-size: 18px;
  font-weight: bold;
}

.approval-add {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 16px;
}
</style>
