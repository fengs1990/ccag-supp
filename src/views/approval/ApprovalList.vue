<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { mockDocuments, mockApprovals, mockDocumentData, DOC_STATUS } from '../../mock/document.js'
import { mockTemplateFields } from '../../mock/template.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const router    = useRouter()
const userStore = useUserStore()

// 审批流配置 mock（模板ID -> 审批节点列表）
const approvalFlowConfig = {
  1: [
    { levelNo: 1, levelName: '初级审核', approverName: '陈志远', approverId: 'u004', mode: 'SINGLE' },
    { levelNo: 2, levelName: '终级审核', approverName: '李明华',  approverId: 'u002', mode: 'SINGLE' },
  ],
  2: [
    { levelNo: 1, levelName: '生产审核', approverName: '陈志远', approverId: 'u004', mode: 'SINGLE' },
  ],
}

// 拼装待审列表：PENDING 状态 + 当前角色是该节点审批人
const pendingList = computed(() => {
  return mockDocuments
    .filter(d => d.status === 'PENDING')
    .map(d => {
      const history  = mockApprovals[d.id] || []
      const flowCfg  = approvalFlowConfig[d.templateId] || []
      // 当前待审级别 = 已完成的审批数 + 1
      const doneCount = history.filter(h => h.action === 'APPROVE').length
      const currentLevel = flowCfg[doneCount] || flowCfg[0]
      return { ...d, currentLevel, flowCfg, history }
    })
    // 审核人只看分配给自己的节点，单位管理员看本单位，集团管理员看全部
    .filter(d => {
      if (userStore.isGroupAdmin) return true
      if (userStore.isReviewer)  return d.currentLevel?.approverId === 'u004'
      if (userStore.isUnitAdmin) return d.orgCode === userStore.currentRole.orgCode
      return false
    })
})

// 已审列表：本角色处理过的
const doneList = computed(() => {
  return mockDocuments
    .filter(d => ['APPROVED','REJECTED','ARCHIVED'].includes(d.status))
    .filter(d => {
      if (userStore.isGroupAdmin) return true
      if (userStore.isUnitAdmin) return d.orgCode === userStore.currentRole.orgCode
      return true
    })
    .slice(0, 10)
})

// 筛选
const filterStatus = ref('')
const activeTab = ref('pending')

// 抽屉：审批详情
const drawerVisible = ref(false)
const currentDoc    = ref(null)
const currentFields = ref([])
const currentRows   = ref([])
const currentHistory = ref([])
const currentFlowCfg = ref([])

function openDrawer(doc) {
  currentDoc.value     = { ...doc }
  currentHistory.value = mockApprovals[doc.id] || []
  currentFlowCfg.value = approvalFlowConfig[doc.templateId] || []

  const tplFields = mockTemplateFields[doc.templateId] || []
  currentFields.value = [...tplFields].sort((a, b) => a.sortOrder - b.sortOrder)

  const raw = mockDocumentData[doc.id] || []
  const rowMap = {}
  raw.filter(r => r.rowStatus === 1).forEach(r => {
    if (!rowMap[r.rowNo]) rowMap[r.rowNo] = { rowNo: r.rowNo, cells: {}, errors: {} }
    rowMap[r.rowNo].cells[r.fieldCode] = r.fieldValue ?? ''
    if (r.validateStatus === 2 && r.validateError) {
      rowMap[r.rowNo].errors[r.fieldCode] = r.validateError
    }
  })
  currentRows.value = Object.values(rowMap).sort((a, b) => a.rowNo - b.rowNo)
  drawerVisible.value = true
}

// 审批弹窗
const approveDialogVisible = ref(false)
const approveAction  = ref('APPROVE')
const rejectReason   = ref('')
const approveDocId   = ref(null)

function openApprove(doc, action) {
  approveDocId.value  = doc.id
  approveAction.value = action
  rejectReason.value  = ''
  approveDialogVisible.value = true
}

