<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { mockDocuments, DOC_STATUS } from '../../mock/document.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

// 可导入的单据（草稿和已驳回状态）
const availableDocuments = computed(() => {
  return mockDocuments.filter(d =>
    ['DRAFT', 'REJECTED'].includes(d.status) &&
    (userStore.isReporter ? d.createBy === '张小红' : true)
  )
})

// 第一步：选择单据
const selectedDocId = ref(null)
const selectedDoc = computed(() => mockDocuments.find(d => d.id === selectedDocId.value))

// 上传状态
const uploading     = ref(false)
const uploadRef     = ref(null)
const uploadedFile  = ref(null)
const importMode    = ref('append') // 导入模式：append=追加，overwrite=覆盖

// Mock 历史任务列表
const taskList = ref([
  {
    id: 1001,
    docNo: 'DOC-2026-001001',
    docName: '2026年9月财务数据补录',
    docId: 1001,
    templateName: '财务数据补录模板',
    orgName: '长安乘用车',
    accountPeriod: '2026-09',
    fileName: '财务补录数据_2026-10.xlsx',
    importMode: 'append',
    taskStatus: 'SUCCESS',
    totalRows: 120,
    successRows: 120,
    failRows: 0,
    errorFilePath: null,
    startTime: '2026-10-12 10:05:00',
    endTime: '2026-10-12 10:05:18',
    createBy: '张小红',
  },
  {
    id: 1002,
    docNo: 'DOC-2026-001003',
    docName: '2026年7月生产产量数据补录',
    docId: 1003,
    templateName: '生产月度产量补录模板',
    orgName: '长安乘用车',
    accountPeriod: '2026-07',
    fileName: '产量数据_9月.xlsx',
    importMode: 'overwrite',
    taskStatus: 'PARTIAL',
    totalRows: 50,
    successRows: 43,
    failRows: 7,
    errorFilePath: 'error_report_1002.xlsx',
    startTime: '2026-10-11 14:30:00',
    endTime: '2026-10-11 14:30:22',
    createBy: '张小红',
  },
  {
    id: 1003,
    docNo: 'DOC-2026-001001',
    docName: '2026年9月财务数据补录',
    docId: 1001,
    templateName: '财务数据补录模板',
    orgName: '长安乘用车',
    accountPeriod: '2026-09',
    fileName: '财务数据_8月_修正版.xlsx',
    importMode: 'append',
    taskStatus: 'FAILED',
    totalRows: null,
    successRows: 0,
    failRows: null,
    errorFilePath: null,
    startTime: '2026-10-10 09:00:00',
    endTime: '2026-10-10 09:00:03',
    errorMsg: '文件格式错误：首行字段与模板不匹配，请下载最新模板重新填写',
    createBy: '张小红',
  },
  {
    id: 1004,
    docNo: 'DOC-2026-001004',
    docName: '2026年7月财务数据补录',
    docId: 1004,
    templateName: '财务数据补录模板',
    orgName: '长安乘用车',
    accountPeriod: '2026-07',
    fileName: '财务补录_测试.xlsx',
    importMode: 'append',
    taskStatus: 'PROCESSING',
    totalRows: 2000,
    successRows: null,
    failRows: null,
    errorFilePath: null,
    startTime: '2026-10-16 10:00:00',
    endTime: null,
    createBy: '张小红',
  },
])

// 任务状态映射
const TASK_STATUS = {
  PENDING:    { label: '待处理',   type: 'info' },
  PROCESSING: { label: '处理中',   type: 'primary' },
  SUCCESS:    { label: '全部成功', type: 'success' },
  PARTIAL:    { label: '部分成功', type: 'warning' },
  FAILED:     { label: '失败',     type: 'danger' },
}

// 模拟上传流程
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
  return false  // 阻止自动上传，手动控制
}

