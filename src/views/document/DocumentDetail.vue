<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { mockDocuments, mockDocumentData, mockApprovals, DOC_STATUS, SOURCE_CHANNELS } from '../../mock/document.js'
import { mockTemplateFields } from '../../mock/template.js'
import { mockExportApprovals, EXPORT_APPROVAL_STATUS } from '../../mock/exportApproval.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import AttachmentUpload from '../../components/AttachmentUpload.vue'

const route  = useRoute()
const router = useRouter()
const userStore = useUserStore()
const docId  = computed(() => Number(route.params.id))

const doc       = ref(null)
const fields    = ref([])
const dataRows  = ref([])
const approvals = ref([])
const attachments = ref([])

// 纵表还原为行列
function buildRows(rawData, fieldDefs) {
  const rowMap = {}
  rawData.filter(r => r.rowStatus === 1).forEach(r => {
    if (!rowMap[r.rowNo]) rowMap[r.rowNo] = { rowNo: r.rowNo, cells: {}, errors: {} }
    rowMap[r.rowNo].cells[r.fieldCode] = r.fieldValue ?? ''
    if (r.validateStatus === 2 && r.validateError) {
      rowMap[r.rowNo].errors[r.fieldCode] = r.validateError
    }
  })
  return Object.values(rowMap).sort((a, b) => a.rowNo - b.rowNo)
}

onMounted(() => {
  doc.value = { ...mockDocuments.find(d => d.id === docId.value) }
  if (!doc.value.id) return

  let tplFields = mockTemplateFields[doc.value.templateId] || []

  // 如果是从模板单据，需要合并主模板字段
  if (doc.value.masterDocId) {
    const masterDoc = mockDocuments.find(d => d.id === doc.value.masterDocId)
    if (masterDoc) {
      const masterFields = (mockTemplateFields[masterDoc.templateId] || [])
        .filter(f => f.fieldCode !== 'period') // 过滤掉账期字段
        .map(f => ({ ...f, fromMaster: true, isReadonly: true })) // 标记为主模板字段，只读
        .sort((a, b) => a.sortOrder - b.sortOrder) // 主模板字段内部排序

      const slaveFields = tplFields
        .map(f => ({ ...f, fromMaster: false, isReadonly: false }))
        .sort((a, b) => a.sortOrder - b.sortOrder) // 从模板字段内部排序

      // 合并字段：所有主模板字段在前，所有从模板字段在后
      tplFields = [...masterFields, ...slaveFields]
    }
  }

  // 过滤掉 period 字段，因为账期由单据头统一管理
  fields.value = [...tplFields].filter(f => f.fieldCode !== 'period')
  const raw = mockDocumentData[docId.value] || []
  dataRows.value = buildRows(raw, fields.value)
  approvals.value = mockApprovals[docId.value] || []
  // 加载附件（模拟数据）
  if (docId.value === 1006) {
    // 非周期单据，附件分批次
    attachments.value = [
      {
        id: 1,
        batchNo: 1,
        fileName: '投诉记录_第1批_20261015.pdf',
        fileSize: 1024000,
        fileType: 'pdf',
        storagePath: '/uploads/1_投诉记录_第1批.pdf',
        uploadTime: '2026-10-20 09:30:00',
        uploading: false,
      },
      {
        id: 2,
        batchNo: 1,
        fileName: '处理结果截图_批次1.png',
        fileSize: 524288,
        fileType: 'image',
        storagePath: '/uploads/2_处理结果截图_批次1.png',
        uploadTime: '2026-10-20 09:35:00',
        uploading: false,
      },
      {
        id: 3,
        batchNo: 2,
        fileName: '投诉记录_第2批_20261018.pdf',
        fileSize: 856000,
        fileType: 'pdf',
        storagePath: '/uploads/3_投诉记录_第2批.pdf',
        uploadTime: '2026-10-23 14:00:00',
        uploading: false,
      },
      {
        id: 4,
        batchNo: 2,
        fileName: '客户反馈_批次2.docx',
        fileSize: 345600,
        fileType: 'word',
        storagePath: '/uploads/4_客户反馈_批次2.docx',
        uploadTime: '2026-10-23 14:10:00',
        uploading: false,
      },
    ]
  } else {
    // 普通单据，附件不分批次
    attachments.value = [
      {
        id: 1,
        fileName: '财务凭证_202609.pdf',
        fileSize: 1024000,
        fileType: 'pdf',
        storagePath: '/uploads/1_财务凭证_202609.pdf',
        uploadTime: '2026-09-10 14:30:00',
        uploading: false,
      },
      {
        id: 2,
        fileName: '台账截图.png',
        fileSize: 524288,
        fileType: 'image',
        storagePath: '/uploads/2_台账截图.png',
        uploadTime: '2026-09-10 14:32:00',
        uploading: false,
      }
    ]
  }
})

