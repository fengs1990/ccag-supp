<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { mockDocuments, DOC_STATUS, DOC_TYPES, mockDocumentData } from '../../mock/document.js'
import { mockTemplates, mockTemplateFields } from '../../mock/template.js'
import { mockApprovalFlows } from '../../mock/approvalFlow.js'
import { mockExportApprovals, EXPORT_APPROVAL_STATUS } from '../../mock/exportApproval.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const filterForm = ref({
  docNo: '',
  bizDomain: '',
  status: '',
  templateId: '',
  orgCode: '',
  periodStart: '',
  periodEnd: '',
  createBy: '',
  approvalResult: '', // approved/rejected
})
const activeFilter = ref({ ...filterForm.value })

// 从路由参数初始化筛选条件
onMounted(() => {
  if (route.query.templateId) {
    filterForm.value.templateId = Number(route.query.templateId)
  }
  if (route.query.orgCode) {
    filterForm.value.orgCode = route.query.orgCode
  }
  activeFilter.value = { ...filterForm.value }
})

function doSearch() { activeFilter.value = { ...filterForm.value } }
function resetFilter() {
  filterForm.value = {
    docNo: '',
    bizDomain: '',
    status: '',
    templateId: '',
    orgCode: '',
    periodStart: '',
    periodEnd: '',
    createBy: '',
    approvalResult: '',
  }
  activeFilter.value = { ...filterForm.value }
}

const tableData = computed(() => {
  let list = mockDocuments
  if (userStore.isReporter) {
    list = list.filter(d => d.createBy === '张小红')
  } else if (userStore.isUnitAdmin) {
    list = list.filter(d => d.orgCode === userStore.currentRole.orgCode)
  }
  if (activeFilter.value.docNo) {
    list = list.filter(d => d.docNo.includes(activeFilter.value.docNo) || d.bizNo.includes(activeFilter.value.docNo))
  }
  if (activeFilter.value.bizDomain) list = list.filter(d => d.bizDomain === activeFilter.value.bizDomain)
  if (activeFilter.value.status)    list = list.filter(d => d.status === activeFilter.value.status)
  if (activeFilter.value.templateId) list = list.filter(d => d.templateId === activeFilter.value.templateId)
  if (activeFilter.value.orgCode)   list = list.filter(d => d.orgCode === activeFilter.value.orgCode)
  if (activeFilter.value.periodStart) list = list.filter(d => d.accountPeriod && d.accountPeriod >= activeFilter.value.periodStart)
  if (activeFilter.value.periodEnd) list = list.filter(d => d.accountPeriod && d.accountPeriod <= activeFilter.value.periodEnd)
  if (activeFilter.value.createBy) list = list.filter(d => d.createBy && d.createBy.includes(activeFilter.value.createBy))
  if (activeFilter.value.approvalResult === 'approved') list = list.filter(d => d.status === 'APPROVED' || d.status === 'ARCHIVED')
  if (activeFilter.value.approvalResult === 'rejected') list = list.filter(d => d.status === 'REJECTED')
  return list
})

const statusCounts = computed(() =>
  Object.fromEntries(Object.keys(DOC_STATUS).map(k => [k, mockDocuments.filter(d => d.status === k).length]))
)

function canEdit(row)     { return ['DRAFT', 'REJECTED'].includes(row.status) && userStore.isUnitAdmin }  // 单位管理员可以编辑基本信息
function canFillData(row) {
  // 草稿和驳回状态可以补录
  if (['DRAFT', 'REJECTED'].includes(row.status) && (userStore.isReporter || userStore.isUnitAdmin)) {
    return true
  }
  // 非周期模板不再支持归档后追加补录，改为使用更正功能
  return false
}
function canSubmit(row)   { return ['DRAFT', 'REJECTED'].includes(row.status) && (userStore.isReporter || userStore.isUnitAdmin) }
function canWithdraw(row) { return row.status === 'PENDING' && userStore.isUnitAdmin }
function canCorrect(row)  {
  // 普通模板：归档后可以更正
  // 非周期模板：归档后也可以持续更正
  return row.status === 'ARCHIVED' && (userStore.isReporter || userStore.isUnitAdmin)
}
function canDelete(row)   { return row.status === 'DRAFT' && userStore.isUnitAdmin }
function canViewDetail(row) { return !['DRAFT'].includes(row.status) } // 非草稿状态可查看详情
function isOverdue(row)   {
  if (!row.deadlineDate || ['ARCHIVED','AMENDED'].includes(row.status)) return false
  return new Date(row.deadlineDate) < new Date()
}

