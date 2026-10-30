<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { mockPermissionApplications, PERMISSION_STATUS, getRemainingDays, isPermissionExpiringSoon } from '../../mock/templatePermission.js'
import { mockTemplates } from '../../mock/template.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref(userStore.isGroupAdmin ? 'pending-approvals' : 'my-applications') // 集团管理员默认显示待审批

// 我的申请
const myApplications = computed(() => {
  // 模拟：返回当前用户的申请
  return mockPermissionApplications.filter(a => a.applicantOrgCode !== 'GROUP')
})

// 单据审批（模板负责人）
const pendingApprovals = computed(() => {
  if (!userStore.isGroupAdmin) return []
  // 模拟：集团管理员可以看到所有待审批申请
  return mockPermissionApplications.filter(a => a.status === 'PENDING')
})

// 申请弹窗
const applyDialogVisible = ref(false)
const applyForm = ref({
  orgCode: null,
  templateId: null,
  applyReason: '',
  expiryDate: '', // 申请的有效期截止日期
})

// 可选择的二级单位（排除本单位）
const availableOrgs = computed(() => {
  const allOrgs = [
    { code: 'UNIT_CHANGAN', name: '长安汽车' },
    { code: 'UNIT_CHENZHI', name: '辰致集团' },
    { code: 'UNIT_FINANCE', name: '财务公司' },
    { code: 'UNIT_CAFC', name: '长安汽车金融' },
    { code: 'UNIT_WANYOU', name: '万友汽车' },
    { code: 'UNIT_MINSHENG', name: '长安民生物流' },
  ]
  return allOrgs.filter(org => org.code !== userStore.currentRole.orgCode)
})

// 可申请的模板（选中单位的已发布模板，排除集团下发的）
const availableTemplates = computed(() => {
  if (!applyForm.value.orgCode) return []
  return mockTemplates.filter(t =>
    t.status === 1 && // 已发布
    t.orgCode === applyForm.value.orgCode && // 选中单位的
    t.sourceType !== 3 // 不是集团下发的
  )
})

function openApplyDialog() {
  // 默认有效期为30天后
  const defaultExpiryDate = new Date()
  defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30)

  applyForm.value = {
    orgCode: null,
    templateId: null,
    applyReason: '',
    expiryDate: defaultExpiryDate.toISOString().split('T')[0], // YYYY-MM-DD 格式
  }
  applyDialogVisible.value = true
}

function submitApplication() {
  if (!applyForm.value.orgCode) {
    ElMessage.warning('请选择目标单位')
    return
  }
  if (!applyForm.value.templateId) {
    ElMessage.warning('请选择要申请的模板')
    return
  }
  if (!applyForm.value.applyReason || applyForm.value.applyReason.trim().length < 10) {
    ElMessage.warning('请填写申请理由（至少10个字）')
    return
  }
  if (!applyForm.value.expiryDate) {
    ElMessage.warning('请选择权限有效期')
    return
  }

  // 验证有效期不能早于今天
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiryDate = new Date(applyForm.value.expiryDate)
  expiryDate.setHours(0, 0, 0, 0)

  if (expiryDate <= today) {
    ElMessage.warning('权限有效期必须晚于今天')
    return
  }

  // 检查是否已有申请记录
  const existing = mockPermissionApplications.find(
    a => a.templateId === applyForm.value.templateId &&
         a.applicantOrgCode === userStore.currentRole.orgCode &&
         ['PENDING', 'APPROVED'].includes(a.status)
  )

  if (existing) {
    if (existing.status === 'PENDING') {
      ElMessage.warning('该模板已有待审批的申请，请勿重复提交')
      return
    }
    if (existing.status === 'APPROVED') {
      ElMessage.warning('您已拥有该模板的查看权限')
      return
    }
  }

  const template = mockTemplates.find(t => t.id === applyForm.value.templateId)

  // 计算有效天数
  const applyTime = new Date()
  const validDays = Math.ceil((expiryDate - applyTime) / (1000 * 60 * 60 * 24))

  const newApplication = {
    id: Date.now(),
    templateId: template.id,
    templateCode: template.templateCode,
    templateName: template.templateName,
    templateOrgCode: template.orgCode,
    templateOrgName: template.orgName,
    templateOwnerName: template.ownerName || '未指定',
    applicantOrgCode: userStore.currentRole.orgCode,
    applicantOrgName: userStore.currentRole.orgName,
    applicantUserId: userStore.userId,
    applicantUserName: userStore.currentRole.label,
    applyReason: applyForm.value.applyReason,
    status: 'PENDING',
    applyTime: new Date().toLocaleString('zh-CN'),
    approveTime: null,
    approverUserId: null,
    approverUserName: null,
    approveComment: null,
    validDays: validDays,
    expiryTime: applyForm.value.expiryDate + ' 23:59:59', // 转换为完整时间格式
    viewCount: 0,
    lastViewTime: null,
  }

  mockPermissionApplications.unshift(newApplication)
  applyDialogVisible.value = false
  ElMessage.success('申请已提交，等待模板负责人审批')
}

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
  expiryDate: '', // 审批人可修改的有效期截止日期
})