// 关联的原单（如果当前是更正单）
const originDoc = computed(() => {
  if (!doc.value || !doc.value.originDocId) return null
  return mockDocuments.find(d => d.id === doc.value.originDocId)
})

// 关联的更正单（如果当前单已被更正）
const correctionDoc = computed(() => {
  if (!doc.value) return null
  return mockDocuments.find(d => d.originDocId === doc.value.id)
})

// 当前驳回原因
const latestRejectReason = computed(() => {
  const rejects = approvals.value.filter(a => a.action === 'REJECT')
  return rejects.length ? rejects[rejects.length - 1].rejectReason : null
})

// 审批操作（审核人/单位管理员）
const approveDialogVisible = ref(false)
const approveAction  = ref('APPROVE')
const approveRemark  = ref('')
const rejectReason   = ref('')

function openApproveDialog(action) {
  approveAction.value  = action
  approveRemark.value  = ''
  rejectReason.value   = ''
  approveDialogVisible.value = true
}

// 审批流配置（与 ApprovalList 保持一致）
const approvalFlowConfig = {
  1: [
    { levelNo: 1, levelName: '初级审核', approverName: '陈志远', approverId: 'u004' },
    { levelNo: 2, levelName: '终级审核', approverName: '李明华',  approverId: 'u002' },
  ],
  2: [
    { levelNo: 1, levelName: '生产审核', approverName: '陈志远', approverId: 'u004' },
  ],
}

function confirmApprove() {
  if (approveAction.value === 'REJECT' && !rejectReason.value) {
    ElMessage.warning('驳回时必须填写驳回原因')
    return
  }
  const action   = approveAction.value
  const flowCfg  = approvalFlowConfig[doc.value.templateId] || []
  const history  = mockApprovals[docId.value] || []
  const doneCount = history.filter(h => h.action === 'APPROVE').length
  const currentLevel = flowCfg[doneCount]

  // 写入审批流水
  history.push({
    id: Date.now(),
    docId: docId.value,
    levelNo: currentLevel?.levelNo || 1,
    levelName: currentLevel?.levelName || '',
    approverId: 'u002',
    approverName: '李明华',
    action,
    rejectReason: action === 'REJECT' ? rejectReason.value : null,
    actionTime: new Date().toLocaleString('zh-CN'),
  })
  mockApprovals[docId.value] = history
  approvals.value = [...history]

  if (action === 'REJECT') {
    doc.value.status = 'REJECTED'
    ElMessage.success('已驳回，填报人将收到通知')
  } else {
    const newDoneCount = history.filter(h => h.action === 'APPROVE').length
    if (newDoneCount >= flowCfg.length) {
      doc.value.status = 'APPROVED'
      ElMessage.success('审批通过，单据状态已变为【已通过】')
    } else {
      ElMessage.success(`第${currentLevel?.levelNo}级审批通过，已流转至下一级审批人`)
    }
  }
  approveDialogVisible.value = false
}

// 审批动作标签
const approvalActionMap = {
  APPROVE:      { label: '审核通过',   type: 'success' },
  REJECT:       { label: '审核驳回',   type: 'danger'  },
  WITHDRAW:     { label: '填报人撤回', type: 'info'    },
  AUTO_APPROVE: { label: '超时自动通过', type: 'warning' },
  PENDING:      { label: '待审批',     type: 'primary' },
}

const canApprove = computed(() =>
  doc.value?.status === 'PENDING' && userStore.isUnitAdmin
)

