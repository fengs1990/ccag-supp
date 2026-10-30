<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { mockExportApprovals, EXPORT_APPROVAL_STATUS, isExportApprovalValid } from '../../mock/exportApproval.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref(userStore.isGroupAdmin ? 'pending-approvals' : 'my-applications')

// 我的申请
const myApplications = computed(() => {
  return mockExportApprovals.filter(a => a.applicantUserId === userStore.userId)
})

// 单据审批（模板负责人）
const pendingApprovals = computed(() => {
  if (!userStore.isGroupAdmin) return []
  // 简化：集团管理员可以看到所有待审批
  return mockExportApprovals.filter(a => a.status === 'PENDING')
})

// 撤销申请
function cancelApplication(row) {
  ElMessageBox.confirm('确认撤销该申请？', '撤销确认', {
    type: 'warning',
    confirmButtonText: '确认撤销',
  }).then(() => {
    row.status = 'CANCELLED'
    ElMessage.success('申请已撤销')
  }).catch(() => {})
}

// 审批弹窗
const approveDialogVisible = ref(false)
const approveForm = ref({
  application: null,
  action: 'APPROVED', // APPROVED, REJECTED
  comment: '',
})

function openApproveDialog(row, action) {
  approveForm.value = {
    application: row,
    action: action,
    comment: '',
  }
  approveDialogVisible.value = true
}

function submitApproval() {
  if (!approveForm.value.comment || approveForm.value.comment.trim().length < 5) {
    ElMessage.warning('请填写审批意见')
    return
  }

  const app = approveForm.value.application
  app.status = approveForm.value.action
  app.approveTime = new Date().toLocaleString('zh-CN')
  app.approverUserId = userStore.userId
  app.approverUserName = userStore.currentRole.label
  app.approveComment = approveForm.value.comment

  // 如果通过，设置过期时间（24小时后）
  if (approveForm.value.action === 'APPROVED') {
    const expiryDate = new Date()
    expiryDate.setHours(expiryDate.getHours() + 24)
    app.expiryTime = expiryDate.toLocaleString('zh-CN')
  }

  approveDialogVisible.value = false

  const actionText = approveForm.value.action === 'APPROVED' ? '已通过' : '已驳回'
  ElMessage.success(`申请${actionText}`)
}

// 查看单据
function viewDocument(row) {
  router.push(`/document/detail/${row.docId}`)
}

// 检查审批是否有效
function checkApprovalValid(row) {
  return isExportApprovalValid(row)
}