// 获取模板信息
function getTemplateInfo(templateId) {
  return mockTemplates.find(t => t.id === templateId)
}

function handleSubmit(row) {
  ElMessageBox.confirm(`确认提交单据「${row.docNo}」进入审批？提交后基础字段将锁定。`, '提交确认', {
    type: 'warning', confirmButtonText: '确认提交',
  }).then(() => {
    row.status = 'PENDING'
    row.submitTime = new Date().toLocaleString('zh-CN')
    ElMessage.success('单据已提交，等待审核')
  }).catch(() => {})
}

function handleWithdraw(row) {
  ElMessageBox.confirm(`确认撤回单据「${row.docNo}」？撤回后退回草稿状态。`, '撤回确认', {
    type: 'warning', confirmButtonText: '确认撤回',
  }).then(() => {
    row.status = 'DRAFT'
    row.submitTime = null
    ElMessage.success('单据已撤回')
  }).catch(() => {})
}

function handleCorrect(row) {
  ElMessageBox.confirm(`发起更正补录将创建一张新更正单，原单标记为「已更正」，确认继续？`, '更正补录', {
    type: 'warning', confirmButtonText: '发起更正',
  }).then(() => {
    ElMessage.success('更正单已创建')
    router.push(`/document/edit/new`)
  }).catch(() => {})
}

function handleDelete(row) {
  ElMessageBox.confirm(`确认删除草稿单据「${row.docNo}」？此操作不可撤销。`, '删除确认', {
    type: 'error', confirmButtonText: '确认删除',
  }).then(() => {
    ElMessage.success('单据已删除')
  }).catch(() => {})
}

const toCreate = () => router.push('/document/create')
const toEdit   = (row) => router.push(`/document/create/${row.id}`)  // 编辑基本信息
const toFillData = (row) => router.push(`/document/edit/${row.id}`)  // 补录数据
const toDetail = (row) => router.push(`/document/detail/${row.id}`)

// 导出功能
const exportApprovalDialogVisible = ref(false)
const exportApprovalForm = ref({
  doc: null,
  exportReason: '',
  exportFormat: 'EXCEL',
})

// 检查单据是否有敏感字段
function hasSensitiveFields(docId, templateId) {
  const fields = mockTemplateFields[templateId] || []
  return fields.some(f => f.isSensitive)
}

// 获取单据的敏感字段列表
function getSensitiveFields(templateId) {
  const fields = mockTemplateFields[templateId] || []
  return fields.filter(f => f.isSensitive)
}

// 获取单据数据行数
function getDocRowCount(docId) {
  const rawData = mockDocumentData[docId] || []
  const rowNos = new Set(rawData.filter(r => r.rowStatus === 1).map(r => r.rowNo))
  return rowNos.size
}

// 检查是否有有效的导出审批
function getValidExportApproval(docId) {
  const approval = mockExportApprovals.find(
    a => a.docId === docId &&
         a.status === 'APPROVED' &&
         a.expiryTime &&
         new Date(a.expiryTime) > new Date()
  )
  return approval
}

function handleExport(row) {
  // 检查是否有数据
  const rowCount = getDocRowCount(row.id)
  if (rowCount === 0) {
    ElMessage.warning('该单据暂无数据，无法导出')
    return
  }

  if (!hasSensitiveFields(row.id, row.templateId)) {
    // 无敏感字段，直接导出
    executeExport(row)
  } else {
    // 有敏感字段，检查是否有有效审批
    if (getValidExportApproval(row.id)) {
      // 有有效审批，直接导出
      executeExport(row)
    } else {
      // 需要申请审批
      openExportApprovalDialog(row)
    }
  }
}