function openApproveDialog(row, action) {
  // 使用申请人提交的有效期作为默认值
  let defaultExpiryDate = ''
  if (row.expiryTime) {
    // 从 expiryTime 提取日期部分 (YYYY-MM-DD)
    defaultExpiryDate = row.expiryTime.split(' ')[0]
  }

  approveForm.value = {
    application: row,
    action: action,
    comment: '',
    expiryDate: defaultExpiryDate,
  }
  approveDialogVisible.value = true
}

function submitApproval() {
  if (!approveForm.value.comment || approveForm.value.comment.trim().length < 5) {
    ElMessage.warning('请填写审批意见')
    return
  }

  if (approveForm.value.action === 'APPROVED') {
    if (!approveForm.value.expiryDate) {
      ElMessage.warning('请设置权限有效期')
      return
    }

    // 验证有效期不能早于今天
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiryDate = new Date(approveForm.value.expiryDate)
    expiryDate.setHours(0, 0, 0, 0)

    if (expiryDate <= today) {
      ElMessage.warning('权限有效期必须晚于今天')
      return
    }
  }

  const app = approveForm.value.application
  app.status = approveForm.value.action
  app.approveTime = new Date().toLocaleString('zh-CN')
  app.approverUserId = userStore.userId
  app.approverUserName = userStore.currentRole.label
  app.approveComment = approveForm.value.comment

  // 如果是通过，更新过期时间
  if (approveForm.value.action === 'APPROVED') {
    const applyTime = new Date()
    const expiryDate = new Date(approveForm.value.expiryDate)
    const validDays = Math.ceil((expiryDate - applyTime) / (1000 * 60 * 60 * 24))

    app.validDays = validDays
    app.expiryTime = approveForm.value.expiryDate + ' 23:59:59'
  }

  approveDialogVisible.value = false

  const actionText = approveForm.value.action === 'APPROVED' ? '已通过' : '已驳回'
  ElMessage.success(`申请${actionText}`)
}