function confirmApprove() {
  if (approveAction.value === 'REJECT' && !rejectReason.value) {
    ElMessage.warning('驳回时必须填写驳回原因')
    return
  }
  const doc = mockDocuments.find(d => d.id === approveDocId.value)
  if (!doc) return

  // 更新审批流水
  const history = mockApprovals[approveDocId.value] || []
  const flowCfg = approvalFlowConfig[doc.templateId] || []
  const doneCount = history.filter(h => h.action === 'APPROVE').length
  const currentLevel = flowCfg[doneCount]

  history.push({
    id: Date.now(),
    docId: approveDocId.value,
    levelNo: currentLevel?.levelNo || 1,
    levelName: currentLevel?.levelName || '',
    approverId: 'u002',
    approverName: '李明华',
    action: approveAction.value,
    rejectReason: approveAction.value === 'REJECT' ? rejectReason.value : null,
    actionTime: new Date().toLocaleString('zh-CN'),
  })
  mockApprovals[approveDocId.value] = history

  if (approveAction.value === 'REJECT') {
    doc.status = 'REJECTED'
    ElMessage.success('已驳回，填报人将收到通知')
  } else {
    // 检查是否还有下一级
    const newDoneCount = history.filter(h => h.action === 'APPROVE').length
    if (newDoneCount >= flowCfg.length) {
      doc.status = 'APPROVED'
      ElMessage.success('审批通过，单据状态已更新为【已通过】')
    } else {
      ElMessage.success(`第${currentLevel?.levelNo}级审批通过，流转至下一级审批人`)
    }
  }

  approveDialogVisible.value = false
  drawerVisible.value = false
}

// 审批流节点状态计算
function getNodeStatus(levelNo, history) {
  const approvedCount = history.filter(h => h.action === 'APPROVE').length
  const rejected      = history.some(h => h.action === 'REJECT')
  if (rejected && levelNo > approvedCount) return 'rejected-pending'
  if (levelNo <= approvedCount)            return 'done'
  if (levelNo === approvedCount + 1)       return 'current'
  return 'pending'
}

function getNodeRecord(levelNo, history) {
  return history.find(h => h.levelNo === levelNo)
}