function goBack() {
  // 如果从督办管理跳转过来，返回时携带筛选参数
  if (route.query.fromUrge) {
    const query = {}
    if (route.query.orgCode) query.orgCode = route.query.orgCode
    if (route.query.templateId) query.templateId = route.query.templateId
    router.push({ path: '/document/list', query })
  } else {
    router.push('/document/list')
  }
}
function toEdit()  { router.push(`/document/edit/${docId.value}`) }

// 获取主模板单据名称
function getMasterDocName() {
  if (!doc.value.masterDocId) return ''
  const masterDoc = mockDocuments.find(d => d.id === doc.value.masterDocId)
  return masterDoc ? masterDoc.templateName : ''
}

// 敏感数据脱敏
function maskValue(val) {
  if (!val) return '—'
  if (val.length <= 4) return '***'
  return val.slice(0, 2) + '****' + val.slice(-2)
}

function getCellValue(row, field) {
  const val = row.cells[field.fieldCode] || '—'
  if (field.isSensitive && userStore.isUnitAdmin) return maskValue(val)
  return val
}

// 多批次审批辅助函数
// 获取批次最后的审批时间
function getLastApprovalTime(batch) {
  if (!batch || batch.length === 0) return ''
  const lastApproval = batch[batch.length - 1]
  return lastApproval.actionTime || ''
}

// 获取批次最终审批状态
function getFinalApprovalStatus(batch) {
  if (!batch || batch.length === 0) return { label: '未知', type: 'info' }

  // 检查是否有驳回
  const hasReject = batch.some(a => a.action === 'REJECT')
  if (hasReject) return { label: '已驳回', type: 'danger' }

  // 检查是否全部通过
  const allApproved = batch.every(a => a.action === 'APPROVE')
  if (allApproved) return { label: '已通过', type: 'success' }

  // 否则为待审批
  return { label: '待审批', type: 'primary' }
}

// 导出功能
const exportApprovalDialogVisible = ref(false)
const exportApprovalForm = ref({
  exportReason: '',
  exportFormat: 'EXCEL',
})

// 检查是否有敏感字段
const hasSensitiveFields = computed(() => {
  return fields.value.some(f => f.isSensitive)
})

// 获取敏感字段列表
const sensitiveFieldsList = computed(() => {
  return fields.value.filter(f => f.isSensitive)
})

// 检查是否有有效的导出审批
const validExportApproval = computed(() => {
  const approval = mockExportApprovals.find(
    a => a.docId === docId.value &&
         a.status === 'APPROVED' &&
         a.expiryTime &&
         new Date(a.expiryTime) > new Date()
  )
  return approval
})

function handleExport() {
  if (!hasSensitiveFields.value) {
    // 无敏感字段，直接导出
    executeExport()
  } else {
    // 有敏感字段，检查是否有有效审批
    if (validExportApproval.value) {
      // 有有效审批，直接导出
      executeExport()
    } else {
      // 需要申请审批
      openExportApprovalDialog()
    }
  }
}

function openExportApprovalDialog() {
  exportApprovalForm.value = {
    exportReason: '',
    exportFormat: 'EXCEL',
  }
  exportApprovalDialogVisible.value = true
}

function submitExportApproval() {
  if (!exportApprovalForm.value.exportReason || exportApprovalForm.value.exportReason.trim().length < 10) {
    ElMessage.warning('请填写导出原因（至少10个字）')
    return
  }

  const newApproval = {
    id: Date.now(),
    docId: doc.value.id,
    docNo: doc.value.docNo,
    docName: doc.value.docName,
    templateId: doc.value.templateId,
    templateName: doc.value.templateName,
    templateOrgCode: doc.value.orgCode,
    templateOrgName: doc.value.orgName,
    templateOwnerName: '模板负责人', // 应该从模板信息中获取
    applicantOrgCode: userStore.currentRole.orgCode,
    applicantOrgName: userStore.currentRole.orgName,
    applicantUserId: userStore.userId,
    applicantUserName: userStore.currentRole.label,
    exportReason: exportApprovalForm.value.exportReason,
    sensitiveFields: sensitiveFieldsList.value.map(f => f.fieldCode),
    sensitiveFieldNames: sensitiveFieldsList.value.map(f => f.fieldName),
    exportFormat: exportApprovalForm.value.exportFormat,
    exportRowCount: dataRows.value.length,
    status: 'PENDING',
    applyTime: new Date().toLocaleString('zh-CN'),
    approveTime: null,
    approverUserId: null,
    approverUserName: null,
    approveComment: null,
    expiryTime: null,
    exportTime: null,
    exportByUserId: null,
    exportByUserName: null,
  }

  mockExportApprovals.unshift(newApproval)
  exportApprovalDialogVisible.value = false
  ElMessage.success('导出申请已提交，等待模板负责人审批')
}