function handleUpload() {
  if (!selectedDocId.value) { ElMessage.warning('请先选择要导入的单据'); return }
  if (!uploadedFile.value)  { ElMessage.warning('请先选择要上传的文件'); return }
  if (!importMode.value)    { ElMessage.warning('请选择导入模式'); return }

  // 二次确认
  const modeText = importMode.value === 'overwrite' ? '批量覆盖' : '追加'
  const confirmText = importMode.value === 'overwrite'
    ? '确认执行批量覆盖？此操作将删除单据中所有现有数据后重新导入，此操作不可撤销！'
    : '确认执行追加导入？导入的数据将追加到单据现有数据之后。'

  ElMessageBox.confirm(confirmText, `${modeText}确认`, {
    type: 'warning',
    confirmButtonText: '确认导入',
    cancelButtonText: '取消',
    distinguishCancelAndClose: true,
  }).then(() => {
    executeUpload()
  }).catch(() => {
    ElMessage.info('已取消导入')
  })
}

function executeUpload() {
  uploading.value = true

  // 模拟异步处理
  setTimeout(() => {
    uploading.value = false
    const doc = selectedDoc.value
    const newTask = {
      id: Date.now(),
      docNo: doc.docNo,
      docName: doc.docName,
      docId: doc.id,
      templateName: doc.templateName,
      orgName: doc.orgName,
      accountPeriod: doc.accountPeriod,
      fileName: uploadedFile.value.name,
      importMode: importMode.value,
      taskStatus: 'PROCESSING',
      totalRows: Math.floor(Math.random() * 500) + 50,
      successRows: null,
      failRows: null,
      errorFilePath: null,
      startTime: new Date().toLocaleString('zh-CN'),
      endTime: null,
      createBy: userStore.currentRole.label,
    }
    taskList.value.unshift(newTask)
    uploadedFile.value = null
    selectedDocId.value = null
    importMode.value = 'append' // 重置为追加模式

    const modeLabel = newTask.importMode === 'overwrite' ? '批量覆盖' : '追加'
    ElMessage.success(`文件已提交（${modeLabel}模式），正在异步处理，完成后将通知您`)

    // 模拟5秒后处理完成
    setTimeout(() => {
      const task = taskList.value.find(t => t.id === newTask.id)
      if (task) {
        const hasError = Math.random() > 0.7
        task.taskStatus   = hasError ? 'PARTIAL' : 'SUCCESS'
        task.successRows  = hasError ? task.totalRows - 3 : task.totalRows
        task.failRows     = hasError ? 3 : 0
        task.errorFilePath= hasError ? `error_report_${task.id}.xlsx` : null
        task.endTime      = new Date().toLocaleString('zh-CN')

        const modeText = task.importMode === 'overwrite' ? '（批量覆盖）' : ''
        ElMessage.success(`导入完成${modeText}：成功 ${task.successRows} 行${hasError ? `，失败 ${task.failRows} 行` : ''}`)
      }
    }, 5000)
  }, 800)
}

function downloadTemplate() {
  if (!selectedDocId.value) { ElMessage.warning('请先选择单据'); return }
  ElMessage.success(`已下载「${selectedDoc.value?.templateName}」标准导入模板`)
}

function viewDocument(task) {
  router.push(`/document/edit/${task.docId}`)
}

function downloadErrorReport(task) {
  ElMessage.success(`已下载错误清单：${task.errorFilePath}`)
}

function retryTask(task) {
  ElMessage.info('请重新上传修正后的文件')
}

