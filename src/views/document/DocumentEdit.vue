<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { mockDocuments, mockDocumentData, DOC_STATUS } from '../../mock/document.js'
import { mockTemplates, mockTemplateFields, FIELD_TYPES, COLLECT_FREQUENCIES } from '../../mock/template.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import AttachmentUpload from '../../components/AttachmentUpload.vue'

const route  = useRoute()
const router = useRouter()
const userStore = useUserStore()

const docId = computed(() => Number(route.params.id))

// 是否为追加模式（非周期模板归档后的数据补录）
// 优先使用 query 参数，如果不存在则尝试从 localStorage 读取
const isAppendMode = computed(() => {
  // 方案1: 从 URL query 参数读取
  if (route.query.mode === 'append') {
    return true
  }

  // 方案2: 从 localStorage 读取（备用方案）
  const storedMode = localStorage.getItem('documentEditMode')
  const storedDocId = localStorage.getItem('documentEditModeDocId')

  if (storedMode === 'append' && storedDocId === String(docId.value)) {
    return true
  }

  return false
})

// 当前单据、模板字段定义、数据行、附件列表
const doc       = ref(null)
const fields    = ref([])   // 模板字段定义（有序）
const dataRows  = ref([])   // 二维数据 [{ rowNo, cells: { fieldCode: value }, editing: false }]
const attachments = ref([]) // 附件列表
const baseInfoCollapsed = ref(false) // 单据基础信息折叠状态

// 导入历史
const importHistory = ref([
  {
    id: 1,
    importMode: 'overwrite',
    fileName: '财务数据_202609_v1.xlsx',
    taskStatus: 'SUCCESS',
    totalRows: 150,
    successRows: 150,
    failRows: 0,
    startTime: '2026-09-10 14:28:00',
    endTime: '2026-09-10 14:28:35',
    createBy: '张小红',
  },
  {
    id: 2,
    importMode: 'append',
    fileName: '财务数据_202609_补充.xlsx',
    taskStatus: 'PARTIAL',
    totalRows: 50,
    successRows: 48,
    failRows: 2,
    startTime: '2026-09-11 09:15:00',
    endTime: '2026-09-11 09:15:18',
    createBy: '张小红',
  },
  {
    id: 3,
    importMode: 'append',
    fileName: '财务数据_202610_新增.xlsx',
    taskStatus: 'FAILED',
    totalRows: 80,
    successRows: 0,
    failRows: 80,
    startTime: '2026-10-05 10:30:00',
    endTime: '2026-10-05 10:30:05',
    createBy: '张小红',
  },
])

const IMPORT_STATUS = {
  PROCESSING: { label: '处理中', type: 'primary' },
  SUCCESS:    { label: '成功',   type: 'success' },
  PARTIAL:    { label: '部分成功', type: 'warning' },
  FAILED:     { label: '失败',   type: 'danger'  },
}

function downloadErrorFile(task) {
  ElMessage.success(`已下载「${task.fileName}」的错误报告`)
}

// 把纵表数据还原为行列结构
function buildRows(rawData) {
  const rowMap = {}
  rawData.filter(r => r.rowStatus === 1).forEach(r => {
    if (!rowMap[r.rowNo]) rowMap[r.rowNo] = { rowNo: r.rowNo, cells: {}, errors: {}, editing: false }
    rowMap[r.rowNo].cells[r.fieldCode] = r.fieldValue ?? ''
    if (r.validateStatus === 2 && r.validateError) {
      rowMap[r.rowNo].errors[r.fieldCode] = r.validateError
    }
  })
  return Object.values(rowMap).sort((a, b) => a.rowNo - b.rowNo)
}