// 批次数据查看
const batchDataDialogVisible = ref(false)
const currentBatchNo = ref(1)
const batchDataSearch = ref('')

// 获取指定批次的数据行
const batchDataRows = computed(() => {
  if (!currentBatchNo.value) return []

  // 从原始数据中筛选出属于当前批次的数据
  const batchRecords = mockDocumentData[docId.value]?.filter(record =>
    record.batchNo === currentBatchNo.value && record.rowStatus === 1
  ) || []

  // 按 rowNo 分组
  const rowMap = {}
  batchRecords.forEach(record => {
    if (!rowMap[record.rowNo]) {
      rowMap[record.rowNo] = { rowNo: record.rowNo, cells: {} }
    }
    rowMap[record.rowNo].cells[record.fieldCode] = record.fieldValue
  })

  return Object.values(rowMap).sort((a, b) => a.rowNo - b.rowNo)
})

// 搜索过滤
const filteredBatchDataRows = computed(() => {
  if (!batchDataSearch.value) return batchDataRows.value

  const keyword = batchDataSearch.value.toLowerCase()
  return batchDataRows.value.filter(row => {
    return Object.values(row.cells).some(val =>
      String(val).toLowerCase().includes(keyword)
    )
  })
})

// 获取指定批次的附件
const batchAttachments = computed(() => {
  if (!currentBatchNo.value) return []
  return attachments.value.filter(att => att.batchNo === currentBatchNo.value)
})

function viewBatchData(batchNo) {
  currentBatchNo.value = batchNo
  batchDataSearch.value = ''
  batchDataDialogVisible.value = true
}

// 非周期模板：数据补录功能
const isNonPeriodicTemplate = computed(() => {
  return doc.value?.collectFrequency === 'NONE'
})

// 是否可以进行数据补录（非周期模板归档后不再支持追加补录，改为使用更正功能）
const canAppendData = computed(() => {
  // 非周期模板归档后不再显示数据补录按钮
  return false
})

// 跳转到数据补录页面（DocumentEdit，追加模式）
function toAppendData() {
  // 使用 URL 查询参数
  const url = `/document/edit/${docId.value}?mode=append`

  // 同时使用 localStorage 作为备用方案
  localStorage.setItem('documentEditMode', 'append')
  localStorage.setItem('documentEditModeDocId', String(docId.value))

  router.push(url)
}

function exportBatchData() {
  ElMessage.success(`正在导出第${currentBatchNo.value}批数据（共${batchDataRows.value.length}行）`)
  // 实际导出逻辑
  console.log('导出批次数据:', {
    batchNo: currentBatchNo.value,
    rowCount: batchDataRows.value.length,
    data: batchDataRows.value,
  })
}

function executeExport() {
  ElMessage.success('数据导出成功')
  // 实际导出逻辑
  console.log('导出数据:', {
    docId: docId.value,
    docName: doc.value.docName,
    rowCount: dataRows.value.length,
    fields: fields.value,
  })
}

</script>