// 进度百分比
function getProgress(task) {
  if (!task.totalRows) return 0
  if (task.taskStatus === 'SUCCESS') return 100
  if (task.taskStatus === 'PARTIAL' && task.successRows != null) {
    return Math.round(task.successRows / task.totalRows * 100)
  }
  if (task.taskStatus === 'PROCESSING') return 60
  return 0
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">单据导入管理</div>
        <div class="page-desc">选择已创建的单据，批量导入数据行</div>
      </div>
    </div>

    <!-- 上传区域：左右两栏 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header>
        <span style="font-weight:600">上传导入文件</span>
      </template>

      <el-row :gutter="24">
        <!-- 左侧：操作区 -->
        <el-col :span="14">
          <el-form label-width="100px">
            <el-form-item label="选择单据" required>
              <el-select
                v-model="selectedDocId"
                placeholder="请选择要导入数据的单据"
                style="width:380px"
                @change="uploadedFile = null"
              >
                <el-option
                  v-for="d in availableDocuments"
                  :key="d.id"
                  :label="d.docName"
                  :value="d.id"
                >
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span>{{ d.docName }}</span>
                    <div style="display:flex;gap:4px">
                      <el-tag size="small" type="primary" effect="plain">{{ d.accountPeriod }}</el-tag>
                      <el-tag size="small" :type="DOC_STATUS[d.status].type" effect="plain">{{ DOC_STATUS[d.status].label }}</el-tag>
                    </div>
                  </div>
                </el-option>
              </el-select>
              <el-button
                v-if="selectedDocId"
                style="margin-left:8px"
                :icon="'Download'"
                size="small"
                @click="downloadTemplate"
              >下载模板</el-button>
            </el-form-item>

            <el-form-item v-if="selectedDoc" label="单据信息">
              <div style="font-size:13px;color:#666;line-height:1.8">
                <div><span style="color:#888">单据编号：</span>{{ selectedDoc.docNo }}</div>
                <div><span style="color:#888">所属单位：</span>{{ selectedDoc.orgName }}</div>
                <div><span style="color:#888">账期：</span>{{ selectedDoc.accountPeriod }}</div>
                <div><span style="color:#888">模板：</span>{{ selectedDoc.templateName }}</div>
              </div>
            </el-form-item>

            <el-form-item v-if="selectedDoc" label="导入模式" required>
              <el-radio-group v-model="importMode">
                <el-radio value="append">
                  追加
                  <el-tooltip content="导入的数据追加到单据现有数据之后，不影响原有数据" placement="top">
                    <el-icon style="margin-left:4px;color:#909399;cursor:help"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </el-radio>
                <el-radio value="overwrite">
                  批量覆盖
                  <el-tooltip content="删除单据中所有现有数据后重新导入，此操作不可撤销" placement="top">
                    <el-icon style="margin-left:4px;color:#909399;cursor:help"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </el-radio>
              </el-radio-group>
              <div v-if="importMode === 'overwrite'" style="font-size:12px;color:#ff4d4f;margin-top:8px">
                <el-icon><WarningFilled /></el-icon>
                警告：批量覆盖将删除单据中所有现有数据，请确认操作无误
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
                style="width:360px"
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

            <el-form-item label=" ">
              <el-button
                type="primary"
                :loading="uploading"
                :disabled="!selectedDocId || !uploadedFile"
                :icon="'Upload'"
                @click="handleUpload"
              >{{ uploading ? '上传中...' : '提交导入' }}</el-button>
              <el-button v-if="uploadedFile" @click="uploadedFile = null">重新选择</el-button>
            </el-form-item>
          </el-form>
        </el-col>

        <!-- 右侧：说明 + 步骤 -->
        <el-col :span="10">
          <div class="guide-panel">
            <div class="guide-title">操作步骤</div>
            <div class="guide-steps">
              <div class="guide-step">
                <div class="step-num">1</div>
                <div class="step-text">选择已创建的补录单据（草稿或已驳回状态）</div>
              </div>
              <div class="guide-step">
                <div class="step-num">2</div>
                <div class="step-text">选择导入模式：追加或批量覆盖</div>
              </div>
              <div class="guide-step">
                <div class="step-num">3</div>
                <div class="step-text">点击「下载模板」获取标准填写格式，按表头填写数据</div>
              </div>
              <div class="guide-step">
                <div class="step-num">4</div>
                <div class="step-text">上传文件，系统异步校验，完成后站内消息通知</div>
              </div>
            </div>
            <div class="guide-tips">
              <div class="tips-title"><el-icon><InfoFilled /></el-icon> 注意事项</div>
              <ul>
                <li><strong>追加模式：</strong>导入的数据追加到单据数据之后</li>
                <li><strong>批量覆盖：</strong>删除所有现有数据后重新导入（不可撤销）</li>
                <li>存在错误行时生成错误清单供下载，修正后重新上传</li>
                <li>校验规则与在线录入完全一致</li>
              </ul>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 历史任务列表 -->
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600">导入任务历史</span>
          <el-tag type="info" size="small">处理中的任务完成后将自动更新</el-tag>
        </div>
      </template>

      <el-table :data="taskList" style="width:100%" stripe>
        <el-table-column label="单据名称" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="viewDocument(row)">{{ row.docName }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="单据编号" width="160">
          <template #default="{ row }">
            <span style="color:#888;font-size:12px">{{ row.docNo }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="templateName" label="模板" width="160" show-overflow-tooltip />
        <el-table-column prop="orgName" label="所属单位" width="120" />
        <el-table-column prop="accountPeriod" label="账期" width="100" />
        <el-table-column label="导入模式" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.importMode === 'overwrite'" type="warning" size="small">批量覆盖</el-tag>
            <el-tag v-else type="info" size="small">追加</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="fileName" label="文件名" width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="TASK_STATUS[row.taskStatus]?.type" size="small">
              {{ TASK_STATUS[row.taskStatus]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理结果" width="220">
          <template #default="{ row }">
            <template v-if="row.taskStatus === 'PROCESSING'">
              <el-progress :percentage="getProgress(row)" status="striped" striped-flow :duration="10" />
            </template>
            <template v-else-if="row.taskStatus === 'SUCCESS'">
              <span style="color:#52c41a">全部成功 {{ row.successRows }} 行</span>
            </template>
            <template v-else-if="row.taskStatus === 'PARTIAL'">
              <span style="color:#52c41a">成功 {{ row.successRows }}</span>
              <span style="color:#888;margin:0 4px">/</span>
              <span style="color:#ff4d4f">失败 {{ row.failRows }}</span>
              <span style="color:#888"> / 共 {{ row.totalRows }}</span>
            </template>
            <template v-else-if="row.taskStatus === 'FAILED'">
              <el-tooltip :content="row.errorMsg" placement="top">
                <span style="color:#ff4d4f;cursor:help">
                  文件解析失败 <el-icon style="vertical-align:middle"><QuestionFilled /></el-icon>
                </span>
              </el-tooltip>
            </template>
            <template v-else>
              <span style="color:#aaa">—</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="160" />
        <el-table-column prop="endTime" label="完成时间" width="160">
          <template #default="{ row }">{{ row.endTime || '—' }}</template>
        </el-table-column>
        <el-table-column prop="createBy" label="操作人" width="80" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewDocument(row)">查看单据</el-button>
            <el-button
              v-if="row.errorFilePath"
              link type="warning" size="small"
              @click="downloadErrorReport(row)"
            >下载错误清单</el-button>
            <el-button
              v-if="['PARTIAL','FAILED'].includes(row.taskStatus)"
              link type="primary" size="small"
              @click="retryTask(row)"
            >重新上传</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
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

.guide-panel {
  background: #f8f9fc;
  border: 1px solid #e8eaf0;
  border-radius: 6px;
  padding: 16px 20px;
  height: 100%;
}
.guide-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8eaf0;
}
.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}
.guide-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #1677ff;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.step-text {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
}
.guide-tips {
  background: #fff;
  border: 1px solid #e6f4ff;
  border-radius: 4px;
  padding: 10px 12px;
}
.tips-title {
  font-size: 12px;
  font-weight: 500;
  color: #1677ff;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.guide-tips ul {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: #666;
  line-height: 1.8;
}
</style>