onMounted(() => {
  const foundDoc = mockDocuments.find(d => d.id === docId.value)
  if (!foundDoc) {
    ElMessage.error('单据不存在')
    router.push('/document/list')
    return
  }

  doc.value = { ...foundDoc }
  selectedTemplateId.value = doc.value.templateId
  loadTemplateFields(doc.value.templateId)

  // 追加模式：不加载现有数据，从空白开始
  if (isAppendMode.value) {
    dataRows.value = [{ rowNo: 1, cells: {}, errors: {}, editing: false }]
    attachments.value = []
    ElMessage.info('追加补录模式：请填写新批次的数据')

    // 清除 localStorage 标识，避免影响后续访问
    localStorage.removeItem('documentEditMode')
    localStorage.removeItem('documentEditModeDocId')
  } else {
    // 编辑模式：加载现有数据
    const raw = mockDocumentData[docId.value] || []
    dataRows.value = buildRows(raw)

    // 如果没有数据行，初始化一行
    if (dataRows.value.length === 0) {
      dataRows.value = [{ rowNo: 1, cells: {}, errors: {}, editing: false }]
    }

    // 加载附件（模拟数据）
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

const selectedTemplateId = ref(null)

function loadTemplateFields(tplId) {
  let tplFields = mockTemplateFields[tplId] || []

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
}

// 只读：草稿和已驳回状态可编辑，追加模式也可编辑，其他状态只读
const isReadOnly = computed(() => {
  if (isAppendMode.value) return false // 追加模式可编辑
  return doc.value && !['DRAFT', 'REJECTED'].includes(doc.value.status)
})

// 行操作
function addRow() {
  const maxNo = dataRows.value.length ? Math.max(...dataRows.value.map(r => r.rowNo)) : 0
  dataRows.value.push({ rowNo: maxNo + 1, cells: {}, errors: {}, editing: true })
}

function copyRow(idx) {
  const src = dataRows.value[idx]
  const maxNo = Math.max(...dataRows.value.map(r => r.rowNo))
  dataRows.value.splice(idx + 1, 0, { rowNo: maxNo + 1, cells: { ...src.cells }, errors: {}, editing: true })
  ElMessage.success('已复制第 ' + (idx + 1) + ' 行')
}

function deleteRow(idx) {
  if (dataRows.value.length <= 1) { ElMessage.warning('至少保留一行数据'); return }
  dataRows.value.splice(idx, 1)
}

// 编辑行操作
function editRow(row) {
  row.editing = true
}

function saveRow(row) {
  row.editing = false
  ElMessage.success('已保存')
}

function cancelEditRow(row) {
  row.editing = false
}

// Excel导入弹窗
const excelImportVisible = ref(false)
const uploadRef = ref(null)
const uploadedFile = ref(null)
const importing = ref(false)
const importMode = ref('append') // 导入模式：append=追加，overwrite=覆盖

function openExcelImport() {
  if (!doc.value.templateId) { ElMessage.warning('请先选择补录模板'); return }
  importMode.value = 'append' // 重置为追加模式
  uploadedFile.value = null
  excelImportVisible.value = true
}

function beforeUpload(file) {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
  if (!isExcel) {
    ElMessage.error('只支持 .xlsx / .xls 格式的 Excel 文件')
    return false
  }
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 20MB')
    return false
  }
  uploadedFile.value = file
  return false  // 阻止自动上传
}

function handleExcelImport() {
  if (!uploadedFile.value) { ElMessage.warning('请先选择要上传的文件'); return }
  if (!importMode.value) { ElMessage.warning('请选择导入模式'); return }

  // 二次确认
  const modeText = importMode.value === 'overwrite' ? '批量覆盖' : '追加'
  const confirmText = importMode.value === 'overwrite'
    ? '确认执行批量覆盖？此操作将删除所有现有数据后重新导入，此操作不可撤销！'
    : '确认执行追加导入？导入的数据将追加到现有数据之后。'

  ElMessageBox.confirm(confirmText, `${modeText}确认`, {
    type: 'warning',
    confirmButtonText: '确认导入',
    cancelButtonText: '取消',
    distinguishCancelAndClose: true,
  }).then(() => {
    executeImport()
  }).catch(() => {
    ElMessage.info('已取消导入')
  })
}

function executeImport() {
  importing.value = true

  // 模拟导入处理
  setTimeout(() => {
    importing.value = false

    // 模拟导入成功，生成3行数据
    const newRows = [
      { rowNo: 1, cells: { org_code: 'UNIT_CA', period: '2026-10', subject_code: '6001', subject_name: '营业收入', debit_amount: '800000.00', credit_amount: '800000.00', currency: 'CNY' }, errors: {} },
      { rowNo: 2, cells: { org_code: 'UNIT_CA', period: '2026-10', subject_code: '6602', subject_name: '管理费用', debit_amount: '250000.00', credit_amount: '250000.00', currency: 'CNY' }, errors: {} },
      { rowNo: 3, cells: { org_code: 'UNIT_CA', period: '2026-10', subject_code: '6603', subject_name: '财务费用', debit_amount: '120000.00', credit_amount: '120000.00', currency: 'CNY' }, errors: {} },
    ]

    if (importMode.value === 'overwrite') {
      // 覆盖模式：删除所有现有数据，重新插入
      dataRows.value = newRows
      ElMessage.success(`批量覆盖成功，已删除原有数据并导入 ${newRows.length} 行新数据`)
    } else {
      // 追加模式：在现有数据后追加
      const maxNo = dataRows.value.length ? Math.max(...dataRows.value.map(r => r.rowNo)) : 0
      newRows.forEach((row, idx) => {
        row.rowNo = maxNo + idx + 1
      })
      dataRows.value.push(...newRows)
      ElMessage.success(`追加导入成功，新增 ${newRows.length} 行数据`)
    }

    excelImportVisible.value = false
    uploadedFile.value = null
  }, 1500)
}

function downloadTemplate() {
  ElMessage.success(`已下载「${doc.value.templateName}」导入模板`)
}

function closeExcelImport() {
  excelImportVisible.value = false
  uploadedFile.value = null
}

const selectedRowIdxs  = ref([])

// 字段渲染辅助
function getFieldOptions(field) {
  return field.enumOptions || []
}

// 附件字段处理
function getCellAttachments(row, fieldCode) {
  const value = row.cells[fieldCode]
  if (!value) return []
  try {
    return Array.isArray(value) ? value : JSON.parse(value)
  } catch {
    return []
  }
}

function handleCellAttachmentUpload(row, fieldCode, file) {
  // 模拟文件上传
  const fileId = Date.now() + Math.random()
  const newFile = {
    id: fileId,
    name: file.name,
    size: file.size,
    type: getFileType(file.name),
    uploadTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    url: URL.createObjectURL(file), // 模拟URL
  }

  const attachments = getCellAttachments(row, fieldCode)
  attachments.push(newFile)
  row.cells[fieldCode] = JSON.stringify(attachments)
  ElMessage.success(`已上传文件：${file.name}`)
  return false // 阻止自动上传
}

function removeCellAttachment(row, fieldCode, fileId) {
  const attachments = getCellAttachments(row, fieldCode)
  const filtered = attachments.filter(f => f.id !== fileId)
  row.cells[fieldCode] = filtered.length > 0 ? JSON.stringify(filtered) : ''
  ElMessage.success('已删除附件')
}

function previewCellAttachment(file) {
  if (file.type === 'image') {
    // 图片预览
    ElMessageBox.alert(
      `<img src="${file.url}" style="max-width:100%;max-height:500px" />`,
      file.name,
      { dangerouslyUseHTMLString: true, customClass: 'preview-dialog' }
    )
  } else {
    // 其他文件下载
    ElMessage.info(`预览文件：${file.name}`)
    // 实际项目中这里应该调用下载或预览接口
  }
}

function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image'
  if (['pdf'].includes(ext)) return 'pdf'
  if (['doc', 'docx'].includes(ext)) return 'word'
  if (['xls', 'xlsx'].includes(ext)) return 'excel'
  if (['ppt', 'pptx'].includes(ext)) return 'ppt'
  return 'file'
}

function getFileIcon(type) {
  const iconMap = {
    image: 'Picture',
    pdf: 'Document',
    word: 'Document',
    excel: 'Document',
    ppt: 'Document',
    file: 'Document',
  }
  return iconMap[type] || 'Document'
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}


// 简单前置校验（必填检查）
function validateRows() {
  let hasError = false
  dataRows.value.forEach(row => {
    fields.value.filter(f => f.isRequired).forEach(f => {
      if (!row.cells[f.fieldCode]) {
        row.errors[f.fieldCode] = `${f.fieldName}不能为空`
        hasError = true
      } else {
        delete row.errors[f.fieldCode]
      }
    })
  })
  return !hasError
}

function saveDraft() {
  ElMessage.success('草稿已保存')
}

function submitDoc() {
  if (!doc.value.fillReason) { ElMessage.warning('请填写补录原因'); return }
  if (!validateRows())       { ElMessage.error('存在校验错误，请修正后再提交'); return }

  const confirmText = isAppendMode.value
    ? '确认提交新批次数据进入审批？提交后将创建新的审批批次。'
    : '确认提交单据进入审批？提交后基础字段将锁定。'

  ElMessageBox.confirm(confirmText, '提交确认', {
    type: 'warning', confirmButtonText: '确认提交',
  }).then(() => {
    if (isAppendMode.value) {
      // 追加模式：保持单据状态为已归档，创建新的审批批次
      ElMessage.success('新批次数据已提交审批，等待审核通过后自动归档')
    } else {
      // 普通模式：更新单据状态为待审批
      doc.value.status = 'PENDING'
      ElMessage.success('单据已提交审批')
    }
    router.push('/document/list')
  }).catch(() => {})
}

function goBack() { router.push('/document/list') }

// 字段类型标签
const fieldTypeLabel = Object.fromEntries(FIELD_TYPES.map(t => [t.value, t.label]))
</script>

<template>
  <div v-if="doc">
    <!-- 顶部 -->
    <div class="page-header" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px">
        <el-button :icon="'ArrowLeft'" circle size="small" @click="goBack" />
        <div>
          <div class="page-title">
            {{ isAppendMode ? '数据补录' : (isReadOnly ? '查看单据' : '数据录入') }}
            <el-tag :type="DOC_STATUS[doc.status].type" size="small" style="margin-left:8px">
              {{ DOC_STATUS[doc.status].label }}
            </el-tag>
            <el-tag v-if="isAppendMode" type="success" size="small" style="margin-left:4px">追加批次</el-tag>
            <el-tag v-if="doc.docType === 'CORRECTION'" type="warning" size="small" style="margin-left:4px">更正单</el-tag>
          </div>
          <div class="page-desc">{{ doc.docNo }} · {{ doc.templateName }} · 填报：{{ doc.createBy }}</div>
        </div>
      </div>
      <div v-if="!isReadOnly" style="display:flex;gap:8px">
        <el-button @click="saveDraft">保存</el-button>
        <el-button @click="goBack">返回</el-button>
      </div>
    </div>

    <!-- 驳回原因提示（REJECTED状态） -->
    <el-alert
      v-if="doc.status === 'REJECTED'"
      type="error"
      :closable="false"
      style="margin-bottom:16px"
    >
      <template #title>
        <span style="font-weight:600">审核驳回：</span>请修正后重新提交
      </template>
      <div style="margin-top:4px;color:#666">请在详情页查看具体驳回原因，或直接修改数据后重新提交。</div>
    </el-alert>

    <!-- 追加模式提示 -->
    <el-alert
      v-if="isAppendMode"
      type="success"
      :closable="false"
      style="margin-bottom:16px"
    >
      <template #title>
        <span style="font-weight:600">数据补录模式（追加批次）</span>
      </template>
      <div style="margin-top:8px;color:#666;line-height:1.6">
        <div>• 本次补录将作为新批次提交审批，审批通过后自动归档</div>
        <div>• 可以随时为非周期模板追加新的数据记录</div>
        <div>• 每批次数据独立审批，互不影响</div>
      </div>
    </el-alert>

    <!-- 从模板单据提示 -->
    <el-alert
      v-if="doc.masterDocId"
      type="info"
      :closable="false"
      style="margin-bottom:16px"
    >
      <template #title>
        <span style="font-weight:600">本单据为从模板单据</span>
      </template>
      <div style="margin-top:8px;color:#666">
        数据表格中<strong>灰色背景的字段</strong>来自主模板单据，已自动填充且不可修改。
        请填写白色背景的从模板字段完成数据补录。
      </div>
    </el-alert>

    <!-- 单据基础信息（可折叠） -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header>
        <div
          style="display:flex;justify-content:space-between;align-items:center;cursor:pointer"
          @click="baseInfoCollapsed = !baseInfoCollapsed"
        >
          <span style="font-weight:600">单据基础信息</span>
          <el-icon :class="{ 'rotate-icon': baseInfoCollapsed }">
            <ArrowDown />
          </el-icon>
        </div>
      </template>

      <el-collapse-transition>
        <div v-show="!baseInfoCollapsed">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="单据编号">{{ doc.docNo }}</el-descriptions-item>
            <el-descriptions-item label="单据名称">{{ doc.docName }}</el-descriptions-item>
            <el-descriptions-item label="补录模板">{{ doc.templateName }}</el-descriptions-item>
            <el-descriptions-item label="所属单位">{{ doc.orgName }}</el-descriptions-item>
            <el-descriptions-item label="账期">{{ doc.accountPeriod }}</el-descriptions-item>
            <el-descriptions-item label="单据状态">
              <el-tag :type="DOC_STATUS[doc.status]?.type">{{ DOC_STATUS[doc.status]?.label }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="补录原因" :span="3">
              {{ doc.fillReason || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="缺失说明" :span="3">
              {{ doc.missDesc || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="业务依据" :span="3">
              {{ doc.bizBasis || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建人">{{ doc.createBy }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ doc.createTime }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ doc.updateTime }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </el-collapse-transition>
    </el-card>

    <!-- 数据录入区 -->
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-weight:600">数据录入（共 {{ dataRows.length }} 行）</span>
            <el-tooltip placement="top" width="280">
              <template #content>
                <div style="line-height:1.6">
                  <div style="font-weight:600;margin-bottom:8px">单据数据支持三种生成方式：</div>
                  <div>1. 手动录入：点击"添加行"逐行填写</div>
                  <div>2. Excel导入：通过"Excel导入"菜单批量导入</div>
                  <div>3. 接口写入：通过API自动写入数据</div>
                </div>
              </template>
              <el-icon style="color:#909399;cursor:help"><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
          <div v-if="!isReadOnly" style="display:flex;gap:8px">
            <el-button size="small" :icon="'Upload'" @click="openExcelImport">Excel导入</el-button>
            <el-button size="small" type="primary" :icon="'Plus'" @click="addRow">添加行</el-button>
          </div>
        </div>
      </template>

      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th v-if="!isReadOnly" style="width:32px;text-align:center;padding:0">
                <el-checkbox
                  :model-value="selectedRowIdxs.length === dataRows.length && dataRows.length > 0"
                  @change="v => selectedRowIdxs = v ? dataRows.map((_, i) => i) : []"
                />
              </th>
              <th style="width:50px">序号</th>
              <th v-for="f in fields" :key="f.fieldCode" :class="{ 'master-field-header': f.fromMaster }">
                <span v-if="f.isRequired" style="color:#ff4d4f;margin-right:2px">*</span>
                {{ f.fieldName }}
                <el-tooltip v-if="f.remark" :content="f.remark" placement="top" effect="light">
                  <el-icon style="margin-left:4px;color:#909399;cursor:help"><QuestionFilled /></el-icon>
                </el-tooltip>
                <el-icon v-if="f.fromMaster" style="margin-left:4px" title="主模板字段（只读）"><Lock /></el-icon>
                <el-tag v-if="f.isSensitive" size="small" type="warning" style="margin-left:2px">敏感</el-tag>
              </th>
              <th v-if="!isReadOnly" style="width:90px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in dataRows" :key="row.rowNo">
              <td v-if="!isReadOnly" style="width:32px;text-align:center;padding:0">
                <el-checkbox
                  :model-value="selectedRowIdxs.includes(idx)"
                  @change="v => v ? selectedRowIdxs.push(idx) : selectedRowIdxs.splice(selectedRowIdxs.indexOf(idx),1)"
                />
              </td>
              <td style="text-align:center;color:#888;font-size:12px">{{ idx + 1 }}</td>
              <td
                v-for="f in fields" :key="f.fieldCode"
                :class="{ 'cell-error': row.errors[f.fieldCode], 'master-field-cell': f.fromMaster }"
              >
                <!-- 主模板字段：始终只读显示 -->
                <template v-if="f.fromMaster">
                  <span style="color:#666">
                    {{ row.cells[f.fieldCode] || '—' }}
                  </span>
                </template>

                <!-- 只读展示 -->
                <template v-else-if="isReadOnly || !row.editing">
                  <!-- 附件类型字段 -->
                  <template v-if="f.fieldType === 'ATTACHMENT'">
                    <div v-if="getCellAttachments(row, f.fieldCode).length > 0" style="display:flex;flex-wrap:wrap;gap:4px">
                      <el-tag
                        v-for="file in getCellAttachments(row, f.fieldCode)"
                        :key="file.id"
                        size="small"
                        style="cursor:pointer"
                        @click="previewCellAttachment(file)"
                      >
                        <el-icon style="margin-right:4px"><component :is="getFileIcon(file.type)" /></el-icon>
                        {{ file.name }}
                      </el-tag>
                    </div>
                    <span v-else style="color:#ccc">—</span>
                  </template>
                  <!-- 其他类型字段 -->
                  <span v-else :style="f.isSensitive ? 'color:#aaa' : ''">
                    {{ f.isSensitive ? maskValue(row.cells[f.fieldCode]) : (row.cells[f.fieldCode] || '—') }}
                  </span>
                </template>

                <!-- 可编辑：按字段类型渲染控件 -->
                <template v-else>
                  <el-tooltip v-if="row.errors[f.fieldCode]" :content="row.errors[f.fieldCode]" placement="top">
                    <el-icon style="color:#ff4d4f;float:right"><Warning /></el-icon>
                  </el-tooltip>

                  <!-- 附件类型 -->
                  <div v-if="f.fieldType === 'ATTACHMENT'" style="min-width:200px">
                    <div v-if="getCellAttachments(row, f.fieldCode).length > 0" style="margin-bottom:8px">
                      <div
                        v-for="file in getCellAttachments(row, f.fieldCode)"
                        :key="file.id"
                        style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;background:#f5f5f5;border-radius:4px;margin-bottom:4px"
                      >
                        <div style="display:flex;align-items:center;gap:6px;flex:1;overflow:hidden">
                          <el-icon :style="{ color: file.type === 'image' ? '#52c41a' : '#1677ff' }">
                            <component :is="getFileIcon(file.type)" />
                          </el-icon>
                          <span
                            style="font-size:12px;cursor:pointer;color:#1677ff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                            @click="previewCellAttachment(file)"
                            :title="file.name"
                          >
                            {{ file.name }}
                          </span>
                          <span style="font-size:11px;color:#999">{{ formatFileSize(file.size) }}</span>
                        </div>
                        <el-icon
                          style="color:#ff4d4f;cursor:pointer;margin-left:8px"
                          @click="removeCellAttachment(row, f.fieldCode, file.id)"
                        >
                          <Close />
                        </el-icon>
                      </div>
                    </div>
                    <el-upload
                      :auto-upload="false"
                      :show-file-list="false"
                      :before-upload="(file) => handleCellAttachmentUpload(row, f.fieldCode, file)"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    >
                      <el-button size="small" :icon="'Upload'" style="width:100%"></el-button>
                    </el-upload>
                  </div>

                  <el-input
                    v-else-if="['TEXT','MASTER_DATA'].includes(f.fieldType)"
                    v-model="row.cells[f.fieldCode]"
                    size="small" clearable
                    :placeholder="f.fieldName"
                    @input="delete row.errors[f.fieldCode]"
                  />
                  <el-input-number
                    v-else-if="f.fieldType === 'NUMBER'"
                    v-model="row.cells[f.fieldCode]"
                    size="small"
                    :precision="f.decimalScale ?? 2"
                    :min="f.minValue ?? undefined"
                    :max="f.maxValue ?? undefined"
                    style="width:100%"
                    @change="delete row.errors[f.fieldCode]"
                  />
                  <el-date-picker
                    v-else-if="f.fieldType === 'DATE'"
                    v-model="row.cells[f.fieldCode]"
                    size="small"
                    :type="f.dateFormat === 'yyyy-MM' ? 'month' : 'date'"
                    :value-format="f.dateFormat === 'yyyy-MM' ? 'YYYY-MM' : 'YYYY-MM-DD'"
                    style="width:100%"
                  />
                  <el-select
                    v-else-if="['ENUM','RADIO'].includes(f.fieldType)"
                    v-model="row.cells[f.fieldCode]"
                    size="small" clearable style="width:100%"
                  >
                    <el-option v-for="opt in getFieldOptions(f)" :key="opt.value" :label="opt.label" :value="opt.value" />
                  </el-select>
                  <el-checkbox-group
                    v-else-if="f.fieldType === 'CHECKBOX'"
                    v-model="row.cells[f.fieldCode]"
                    size="small"
                  >
                    <el-checkbox v-for="opt in getFieldOptions(f)" :key="opt.value" :value="opt.value">{{ opt.label }}</el-checkbox>
                  </el-checkbox-group>
                </template>
              </td>
              <td v-if="!isReadOnly" style="text-align:center">
                <!-- 编辑状态：显示保存和取消按钮 -->
                <template v-if="row.editing">
                  <el-button link size="small" :icon="'Select'" type="success" @click="saveRow(row)" title="保存" />
                  <el-button link size="small" :icon="'Close'" @click="cancelEditRow(row)" title="取消" />
                  <el-button link size="small" :icon="'CopyDocument'" @click="copyRow(idx)" title="复制行" />
                  <el-button link size="small" :icon="'Delete'" type="danger" @click="deleteRow(idx)" title="删除行" />
                </template>
                <!-- 非编辑状态：显示编辑按钮 -->
                <template v-else>
                  <el-button link size="small" :icon="'Edit'" type="primary" @click="editRow(row)" title="编辑" />
                  <el-button link size="small" :icon="'CopyDocument'" @click="copyRow(idx)" title="复制行" />
                  <el-button link size="small" :icon="'Delete'" type="danger" @click="deleteRow(idx)" title="删除行" />
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </el-card>

    <!-- 附件上传区 -->
    <el-card shadow="never" style="margin-top:16px">
      <template #header>
        <span style="font-weight:600">佐证附件</span>
        <span style="font-size:12px;color:#888;margin-left:8px">（上传凭证、台账、单据截图等佐证材料）</span>
      </template>
      <AttachmentUpload v-model="attachments" :disabled="isReadOnly" />
    </el-card>

    <!-- Excel导入弹窗 -->
    <el-dialog v-model="excelImportVisible" title="Excel 批量导入" width="1000px" @close="closeExcelImport">
      <el-alert type="warning" :closable="false" style="margin-bottom:16px">
        <template #default>
          <div style="font-size:13px;line-height:1.6">
            <div style="font-weight:600;margin-bottom:8px">导入模式说明：</div>
            <div><strong>追加模式：</strong>导入的数据将追加到现有数据之后（保留原有数据）</div>
            <div style="margin-top:4px"><strong>批量覆盖：</strong>删除所有现有数据后重新导入（不可撤销，请谨慎选择）</div>
          </div>
        </template>
      </el-alert>

      <el-form-item label="当前模板">
          <span style="font-size:14px;color:#333">{{ doc.templateName }}</span>
          <el-button style="margin-left:12px" size="small" :icon="'Download'" @click="downloadTemplate">
            下载导入模板
          </el-button>
        </el-form-item>

      <el-form label-width="90px">
        <el-form-item label="导入模式" required>
          <el-radio-group v-model="importMode">
            <el-radio value="append">
              追加
              <el-tooltip content="导入的数据追加到现有数据之后，不影响原有数据" placement="top">
                <el-icon style="margin-left:4px;color:#909399;cursor:help"><QuestionFilled /></el-icon>
              </el-tooltip>
            </el-radio>
            <el-radio value="overwrite">
              批量覆盖
              <el-tooltip content="删除所有现有数据后重新导入，此操作不可撤销" placement="top">
                <el-icon style="margin-left:4px;color:#909399;cursor:help"><QuestionFilled /></el-icon>
              </el-tooltip>
            </el-radio>
          </el-radio-group>
          <div v-if="importMode === 'overwrite'" style="font-size:12px;color:#ff4d4f;margin-top:8px">
            <el-icon><WarningFilled /></el-icon>
            警告：批量覆盖将删除当前所有 {{ dataRows.length }} 行数据，请确认操作无误
          </div>
        </el-form-item>

        <el-form-item label="上传文件" required>
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :before-upload="beforeUpload"
            :on-change="(f) => { uploadedFile = f.raw }"
            :show-file-list="false"
            accept=".xlsx,.xls"
            drag
            style="width:100%"
          >
            <div class="upload-inner">
              <el-icon v-if="!uploadedFile" class="upload-icon"><UploadFilled /></el-icon>
              <el-icon v-else class="upload-icon" style="color:#52c41a"><CircleCheck /></el-icon>
              <div class="upload-text">
                <template v-if="!uploadedFile">
                  将 Excel 拖到此处，或 <em>点击选择文件</em>
                </template>
                <template v-else>
                  <strong>{{ uploadedFile.name }}</strong>
                  <span style="color:#aaa;margin-left:6px">{{ (uploadedFile.size / 1024).toFixed(1) }} KB</span>
                </template>
              </div>
              <div class="upload-hint">支持 .xlsx / .xls，最大 20MB</div>
            </div>
          </el-upload>
        </el-form-item>
      </el-form>

      <!-- 导入历史 -->
      <el-divider content-position="left">
        <span style="font-size:14px;color:#666;display:flex;align-items:center;gap:6px">
          <el-icon><Clock /></el-icon>
          导入历史（{{ importHistory.length }} 条）
        </span>
      </el-divider>

      <el-empty v-if="importHistory.length === 0" description="暂无导入记录" :image-size="60" />
      <el-table v-else :data="importHistory" style="width:100%" stripe size="small" max-height="300">
        <el-table-column label="导入模式" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.importMode === 'overwrite' ? 'danger' : 'info'">
              {{ row.importMode === 'overwrite' ? '覆盖' : '追加' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="fileName" label="文件名" min-width="200">
          <template #default="{ row }">
            <el-icon style="margin-right:4px;color:#52c41a"><Document /></el-icon>
            {{ row.fileName }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="IMPORT_STATUS[row.taskStatus].type" size="small">
              {{ IMPORT_STATUS[row.taskStatus].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理结果" width="180">
          <template #default="{ row }">
            <div v-if="row.taskStatus === 'PROCESSING'">
              <el-progress :percentage="Math.round(row.successRows / row.totalRows * 100)" :stroke-width="6" />
            </div>
            <div v-else style="font-size:12px;color:#666">
              共 {{ row.totalRows }} 行 ·
              <span style="color:#52c41a">成功 {{ row.successRows }}</span>
              <span v-if="row.failRows > 0"> · <span style="color:#ff4d4f">失败 {{ row.failRows }}</span></span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="导入时间" width="150">
          <template #default="{ row }">
            <div style="font-size:12px;color:#666">{{ row.startTime }}</div>
            <div v-if="row.endTime" style="font-size:11px;color:#aaa">{{ row.endTime }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="createBy" label="操作人" width="90" align="center" />
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.failRows > 0"
              link
              type="danger"
              size="small"
              :icon="'Download'"
              @click="downloadErrorFile(row)"
            >
              错误报告
            </el-button>
            <span v-else style="font-size:12px;color:#aaa">—</span>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="closeExcelImport">取消</el-button>
        <el-button v-if="uploadedFile" @click="uploadedFile = null">重新选择</el-button>
        <el-button
          type="primary"
          :loading="importing"
          :disabled="!uploadedFile"
          :icon="'Upload'"
          @click="handleExcelImport"
        >{{ importing ? '导入中...' : '开始导入' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
function maskValue(val) {
  if (!val) return '—'
  if (val.length <= 4) return '***'
  return val.slice(0, 2) + '****' + val.slice(-2)
}
</script>

<style scoped>
.readonly-text { font-size: 14px; color: #333; }

.rotate-icon {
  transform: rotate(-90deg);
  transition: transform 0.3s;
}

.data-table-wrap {
  overflow-x: auto;
  width: 100%;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th,
.data-table td {
  border: 1px solid #f0f0f0;
  padding: 6px 8px;
  white-space: nowrap;
  min-width: 120px;
}
.data-table th {
  background: #fafafa;
  font-weight: 500;
  color: #555;
  text-align: left;
}

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
.data-table tbody tr:hover td { background: #f5f9ff; }
.cell-error { background: #fff2f0 !important; }

.upload-inner {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.upload-icon { font-size: 36px; color: #c0c4cc; }
.upload-text { font-size: 13px; color: #606266; }
.upload-text em { color: #1677ff; font-style: normal; }
.upload-hint { font-size: 12px; color: #aaa; }
</style>

<style>
/* 图片预览对话框样式（非scoped，因为MessageBox在body下） */
.preview-dialog .el-message-box__content {
  text-align: center;
}
.preview-dialog img {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
}
</style>