function openExportApprovalDialog(row) {
  exportApprovalForm.value = {
    doc: row,
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

  const doc = exportApprovalForm.value.doc
  const sensitiveFields = getSensitiveFields(doc.templateId)
  const rowCount = getDocRowCount(doc.id)

  const newApproval = {
    id: Date.now(),
    docId: doc.id,
    docNo: doc.docNo,
    docName: doc.docName,
    templateId: doc.templateId,
    templateName: doc.templateName,
    templateOrgCode: doc.orgCode,
    templateOrgName: doc.orgName,
    templateOwnerName: '模板负责人',
    applicantOrgCode: userStore.currentRole.orgCode,
    applicantOrgName: userStore.currentRole.orgName,
    applicantUserId: userStore.userId,
    applicantUserName: userStore.currentRole.label,
    exportReason: exportApprovalForm.value.exportReason,
    sensitiveFields: sensitiveFields.map(f => f.fieldCode),
    sensitiveFieldNames: sensitiveFields.map(f => f.fieldName),
    exportFormat: exportApprovalForm.value.exportFormat,
    exportRowCount: rowCount,
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

function executeExport(row) {
  ElMessage.success(`正在导出单据「${row.docName}」的数据`)
  // 实际导出逻辑
  console.log('导出数据:', {
    docId: row.id,
    docName: row.docName,
    rowCount: getDocRowCount(row.id),
  })
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">单据管理</div>
        <div class="page-desc">管理数据补录单据，跟踪审批进度</div>
      </div>
      <el-button type="primary" :icon="'Plus'" @click="toCreate">新建单据</el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-row">
      <div v-for="(v, k) in DOC_STATUS" :key="k" class="stat-card" @click="filterForm.status = k; doSearch()">
        <div class="stat-num" :style="{ color: v.color }">{{ statusCounts[k] }}</div>
        <div class="stat-label">{{ v.label }}</div>
      </div>
    </div>

    <!-- 筛选 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filterForm" inline>
        <el-form-item label="单据编号">
          <el-input v-model="filterForm.docNo" placeholder="单据编号/业务编号" clearable style="width:180px" />
        </el-form-item>
        <el-form-item label="所属单位">
          <el-select v-model="filterForm.orgCode" placeholder="全部" clearable style="width:130px">
            <el-option label="长安乘用车" value="UNIT_CA" />
            <el-option label="长安商用车" value="UNIT_CS" />
            <el-option label="长安跨越" value="UNIT_KS" />
            <el-option label="阿维塔科技" value="UNIT_EV" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务域">
          <el-select v-model="filterForm.bizDomain" placeholder="全部" clearable style="width:110px">
            <el-option label="财务域"   value="FINANCE" />
            <el-option label="生产域"   value="PRODUCTION" />
            <el-option label="销售域"   value="SALES" />
            <el-option label="供应链域" value="SUPPLY" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable style="width:110px">
            <el-option v-for="(v, k) in DOC_STATUS" :key="k" :label="v.label" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="补录模板">
          <el-select v-model="filterForm.templateId" placeholder="全部" clearable style="width:160px">
            <el-option v-for="t in mockTemplates" :key="t.id" :label="t.templateName" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="账期">
          <el-input
            v-model="filterForm.periodStart"
            placeholder="开始账期"
            clearable
            style="width:130px"
          />
          <span style="margin:0 8px">至</span>
          <el-input
            v-model="filterForm.periodEnd"
            placeholder="结束账期"
            clearable
            style="width:130px"
          />
          <el-tooltip
            content="支持多种格式：2026（年）、2026-09（月）、2026-09-15（日）"
            placement="top"
          >
            <el-icon style="margin-left:4px;color:#909399;cursor:help"><QuestionFilled /></el-icon>
          </el-tooltip>
        </el-form-item>
        <el-form-item label="填报人">
          <el-input v-model="filterForm.createBy" placeholder="填报人姓名" clearable style="width:120px" />
        </el-form-item>
        <el-form-item label="审批结果">
          <el-select v-model="filterForm.approvalResult" placeholder="全部" clearable style="width:110px">
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="'Search'" @click="doSearch">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="tableData" style="width:100%" stripe row-key="id">
        <el-table-column label="单据名称" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:6px">
              <el-link type="primary" :underline="false" @click="toDetail(row)">{{ row.docName }}</el-link>
              <el-tag v-if="row.docType === 'CORRECTION'" size="small" type="warning">更正单</el-tag>
            </div>
            <div style="font-size:12px;color:#aaa">{{ row.docNo }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="orgName" label="所属单位" width="140" />
        <el-table-column label="模板" min-width="180">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:6px">
              <span>{{ row.templateName }}</span>
              <el-tag v-if="getTemplateInfo(row.templateId)?.isMaster === 1" size="small" type="danger">主</el-tag>
              <el-tag v-if="getTemplateInfo(row.templateId)?.dependOnMaster === 1" size="small" type="warning">从</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="accountPeriod" label="账期" width="100" />
        <el-table-column label="填报周期" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.collectFrequency === 'YEAR'" size="small" type="info">年</el-tag>
            <el-tag v-else-if="row.collectFrequency === 'MONTH'" size="small" type="primary">月</el-tag>
            <el-tag v-else-if="row.collectFrequency === 'DAY'" size="small" type="success">日</el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="业务域" width="90">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.bizDomainLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审批流程" width="140">
          <template #default="{ row }">
            <el-tag v-if="row.approvalFlowId" size="small" type="success" effect="plain">
              {{ mockApprovalFlows.find(f => f.id === row.approvalFlowId)?.flowName || '—' }}
            </el-tag>
            <span v-else style="color:#aaa;font-size:12px">手动指定</span>
          </template>
        </el-table-column>
        <el-table-column v-if="!userStore.isReporter" prop="orgName" label="所属单位" width="120" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="DOC_STATUS[row.status].type" size="small">{{ DOC_STATUS[row.status].label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="截止日期" width="110">
          <template #default="{ row }">
            <span :class="{ 'text-overdue': isOverdue(row) }">{{ row.deadlineDate }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="ownerName"  label="负责人"   width="90" />
        <el-table-column prop="createBy"   label="填报人"   width="90" />
        <el-table-column prop="createTime" label="创建时间"  width="160" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEdit(row)" link type="primary" size="small" @click="toEdit(row)">编辑</el-button>
            <el-button v-if="canFillData(row)" link type="primary" size="small" @click="toFillData(row)">补录数据</el-button>
            <el-button v-if="canSubmit(row)" link type="success" size="small" @click="handleSubmit(row)">提交审批</el-button>
            <el-button v-if="canViewDetail(row)" link type="primary" size="small" @click="toDetail(row)">详情</el-button>
            <el-button v-if="!['DRAFT'].includes(row.status)" link type="primary" size="small" @click="handleExport(row)">导出</el-button>
            <el-button v-if="canWithdraw(row)" link type="warning" size="small" @click="handleWithdraw(row)">撤回</el-button>
            <el-button v-if="canCorrect(row)" link type="warning" size="small" @click="handleCorrect(row)">更正</el-button>
            <el-button v-if="canDelete(row)" link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无单据数据" :image-size="60" />
        </template>
      </el-table>
    </el-card>

    <!-- 导出审批申请弹窗 -->
    <el-dialog v-model="exportApprovalDialogVisible" title="敏感数据导出申请" width="600px">
      <el-alert type="warning" :closable="false" style="margin-bottom:16px">
        <template #default>
          <div style="font-size:13px;line-height:1.6">
            <div style="font-weight:600;margin-bottom:8px">检测到敏感字段：</div>
            <div>
              <el-tag
                v-for="field in getSensitiveFields(exportApprovalForm.doc?.templateId)"
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
          <div v-if="exportApprovalForm.doc" style="line-height:1.8;font-size:13px">
            <div><strong>{{ exportApprovalForm.doc.docName }}</strong></div>
            <div style="color:#888;margin-top:2px">
              {{ exportApprovalForm.doc.docNo }} · 共 {{ getDocRowCount(exportApprovalForm.doc.id) }} 行数据
            </div>
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
  </div>
</template>

<style scoped>
.stat-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.stat-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
.stat-num   { font-size: 28px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 12px; color: #888; margin-top: 4px; }
.text-overdue { color: #ff4d4f; }
</style>