// 格式化敏感字段显示
function formatSensitiveFields(fieldNames) {
  if (!fieldNames || fieldNames.length === 0) return '—'
  return fieldNames.join('、')
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">敏感数据导出审批</div>
        <div class="page-desc">
          <span v-if="userStore.isGroupAdmin">审批敏感数据导出申请</span>
          <span v-else>查看我的导出申请审批状态</span>
        </div>
      </div>
    </div>

    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <!-- 我的申请 - 仅非集团管理员显示 -->
        <el-tab-pane v-if="!userStore.isGroupAdmin" label="我的申请" name="my-applications">
          <el-table :data="myApplications" stripe style="width:100%">
            <el-table-column label="单据信息" min-width="240">
              <template #default="{ row }">
                <div style="line-height:1.6">
                  <div style="font-weight:500">{{ row.docName }}</div>
                  <div style="font-size:12px;color:#888;margin-top:2px">{{ row.docNo }}</div>
                  <div style="font-size:12px;color:#888;margin-top:2px">数据行数：{{ row.exportRowCount }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="所属模板" min-width="200">
              <template #default="{ row }">
                <div style="line-height:1.6">
                  <div style="font-weight:500">{{ row.templateOrgName }}</div>
                  <div style="margin-top:2px">{{ row.templateName }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="敏感字段" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                <el-tag
                  v-for="(field, idx) in row.sensitiveFieldNames"
                  :key="idx"
                  type="danger"
                  size="small"
                  style="margin-right:4px;margin-bottom:2px"
                >
                  {{ field }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="导出原因" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">{{ row.exportReason }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="EXPORT_APPROVAL_STATUS[row.status].type" size="small">
                  {{ EXPORT_APPROVAL_STATUS[row.status].label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="申请时间" width="160">
              <template #default="{ row }">{{ row.applyTime }}</template>
            </el-table-column>
            <el-table-column label="审批时间" width="160">
              <template #default="{ row }">{{ row.approveTime || '—' }}</template>
            </el-table-column>
            <el-table-column label="审批意见" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.approveComment">{{ row.approveComment }}</span>
                <span v-else style="color:#ccc">—</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button
                  link type="primary" size="small"
                  @click="viewDocument(row)"
                >查看单据</el-button>
                <el-button
                  v-if="row.status === 'PENDING'"
                  link type="warning" size="small"
                  @click="cancelApplication(row)"
                >撤销申请</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无申请记录" :image-size="60" />
            </template>
          </el-table>
        </el-tab-pane>

        <!-- 单据审批 -->
        <el-tab-pane v-if="userStore.isGroupAdmin" name="pending-approvals">
          <template #label>
            单据审批
            <el-badge v-if="pendingApprovals.length > 0" :value="pendingApprovals.length" style="margin-left:8px" />
          </template>

          <el-table :data="pendingApprovals" stripe style="width:100%">
            <el-table-column label="申请方" width="200">
              <template #default="{ row }">
                <div style="line-height:1.6">
                  <div style="font-weight:500">{{ row.applicantOrgName }}</div>
                  <div style="font-size:13px;color:#666;margin-top:2px">{{ row.applicantUserName }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="单据信息" min-width="240">
              <template #default="{ row }">
                <div style="line-height:1.6">
                  <div style="font-weight:500;color:#1677ff">{{ row.docName }}</div>
                  <div style="font-size:12px;color:#888;margin-top:2px">{{ row.docNo }}</div>
                  <div style="font-size:12px;color:#888;margin-top:2px">数据行数：{{ row.exportRowCount }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="敏感字段" min-width="180">
              <template #default="{ row }">
                <el-tag
                  v-for="(field, idx) in row.sensitiveFieldNames"
                  :key="idx"
                  type="danger"
                  size="small"
                  style="margin-right:4px;margin-bottom:2px"
                >
                  {{ field }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="导出原因" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ row.exportReason }}</template>
            </el-table-column>
            <el-table-column label="申请时间" width="160">
              <template #default="{ row }">{{ row.applyTime }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewDocument(row)">查看单据</el-button>
                <el-button link type="success" size="small" @click="openApproveDialog(row, 'APPROVED')">通过</el-button>
                <el-button link type="danger" size="small" @click="openApproveDialog(row, 'REJECTED')">驳回</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无待审批申请" :image-size="60" />
            </template>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 审批弹窗 -->
    <el-dialog
      v-model="approveDialogVisible"
      :title="approveForm.action === 'APPROVED' ? '通过申请' : '驳回申请'"
      width="600px"
    >
      <el-form v-if="approveForm.application" :model="approveForm" label-width="100px">
        <el-form-item label="申请单位">
          <span>{{ approveForm.application.applicantOrgName }}</span>
        </el-form-item>

        <el-form-item label="申请人">
          <span>{{ approveForm.application.applicantUserName }}</span>
        </el-form-item>

        <el-form-item label="单据信息">
          <div style="line-height:1.8">
            <div style="font-weight:500">{{ approveForm.application.docName }}</div>
            <div style="font-size:12px;color:#888;margin-top:2px">{{ approveForm.application.docNo }}</div>
          </div>
        </el-form-item>

        <el-form-item label="敏感字段">
          <div>
            <el-tag
              v-for="(field, idx) in approveForm.application.sensitiveFieldNames"
              :key="idx"
              type="danger"
              size="small"
              style="margin-right:6px;margin-bottom:4px"
            >
              {{ field }}
            </el-tag>
          </div>
        </el-form-item>
        <el-form-item label="导出原因">
          <div style="padding:8px;background:#f5f5f5;border-radius:4px;line-height:1.6">
            {{ approveForm.application.exportReason }}
          </div>
        </el-form-item>

        <el-form-item label="审批意见" required>
          <el-input
            v-model="approveForm.comment"
            type="textarea"
            :rows="3"
            :placeholder="approveForm.action === 'APPROVED' ? '请填写通过意见' : '请说明驳回理由'"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-alert v-if="approveForm.action === 'APPROVED'" type="info" :closable="false">
          <template #default>
            <div style="font-size:13px">
              <div style="font-weight:600;margin-bottom:4px">审批通过后：</div>
              <div>1. 申请人可在 24 小时内导出敏感数据</div>
              <div>2. 超过有效期后需重新申请</div>
              <div>3. 所有导出操作将被记录用于安全审计</div>
            </div>
          </template>
        </el-alert>
      </el-form>

      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button
          :type="approveForm.action === 'APPROVED' ? 'success' : 'danger'"
          @click="submitApproval"
        >
          {{ approveForm.action === 'APPROVED' ? '确认通过' : '确认驳回' }}
        </el-button>
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