// 查看模板
function viewTemplate(row) {
  router.push(`/template/edit/${row.templateId}`)
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">跨组织模板查看申请</div>
        <div class="page-desc">
          <span v-if="userStore.isGroupAdmin">审批其他单位的模板查看申请</span>
          <span v-else>申请查看其他单位的模板，需要模板负责人审批</span>
        </div>
      </div>
      <el-button v-if="userStore.isUnitAdmin" type="primary" :icon="'Plus'" @click="openApplyDialog">
        申请查看权限
      </el-button>
    </div>

    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <!-- 我的申请 - 仅单位管理员显示 -->
        <el-tab-pane v-if="userStore.isUnitAdmin" label="我的申请" name="my-applications">
          <el-table :data="myApplications" stripe style="width:100%">
            <el-table-column label="申请信息" min-width="240">
              <template #default="{ row }">
                <div style="line-height:1.6">
                  <div style="font-weight:500">{{ row.applicantOrgName }} - {{ row.applicantUserName }}</div>
                  <div style="font-size:12px;color:#888;margin-top:2px">申请查看</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="目标模板" min-width="260">
              <template #default="{ row }">
                <div style="line-height:1.6">
                  <div style="font-weight:500">{{ row.templateOrgName }}</div>
                  <div style="margin-top:2px">{{ row.templateName }}</div>
                  <div style="font-size:12px;color:#888;margin-top:2px">{{ row.templateCode }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="templateOwnerName" label="模板负责人" width="120" />
            <el-table-column label="申请理由" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">{{ row.applyReason }}</template>
            </el-table-column>
            <el-table-column label="申请有效期" width="120" align="center">
              <template #default="{ row }">
                <span v-if="row.expiryTime">{{ row.expiryTime.split(' ')[0] }}</span>
                <span v-else style="color:#ccc">—</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="PERMISSION_STATUS[row.status].type" size="small">
                  {{ PERMISSION_STATUS[row.status].label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="applyTime" label="申请时间" width="160" />
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
                  v-if="row.status === 'APPROVED'"
                  link type="primary" size="small"
                  @click="viewTemplate(row)"
                >查看模板</el-button>
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
            <el-table-column label="申请查看" min-width="280">
              <template #default="{ row }">
                <div style="line-height:1.6">
                  <div style="font-weight:500;color:#1677ff">{{ row.templateOrgName }}</div>
                  <div style="margin-top:2px">{{ row.templateName }}</div>
                  <div style="font-size:12px;color:#888;margin-top:2px">{{ row.templateCode }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="templateOwnerName" label="模板负责人" width="120" />
            <el-table-column label="申请理由" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ row.applyReason }}</template>
            </el-table-column>
            <el-table-column label="申请有效期" width="120" align="center">
              <template #default="{ row }">
                <span v-if="row.expiryTime">{{ row.expiryTime.split(' ')[0] }}</span>
                <span v-else style="color:#ccc">—</span>
              </template>
            </el-table-column>
            <el-table-column prop="applyTime" label="申请时间" width="160" />
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewTemplate(row)">查看模板</el-button>
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

    <!-- 申请权限弹窗 -->
    <el-dialog v-model="applyDialogVisible" title="申请模板查看权限" width="600px">
      <el-form :model="applyForm" label-width="100px">
        <el-form-item label="目标单位" required>
          <el-select
            v-model="applyForm.orgCode"
            placeholder="请选择要申请的单位"
            style="width:100%"
            @change="applyForm.templateId = null"
          >
            <el-option
              v-for="org in availableOrgs"
              :key="org.code"
              :label="org.name"
              :value="org.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择模板" required>
          <el-select
            v-model="applyForm.templateId"
            placeholder="请先选择目标单位"
            style="width:100%"
            filterable
            :disabled="!applyForm.orgCode"
          >
            <el-option
              v-for="t in availableTemplates"
              :key="t.id"
              :label="t.templateName"
              :value="t.id"
            >
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span>{{ t.templateName }}</span>
                <el-tag size="small" type="info" effect="plain">{{ t.bizDomainLabel }}</el-tag>
              </div>
            </el-option>
          </el-select>
          <div v-if="!applyForm.orgCode" style="font-size:12px;color:#888;margin-top:4px">
            请先选择目标单位
          </div>
          <div v-else-if="availableTemplates.length === 0" style="font-size:12px;color:#fa8c16;margin-top:4px">
            该单位暂无可申请的模板
          </div>
        </el-form-item>

        <el-form-item label="申请理由" required>
          <el-input
            v-model="applyForm.applyReason"
            type="textarea"
            :rows="4"
            placeholder="请说明申请查看该模板的理由（至少10个字）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="权限有效期" required>
          <el-date-picker
            v-model="applyForm.expiryDate"
            type="date"
            placeholder="选择有效期截止日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :disabled-date="(date) => date <= new Date()"
            style="width:100%"
          />
          <div style="font-size:12px;color:#888;margin-top:4px">
            请选择权限有效期截止日期，到期后将自动失效。建议选择30-90天
          </div>
        </el-form-item>

        <el-alert type="info" :closable="false" style="margin-bottom:16px">
          <template #default>
            <div style="font-size:13px">
              <div style="font-weight:600;margin-bottom:4px">权限说明：</div>
              <div>1. 申请通过后可以查看模板的字段配置和校验规则</div>
              <div>2. 仅可查看，不可编辑和使用该模板创建单据</div>
              <div>3. 需要模板负责人审批通过后生效</div>
              <div>4. 审批人可以根据实际情况调整您申请的有效期</div>
            </div>
          </template>
        </el-alert>
      </el-form>

      <template #footer>
        <el-button @click="applyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitApplication">提交申请</el-button>
      </template>
    </el-dialog>

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

        <el-form-item label="申请模板">
          <span>{{ approveForm.application.templateName }}</span>
        </el-form-item>

        <el-form-item label="申请理由">
          <div style="padding:8px;background:#f5f5f5;border-radius:4px;line-height:1.6">
            {{ approveForm.application.applyReason }}
          </div>
        </el-form-item>

        <el-form-item v-if="approveForm.action === 'APPROVED'" label="申请有效期">
          <span style="color:#666">{{ approveForm.application.expiryTime ? approveForm.application.expiryTime.split(' ')[0] : '未设置' }}</span>
        </el-form-item>

        <el-form-item v-if="approveForm.action === 'APPROVED'" label="审批有效期" required>
          <el-date-picker
            v-model="approveForm.expiryDate"
            type="date"
            placeholder="选择有效期截止日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :disabled-date="(date) => date <= new Date()"
            style="width:100%"
          />
          <div style="font-size:12px;color:#888;margin-top:4px">
            您可以根据实际情况调整申请人提交的有效期，到期后权限将自动失效
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