<template>
  <div v-if="doc">
    <!-- 顶部 -->
    <div class="page-header" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px">
        <el-button :icon="'ArrowLeft'" circle size="small" @click="goBack" />
        <div>
          <div class="page-title">
            单据详情
            <el-tag :type="DOC_STATUS[doc.status]?.type" size="small" style="margin-left:8px">
              {{ DOC_STATUS[doc.status]?.label }}
            </el-tag>
            <el-tag v-if="doc.docType === 'CORRECTION'" type="warning" size="small" style="margin-left:4px">更正单</el-tag>
          </div>
          <div class="page-desc">{{ doc.docName }} · {{ doc.docNo }}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <el-button :icon="'Download'" @click="handleExport">导出数据</el-button>
        <el-button
          v-if="canAppendData"
          type="primary"
          :icon="'Plus'"
          @click="toAppendData"
        >
          数据补录
        </el-button>
        <el-button
          v-if="doc.status === 'DRAFT' && userStore.isReporter"
          type="primary" @click="toEdit"
        >编辑单据</el-button>
      </div>
    </div>

    <!-- 驳回原因 -->
    <el-alert
      v-if="doc.status === 'REJECTED' && latestRejectReason"
      type="error" :closable="false" style="margin-bottom:16px"
    >
      <template #title>
        <span style="font-weight:600">审核驳回原因：</span>{{ latestRejectReason }}
      </template>
    </el-alert>

    <!-- 从模板单据提示 -->
    <el-alert
      v-if="doc.masterDocId"
      type="info" :closable="false" style="margin-bottom:16px"
    >
      <template #title>
        <span style="font-weight:600">本单据为从模板单据</span>
      </template>
      <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
        <span>依赖主模板单据：</span>
        <el-link type="primary" :underline="false" @click="router.push(`/document/detail/${doc.masterDocId}`)">
          查看主模板《{{ getMasterDocName() }}》{{ doc.accountPeriod }} 数据
        </el-link>
        <span style="color:#888;font-size:12px">（数据表格中灰色背景字段来自主模板，不可修改）</span>
      </div>
    </el-alert>

    <!-- 更正关联提示（已更正的单据） -->
    <el-alert
      v-if="doc.status === 'AMENDED' && correctionDoc"
      type="warning" :closable="false" style="margin-bottom:16px"
    >
      <template #title>
        <span style="font-weight:600">此单据已被更正</span>
      </template>
      <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
        <span>更正后的新单据：</span>
        <el-link type="primary" :underline="false" @click="router.push(`/document/detail/${correctionDoc.id}`)">
          {{ correctionDoc.docNo }} - {{ correctionDoc.docName }}
        </el-link>
      </div>
    </el-alert>

    <!-- 更正关联提示（更正单） -->
    <el-alert
      v-if="doc.docType === 'CORRECTION' && originDoc"
      type="info" :closable="false" style="margin-bottom:16px"
    >
      <template #title>
        <span style="font-weight:600">此单据为更正单</span>
      </template>
      <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
        <span>原始单据：</span>
        <el-link type="primary" :underline="false" @click="router.push(`/document/detail/${originDoc.id}`)">
          {{ originDoc.docNo }} - {{ originDoc.docName }}
        </el-link>
      </div>
    </el-alert>

    <el-row :gutter="16">
      <!-- 左侧主体 -->
      <el-col :span="16">

        <!-- 基本信息 -->
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header><span style="font-weight:600">基本信息</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="单据名称" :span="2">{{ doc.docName }}</el-descriptions-item>
            <el-descriptions-item label="单据编号">{{ doc.docNo }}</el-descriptions-item>
            <el-descriptions-item label="业务编号">{{ doc.bizNo }}</el-descriptions-item>
            <el-descriptions-item label="补录模板">{{ doc.templateName }}</el-descriptions-item>
            <el-descriptions-item label="模板版本">V{{ doc.templateVersion }}</el-descriptions-item>
            <el-descriptions-item label="所属单位">{{ doc.orgName }}</el-descriptions-item>
            <el-descriptions-item label="业务域">{{ doc.bizDomainLabel }}</el-descriptions-item>
            <el-descriptions-item label="账期">{{ doc.accountPeriod || '—' }}</el-descriptions-item>
            <el-descriptions-item label="来源渠道">{{ SOURCE_CHANNELS[doc.sourceChannel]?.label }}</el-descriptions-item>
            <el-descriptions-item label="单据负责人">{{ doc.ownerName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="截止日期">{{ doc.deadlineDate || '—' }}</el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ doc.submitTime  || '—' }}</el-descriptions-item>
            <el-descriptions-item label="归档时间">{{ doc.archiveTime || '—' }}</el-descriptions-item>
            <el-descriptions-item label="补录原因" :span="2">{{ doc.fillReason || '—' }}</el-descriptions-item>
            <el-descriptions-item label="缺失说明" :span="2">{{ doc.missDesc   || '—' }}</el-descriptions-item>
            <el-descriptions-item label="业务依据" :span="2">{{ doc.bizBasis   || '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 数据内容 -->
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-weight:600">数据内容（共 {{ dataRows.length }} 行）</span>
              <el-tag v-if="doc.masterDocId" type="info" size="small">
                包含主模板字段（灰色背景为只读字段）
              </el-tag>
            </div>
          </template>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:50px">序号</th>
                  <th v-for="f in fields" :key="f.fieldCode" :class="{ 'master-field-header': f.fromMaster }">
                    {{ f.fieldName }}
                    <el-icon v-if="f.fromMaster" style="margin-left:4px" title="主模板字段"><Lock /></el-icon>
                    <el-tag v-if="f.isSensitive" size="small" type="warning" style="margin-left:2px">敏感</el-tag>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in dataRows" :key="row.rowNo">
                  <td style="text-align:center;color:#888;font-size:12px">{{ idx + 1 }}</td>
                  <td
                    v-for="f in fields" :key="f.fieldCode"
                    :class="{ 'cell-error': row.errors[f.fieldCode], 'master-field-cell': f.fromMaster }"
                  >
                    <el-tooltip v-if="row.errors[f.fieldCode]" :content="row.errors[f.fieldCode]" placement="top">
                      <span style="color:#ff4d4f">
                        {{ getCellValue(row, f) }}
                        <el-icon style="margin-left:2px"><Warning /></el-icon>
                      </span>
                    </el-tooltip>
                    <span v-else>{{ getCellValue(row, f) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </el-card>

      </el-col>

      <!-- 右侧：审批流水 -->
      <el-col :span="8">
        <el-card shadow="never" style="position:sticky;top:16px">
          <template #header><span style="font-weight:600">审批流水</span></template>

          <el-empty v-if="!approvals.length" description="暂无审批记录" :image-size="60" />

          <!-- 单批次审批流水（普通单据） -->
          <el-timeline v-else-if="!Array.isArray(approvals[0])">
            <el-timeline-item
              v-for="a in approvals"
              :key="a.id"
              :type="approvalActionMap[a.action]?.type || 'primary'"
              :timestamp="a.actionTime || '待处理'"
              placement="top"
            >
              <div class="approval-item">
                <div class="approval-header">
                  <span class="approval-name">{{ a.approverName }}</span>
                  <el-tag :type="approvalActionMap[a.action]?.type" size="small">
                    {{ approvalActionMap[a.action]?.label }}
                  </el-tag>
                </div>
                <div v-if="a.rejectReason" class="approval-reason">
                  驳回原因：{{ a.rejectReason }}
                </div>
                <div v-if="a.remark" style="margin-top:4px;font-size:12px;color:#666">
                  {{ a.remark }}
                </div>
              </div>
            </el-timeline-item>

            <!-- 当前待审节点 -->
            <el-timeline-item
              v-if="doc.status === 'PENDING'"
              type="primary"
              hollow
              timestamp="待处理"
              placement="top"
            >
              <div style="color:#1677ff;font-size:13px">等待审核人处理…</div>
            </el-timeline-item>
          </el-timeline>

          <!-- 多批次审批流水（非周期单据，手风琴展示） -->
          <el-collapse v-else accordion style="border:none">
            <el-collapse-item
              v-for="(batch, batchIndex) in approvals"
              :key="batchIndex"
              :name="batchIndex"
            >
              <template #title>
                <div style="display:flex;align-items:center;gap:8px;width:100%" @click.stop>
                  <span style="font-weight:500;font-size:13px">第{{ batchIndex + 1 }}批审批</span>
                  <span style="color:#888;font-size:12px">{{ getLastApprovalTime(batch) }}</span>
                  <el-tag
                    :type="getFinalApprovalStatus(batch).type"
                    size="small"
                  >
                    {{ getFinalApprovalStatus(batch).label }}
                  </el-tag>
                  <el-button
                    link
                    type="primary"
                    size="small"
                    style="margin-left:auto"
                    @click.stop="viewBatchData(batchIndex + 1)"
                  >
                    查看数据
                  </el-button>
                </div>
              </template>
              <el-timeline>
                <el-timeline-item
                  v-for="a in batch"
                  :key="a.id"
                  :type="approvalActionMap[a.action]?.type || 'primary'"
                  :timestamp="a.actionTime || '待处理'"
                  placement="top"
                  size="small"
                >
                  <div class="approval-item">
                    <div class="approval-header">
                      <span class="approval-name">{{ a.approverName }}</span>
                      <el-tag :type="approvalActionMap[a.action]?.type" size="small">
                        {{ approvalActionMap[a.action]?.label }}
                      </el-tag>
                    </div>
                    <div v-if="a.rejectReason" class="approval-reason">
                      驳回原因：{{ a.rejectReason }}
                    </div>
                    <div v-if="a.remark" style="margin-top:4px;font-size:12px;color:#666">
                      {{ a.remark }}
                    </div>
                  </div>
                </el-timeline-item>
              </el-timeline>
            </el-collapse-item>
          </el-collapse>

          <!-- 操作按钮（审核人区域） -->
          <div v-if="canApprove" class="approve-actions">
            <el-button type="success" style="flex:1" @click="openApproveDialog('APPROVE')">
              审核通过
            </el-button>
            <el-button type="danger" plain style="flex:1" @click="openApproveDialog('REJECT')">
              审核驳回
            </el-button>
          </div>
        </el-card>

        <!-- 附件展示 -->
        <el-card shadow="never" style="margin-top:16px;position:sticky;top:calc(100vh - 300px)">
          <template #header>
            <span style="font-weight:600">佐证附件</span>
            <span style="font-size:12px;color:#888;margin-left:8px">({{ attachments.length }})</span>
          </template>
          <AttachmentUpload v-model="attachments" :disabled="true" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 审批弹窗 -->
    <el-dialog
      v-model="approveDialogVisible"
      :title="approveAction === 'APPROVE' ? '确认审核通过' : '填写驳回原因'"
      width="440px"
    >
      <el-form label-width="90px">
        <el-form-item v-if="approveAction === 'REJECT'" label="驳回原因" required>
          <el-input
            v-model="rejectReason"
            type="textarea" :rows="4"
            placeholder="请详细说明驳回原因，填报人将收到通知"
          />
        </el-form-item>
        <div v-else style="color:#666;font-size:13px;padding:4px 0 8px">
          确认审核通过后，若还有下一级审批节点，单据将自动流转；若为最终节点，单据状态将变为【已通过】。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button
          :type="approveAction === 'APPROVE' ? 'success' : 'danger'"
          @click="confirmApprove"
        >{{ approveAction === 'APPROVE' ? '确认通过' : '确认驳回' }}</el-button>
      </template>
    </el-dialog>

    <!-- 导出审批申请弹窗 -->
    <el-dialog v-model="exportApprovalDialogVisible" title="敏感数据导出申请" width="600px">
      <el-alert type="warning" :closable="false" style="margin-bottom:16px">
        <template #default>
          <div style="font-size:13px;line-height:1.6">
            <div style="font-weight:600;margin-bottom:8px">检测到敏感字段：</div>
            <div>
              <el-tag
                v-for="field in sensitiveFieldsList"
                :key="field.fieldCode"
                type="danger"
                size="small"
                style="margin-right:6px;margin-bottom:4px"
              >
                {{ field.fieldName }}
              </el-tag>
            </div>
            <div style="margin-top:8px;color:#fa8c16">
              导出包含敏感字段的数据需要模板负责人审批
            </div>
          </div>
        </template>
      </el-alert>

      <el-form :model="exportApprovalForm" label-width="100px">
        <el-form-item label="单据信息">
          <div style="line-height:1.8;font-size:13px">
            <div><strong>{{ doc.docName }}</strong></div>
            <div style="color:#888;margin-top:2px">{{ doc.docNo }} · 共 {{ dataRows.length }} 行数据</div>
          </div>
        </el-form-item>

        <el-form-item label="模板负责人">
          <span>张三</span>
        </el-form-item>

        <el-form-item label="导出原因" required>
          <el-input
            v-model="exportApprovalForm.exportReason"
            type="textarea"
            :rows="4"
            placeholder="请说明导出敏感数据的原因和用途（至少10个字）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-alert type="info" :closable="false">
          <template #default>
            <div style="font-size:13px">
              <div style="font-weight:600;margin-bottom:4px">审批说明：</div>
              <div>1. 模板负责人审批通过后，24小时内有效</div>
              <div>2. 导出的数据请妥善保管，不得外传</div>
              <div>3. 审批记录将被保存用于安全审计</div>
            </div>
          </template>
        </el-alert>
      </el-form>

      <template #footer>
        <el-button @click="exportApprovalDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitExportApproval">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 批次数据查看对话框 -->
    <el-dialog
      v-model="batchDataDialogVisible"
      :title="`第${currentBatchNo}批数据 (共${batchDataRows.length}行)`"
      width="90%"
      top="5vh"
    >
      <div style="margin-bottom:12px;display:flex;align-items:center;gap:12px">
        <el-input
          v-model="batchDataSearch"
          placeholder="搜索数据..."
          clearable
          style="width:300px"
          prefix-icon="Search"
        />
        <el-tag type="info">第{{ currentBatchNo }}批审批数据</el-tag>
      </div>

      <div class="data-table-wrap" style="max-height:calc(80vh - 200px);overflow:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th style="position:sticky;left:0;background:#fafafa;z-index:2">行号</th>
              <th v-for="field in fields" :key="field.fieldCode">
                {{ field.fieldName }}
                <el-tag v-if="field.isSensitive" type="danger" size="small" style="margin-left:4px">敏感</el-tag>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredBatchDataRows" :key="row.rowNo">
              <td style="position:sticky;left:0;background:#fff;font-weight:600">{{ row.rowNo }}</td>
              <td v-for="field in fields" :key="field.fieldCode">
                {{ getCellValue(row, field) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <el-empty v-if="filteredBatchDataRows.length === 0" description="该批次暂无数据" :image-size="80" />

      <!-- 批次附件展示 -->
      <el-divider v-if="batchAttachments.length > 0" content-position="left">
        <span style="font-size:14px;font-weight:500">批次附件 ({{ batchAttachments.length }})</span>
      </el-divider>

      <div v-if="batchAttachments.length > 0" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:16px">
        <div
          v-for="att in batchAttachments"
          :key="att.id"
          class="attachment-item"
          style="border:1px solid #e8e8e8;border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:8px"
        >
          <div style="display:flex;align-items:center;gap:8px">
            <el-icon size="24" color="#1677ff"><Document /></el-icon>
            <div style="flex:1;overflow:hidden">
              <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                {{ att.fileName }}
              </div>
              <div style="font-size:12px;color:#888;margin-top:2px">
                {{ (att.fileSize / 1024).toFixed(0) }} KB
              </div>
            </div>
          </div>
          <div style="font-size:12px;color:#888">
            上传时间：{{ att.uploadTime }}
          </div>
          <el-button link type="primary" size="small" style="align-self:flex-start">
            <el-icon><Download /></el-icon>
            下载
          </el-button>
        </div>
      </div>

      <template #footer>
        <el-button @click="batchDataDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="exportBatchData">导出该批次数据</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.data-table-wrap { overflow-x: auto; width: 100%; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th,
.data-table td { border: 1px solid #f0f0f0; padding: 6px 10px; white-space: nowrap; min-width: 100px; }
.data-table th  { background: #fafafa; font-weight: 500; color: #555; }
.data-table tbody tr:hover td { background: #f5f9ff; }
.cell-error { background: #fff2f0 !important; }

/* 主模板字段样式 */
.master-field-header {
  background: #e8e8e8 !important;
  font-weight: 600;
  color: #333;
}
.master-field-cell {
  background: #f5f5f5 !important;
  color: #666;
  font-weight: 500;
}
.data-table tbody tr:hover .master-field-cell {
  background: #ebebeb !important;
}

.approval-item  { font-size: 13px; }
.approval-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.approval-name  { font-weight: 500; }
.approval-reason { color: #ff4d4f; font-size: 12px; margin-top: 4px; background: #fff2f0; padding: 4px 8px; border-radius: 4px; }
.approve-actions { margin-top: 16px; border-top: 1px solid #f0f0f0; padding-top: 16px; display: flex; gap: 8px; }
</style>