// 审批动作 map
const actionMap = {
  APPROVE:      { label: '审核通过',   color: '#52c41a' },
  REJECT:       { label: '审核驳回',   color: '#ff4d4f' },
  WITHDRAW:     { label: '填报人撤回', color: '#8c8c8c' },
  AUTO_APPROVE: { label: '超时自动通过', color: '#fa8c16' },
  PENDING:      { label: '待审批',     color: '#1677ff' },
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">单据审批</div>
        <div class="page-desc">审批补录单据，查看审批流程进度</div>
      </div>
    </div>

    <el-tabs v-model="activeTab" type="card" class="approval-tabs">

      <!-- 待审Tab -->
      <el-tab-pane name="pending">
        <template #label>
          待审批
          <el-badge v-if="pendingList.length" :value="pendingList.length" style="margin-left:4px" />
        </template>

        <el-empty v-if="!pendingList.length" description="暂无待审批单据" style="padding:40px 0" />

        <div v-else class="approval-card-list">
          <div v-for="doc in pendingList" :key="doc.id" class="approval-card">
            <!-- 卡片头部 -->
            <div class="card-header">
              <div class="card-header-left">
                <span class="doc-no">{{ doc.docNo }}</span>
                <el-tag v-if="doc.docType === 'CORRECTION'" type="warning" size="small">更正单</el-tag>
                <el-tag type="primary" size="small">{{ DOC_STATUS[doc.status]?.label }}</el-tag>
              </div>
              <div class="card-header-right">
                <span class="submit-time">提交于 {{ doc.submitTime }}</span>
              </div>
            </div>

            <!-- 卡片内容 -->
            <div class="card-body">
              <!-- 基本信息：横向铺满 -->
              <div class="card-info-grid">
                <div class="info-item">
                  <span class="info-label">模板</span>
                  <span class="info-val">{{ doc.templateName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">业务域</span>
                  <el-tag size="small" effect="plain">{{ doc.bizDomainLabel }}</el-tag>
                </div>
                <div class="info-item">
                  <span class="info-label">所属单位</span>
                  <span class="info-val">{{ doc.orgName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">填报人</span>
                  <span class="info-val">{{ doc.createBy }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">补录原因</span>
                  <span class="info-val">{{ doc.fillReason }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">截止日期</span>
                  <span class="info-val">{{ doc.deadlineDate }}</span>
                </div>
              </div>

              <!-- 审批流程：横向展示 -->
              <div class="flow-bar">
                <span class="flow-bar-title">审批流程</span>
                <div class="flow-bar-nodes">
                  <!-- 发起节点 -->
                  <div class="bar-node done">
                    <div class="bar-dot done-dot"><el-icon><User /></el-icon></div>
                    <div class="bar-node-info">
                      <div class="bar-node-name">填报人提交</div>
                      <div class="bar-node-sub">{{ doc.createBy }}</div>
                    </div>
                  </div>
                  <div class="bar-line done-line" />

                  <!-- 各审批节点 -->
                  <template v-for="(node, idx) in doc.flowCfg" :key="node.levelNo">
                    <div :class="['bar-node', getNodeStatus(node.levelNo, doc.history)]">
                      <div :class="['bar-dot', getNodeStatus(node.levelNo, doc.history) + '-dot']">
                        <el-icon v-if="getNodeStatus(node.levelNo, doc.history) === 'done'"><Check /></el-icon>
                        <el-icon v-else-if="getNodeStatus(node.levelNo, doc.history) === 'current'"><Loading /></el-icon>
                        <el-icon v-else><More /></el-icon>
                      </div>
                      <div class="bar-node-info">
                        <div class="bar-node-name">{{ node.levelName }}</div>
                        <div class="bar-node-sub">{{ node.approverName }}</div>
                        <template v-if="getNodeRecord(node.levelNo, doc.history)">
                          <div :class="['bar-node-status', getNodeRecord(node.levelNo, doc.history).action === 'APPROVE' ? 'action-pass' : 'action-reject']">
                            {{ actionMap[getNodeRecord(node.levelNo, doc.history).action]?.label }}
                          </div>
                        </template>
                        <div v-else-if="getNodeStatus(node.levelNo, doc.history) === 'current'" class="bar-node-status action-waiting">待审批</div>
                        <div v-else class="bar-node-status" style="color:#ccc">待流转</div>
                      </div>
                    </div>
                    <div v-if="idx < doc.flowCfg.length - 1"
                      :class="['bar-line', getNodeStatus(node.levelNo, doc.history) === 'done' ? 'done-line' : '']"
                    />
                  </template>
                </div>
              </div>
            </div>

            <!-- 卡片底部操作 -->
            <div class="card-footer">
              <el-button size="small" @click="openDrawer(doc)">查看数据详情</el-button>
              <el-button size="small" type="success" @click="openApprove(doc, 'APPROVE')">
                <el-icon><Check /></el-icon> 审核通过
              </el-button>
              <el-button size="small" type="danger" plain @click="openApprove(doc, 'REJECT')">
                <el-icon><Close /></el-icon> 审核驳回
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 已审Tab -->
      <el-tab-pane label="已审历史" name="done">
        <el-table :data="doneList" style="width:100%" stripe>
          <el-table-column prop="docNo" label="单据编号" width="200">
            <template #default="{ row }">
              <el-link type="primary" :underline="false" @click="router.push(`/document/detail/${row.id}`)">
                {{ row.docNo }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="templateName" label="模板"     min-width="150" show-overflow-tooltip />
          <el-table-column prop="orgName"       label="所属单位" width="120" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="DOC_STATUS[row.status]?.type" size="small">{{ DOC_STATUS[row.status]?.label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="submitTime"  label="提交时间" width="160" />
          <el-table-column prop="archiveTime" label="归档时间" width="160">
            <template #default="{ row }">{{ row.archiveTime || '—' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="router.push(`/document/detail/${row.id}`)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

    </el-tabs>

    <!-- 数据详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="`单据详情 — ${currentDoc?.docNo}`"
      size="680px"
      destroy-on-close
    >
      <div v-if="currentDoc">
        <!-- 基本信息 -->
        <el-descriptions :column="2" border size="small" style="margin-bottom:16px">
          <el-descriptions-item label="单据编号">{{ currentDoc.docNo }}</el-descriptions-item>
          <el-descriptions-item label="模板">{{ currentDoc.templateName }}</el-descriptions-item>
          <el-descriptions-item label="填报人">{{ currentDoc.createBy }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ currentDoc.submitTime }}</el-descriptions-item>
          <el-descriptions-item label="补录原因" :span="2">{{ currentDoc.fillReason }}</el-descriptions-item>
          <el-descriptions-item v-if="currentDoc.missDesc" label="缺失说明" :span="2">{{ currentDoc.missDesc }}</el-descriptions-item>
          <el-descriptions-item v-if="currentDoc.bizBasis" label="业务依据" :span="2">{{ currentDoc.bizBasis }}</el-descriptions-item>
        </el-descriptions>

        <!-- 审批流进度（详细版） -->
        <div style="margin-bottom:16px">
          <div style="font-weight:600;font-size:14px;margin-bottom:12px">审批流程进度</div>
          <el-steps :active="currentHistory.filter(h=>h.action==='APPROVE').length + 1" finish-status="success" direction="horizontal">
            <el-step title="已提交" :description="currentDoc.submitTime" />
            <el-step
              v-for="node in currentFlowCfg"
              :key="node.levelNo"
              :title="node.levelName"
              :description="node.approverName"
              :status="getNodeStatus(node.levelNo, currentHistory) === 'done' ? 'finish'
                      : getNodeStatus(node.levelNo, currentHistory) === 'current' ? 'process'
                      : getNodeStatus(node.levelNo, currentHistory) === 'rejected-pending' ? 'error'
                      : 'wait'"
            />
          </el-steps>

          <!-- 审批流水记录 -->
          <div v-if="currentHistory.length" style="margin-top:16px">
            <el-timeline>
              <el-timeline-item
                v-for="h in currentHistory"
                :key="h.id"
                :type="h.action === 'APPROVE' ? 'success' : h.action === 'REJECT' ? 'danger' : 'primary'"
                :timestamp="h.actionTime || '待处理'"
                placement="top"
              >
                <div class="timeline-item">
                  <span class="tl-name">{{ h.approverName }}</span>
                  <el-tag
                    :type="h.action === 'APPROVE' ? 'success' : h.action === 'REJECT' ? 'danger' : 'primary'"
                    size="small" style="margin-left:8px"
                  >{{ actionMap[h.action]?.label }}</el-tag>
                  <div v-if="h.rejectReason" class="tl-reason">驳回原因：{{ h.rejectReason }}</div>
                </div>
              </el-timeline-item>
              <el-timeline-item type="primary" hollow timestamp="等待中" placement="top">
                <span style="color:#1677ff;font-size:13px">等待审核人处理…</span>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>

        <!-- 数据内容 -->
        <div style="font-weight:600;font-size:14px;margin-bottom:10px">
          数据内容（共 {{ currentRows.length }} 行）
        </div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:44px">序号</th>
                <th v-for="f in currentFields" :key="f.fieldCode">{{ f.fieldName }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in currentRows" :key="row.rowNo">
                <td style="text-align:center;color:#888;font-size:12px">{{ idx + 1 }}</td>
                <td
                  v-for="f in currentFields" :key="f.fieldCode"
                  :class="{ 'cell-error': row.errors[f.fieldCode] }"
                >
                  <el-tooltip v-if="row.errors[f.fieldCode]" :content="row.errors[f.fieldCode]" placement="top">
                    <span style="color:#ff4d4f">
                      {{ row.cells[f.fieldCode] || '—' }}
                      <el-icon style="vertical-align:middle"><Warning /></el-icon>
                    </span>
                  </el-tooltip>
                  <span v-else>{{ row.cells[f.fieldCode] || '—' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <template #footer>
        <el-button @click="drawerVisible = false">关闭</el-button>
        <el-button type="danger" plain @click="openApprove(currentDoc, 'REJECT')">
          <el-icon><Close /></el-icon> 驳回
        </el-button>
        <el-button type="success" @click="openApprove(currentDoc, 'APPROVE')">
          <el-icon><Check /></el-icon> 通过
        </el-button>
      </template>
    </el-drawer>

    <!-- 审批确认弹窗 -->
    <el-dialog
      v-model="approveDialogVisible"
      :title="approveAction === 'APPROVE' ? '确认审核通过' : '填写驳回原因'"
      width="440px"
    >
      <el-form label-width="90px">
        <el-form-item v-if="approveAction === 'REJECT'" label="驳回原因" required>
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="4"
            placeholder="请详细说明驳回原因，填报人将收到站内消息通知"
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

  </div>
</template>

<style scoped>
.approval-tabs :deep(.el-tabs__content) { padding-top: 16px; }

.approval-card-list { display: flex; flex-direction: column; gap: 16px; }

.approval-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.approval-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}
.card-header-left { display: flex; align-items: center; gap: 8px; }
.doc-no { font-weight: 600; font-size: 14px; color: #1677ff; }
.submit-time { font-size: 12px; color: #aaa; }

.card-body { padding: 16px 16px 0; }

.card-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 24px;
  margin-bottom: 16px;
}
.info-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.info-label { color: #888; white-space: nowrap; flex-shrink: 0; }
.info-val { color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 横向审批流 */
.flow-bar {
  border-top: 1px solid #f0f0f0;
  padding: 12px 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.flow-bar-title {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  white-space: nowrap;
  margin-top: 6px;
  flex-shrink: 0;
}
.flow-bar-nodes {
  display: flex;
  align-items: flex-start;
  flex-wrap: nowrap;
  overflow-x: auto;
  flex: 1;
  gap: 0;
}

.bar-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 80px;
  flex-shrink: 0;
}
.bar-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  border: 2px solid #e8e8e8;
  background: #fff;
  color: #ccc;
}
.done-dot     { border-color: #52c41a; background: #52c41a; color: #fff; }
.current-dot  { border-color: #1677ff; background: #e6f4ff; color: #1677ff; }
.pending-dot  { border-color: #e8e8e8; background: #fafafa; color: #ccc; }
.rejected-pending-dot { border-color: #e8e8e8; background: #fafafa; color: #ccc; }

.bar-node-info { text-align: center; }
.bar-node-name   { font-size: 12px; font-weight: 500; color: #333; }
.bar-node-sub    { font-size: 11px; color: #888; margin-top: 1px; }
.bar-node-status { font-size: 11px; font-weight: 500; margin-top: 2px; }

/* 横向连接线 */
.bar-line {
  flex: 1;
  height: 2px;
  background: #e8e8e8;
  margin-top: 13px;
  min-width: 24px;
}
.done-line { background: #52c41a; }

.card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

/* 数据表格 */
.data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.data-table th,
.data-table td { border: 1px solid #f0f0f0; padding: 5px 8px; white-space: nowrap; }
.data-table th  { background: #fafafa; font-weight: 500; color: #555; }
.cell-error { background: #fff2f0 !important; }

/* 审批流水 */
.timeline-item { font-size: 13px; }
.tl-name   { font-weight: 500; color: #333; }
.tl-reason { color: #ff4d4f; font-size: 12px; margin-top: 4px; background: #fff2f0; padding: 4px 8px; border-radius: 4px; }
</style>
