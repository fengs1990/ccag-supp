<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { mockTemplates, mockDistributions, mockTemplateVersions, TEMPLATE_STATUS, COLLECT_FREQUENCIES, FIELD_TYPES, mockOwners, mockTemplateGroups } from '../../mock/template.js'
import { mockGroups } from '../../mock/group.js'
import { orgs, orgUsers } from '../../mock/common.js'
import { mockPermissionApplications } from '../../mock/templatePermission.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

// 分组列表
const groupList = ref([])

onMounted(() => {
  groupList.value = [...mockGroups]
})

// 筛选条件（表单绑定，未提交）
const filterForm = ref({
  templateName: '',
  bizDomain: '',
  status: '',
  sourceType: '',
  groupId: '',
})

// 已生效的筛选条件（点击查询后才更新）
const activeFilter = ref({ ...filterForm.value })

function doSearch() {
  activeFilter.value = { ...filterForm.value }
}

function resetFilter() {
  filterForm.value = { templateName: '', bizDomain: '', sourceType: '', groupId: '' }
  activeFilter.value = { ...filterForm.value }
}

// 表格数据（根据角色 + 已生效筛选条件过滤）
const tableData = computed(() => {
  let list = mockTemplates
  if (userStore.isUnitAdmin) {
    list = list.filter(t => t.orgCode === userStore.currentRole.orgCode)
  }
  if (activeFilter.value.templateName) {
    list = list.filter(t => t.templateName.includes(activeFilter.value.templateName))
  }
  if (activeFilter.value.bizDomain) {
    list = list.filter(t => t.bizDomain === activeFilter.value.bizDomain)
  }
  if (activeFilter.value.status !== '') {
    list = list.filter(t => String(t.status) === String(activeFilter.value.status))
  }
  if (activeFilter.value.sourceType !== '') {
    list = list.filter(t => String(t.sourceType) === String(activeFilter.value.sourceType))
  }
  if (activeFilter.value.groupId !== '') {
    if (activeFilter.value.groupId === 0) {
      // 筛选不属于任何分组的模板
      list = list.filter(t => !t.groupId)
    } else {
      // 筛选属于指定分组的模板
      list = list.filter(t => t.groupId === activeFilter.value.groupId)
    }
  }
  return list
})

// 下发弹窗
const distDialogVisible = ref(false)
const distForm = ref({
  templateId: null,
  templateName: '',
  distributions: [] // 改为 { orgCode: string, userId: string }[]
})

function openDistDialog(row) {
  distForm.value = {
    templateId: row.id,
    templateName: row.templateName,
    distributions: []
  }
  distDialogVisible.value = true
}

// 已下发的组织（不可再次下发）
const distributedOrgCodes = computed(() => {
  if (!distForm.value.templateId) return []
  return mockDistributions
    .filter(d => d.templateId === distForm.value.templateId)
    .map(d => d.targetOrgCode)
})

// 选中的组织列表
const selectedOrgCodes = computed(() => {
  return distForm.value.distributions.map(d => d.orgCode)
})

// 切换组织选中状态
function toggleOrg(orgCode, checked) {
  if (checked) {
    // 勾选组织，添加到列表
    distForm.value.distributions.push({ orgCode, userId: '' })
  } else {
    // 取消勾选，从列表移除
    const index = distForm.value.distributions.findIndex(d => d.orgCode === orgCode)
    if (index > -1) {
      distForm.value.distributions.splice(index, 1)
    }
  }
}

// 获取某个组织下选中的人员ID
function getOrgUserId(orgCode) {
  const dist = distForm.value.distributions.find(d => d.orgCode === orgCode)
  return dist ? dist.userId : ''
}

// 更新某个组织的人员选择
function updateOrgUser(orgCode, userId) {
  const dist = distForm.value.distributions.find(d => d.orgCode === orgCode)
  if (dist) {
    dist.userId = userId
  }
}

function confirmDistribute() {
  if (!distForm.value.distributions.length) {
    ElMessage.warning('请选择接收单位')
    return
  }

  // 检查每个组织是否都选择了人员
  const orgWithoutUser = distForm.value.distributions.find(d => !d.userId)
  if (orgWithoutUser) {
    const orgName = orgs.find(o => o.orgCode === orgWithoutUser.orgCode)?.orgName
    ElMessage.warning(`请为「${orgName}」选择接收人`)
    return
  }

  ElMessage.success(`已成功下发至 ${distForm.value.distributions.length} 个单位`)
  distDialogVisible.value = false
}

// 转派弹窗
const transferDialogVisible = ref(false)
const transferForm = ref({
  templateId: null,
  templateName: '',
  currentUser: '',
  targetUserId: '',
  transferReason: ''
})

function openTransferDialog(row) {
  // 模拟：获取当前处理人（实际应从后端获取）
  const currentUserName = '李四' // 假设当前处理人

  transferForm.value = {
    templateId: row.id,
    templateName: row.templateName,
    currentUser: currentUserName,
    targetUserId: '',
    transferReason: ''
  }
  transferDialogVisible.value = true
}

function confirmTransfer() {
  if (!transferForm.value.targetUserId) {
    ElMessage.warning('请选择转派接收人')
    return
  }

  if (!transferForm.value.transferReason || transferForm.value.transferReason.trim().length < 5) {
    ElMessage.warning('请填写转派原因')
    return
  }

  const targetUser = orgUsers[userStore.currentRole.orgCode]?.find(u => u.userId === transferForm.value.targetUserId)
  ElMessage.success(`已成功转派给 ${targetUser?.userName}`)
  transferDialogVisible.value = false
}

// 判断是否可以转派（只有当前处理人可以转派）
function canTransfer(row) {
  // 模拟：判断当前用户是否为该模板的当前处理人
  // 实际应从后端查询 current_user_id
  return userStore.isUnitAdmin && row.orgCode !== 'GROUP'
}

// 删除模板
function deleteTemplate(row) {
  const tips = row.docCount > 0 ? `（当前已有 ${row.docCount} 张关联单据，删除后不影响已有单据）` : ''
  ElMessageBox.confirm(`确认删除模板「${row.templateName}」？此操作不可撤销。${tips}`, '删除确认', {
    type: 'error',
    confirmButtonText: '确认删除',
  }).then(() => {
    ElMessage.success('模板已删除')
    // 实际应该从列表中移除
    const index = tableData.value.findIndex(t => t.id === row.id)
    if (index > -1) {
      tableData.value.splice(index, 1)
    }
  }).catch(() => {})
}

function canDelete(row) {
  // 集团管理员可以删除任何模板
  if (userStore.isGroupAdmin) return true
  // 单位管理员可以删除本单位的模板
  if (userStore.isUnitAdmin && row.orgCode === userStore.currentRole.orgCode) return true
  return false
}
function canDistribute(row) {
  return row.status === 1 && row.sourceType !== 3 && userStore.canDistribute
}
function canEdit(row) {
  // 有关联单据的模板不可编辑（改为只读查看）
  if (row.docCount > 0) return false
  if (userStore.isGroupAdmin) return true
  if (userStore.isUnitAdmin) return row.sourceType === 3
  return false
}

// 检查是否可以申请查看权限
function canApplyViewPermission(row) {
  // 只有单位管理员可以申请
  if (!userStore.isUnitAdmin) return false
  // 只能申请其他单位的模板（不是本单位的）
  if (row.orgCode === userStore.currentRole.orgCode) return false
  // 不能申请集团下发的模板
  if (row.sourceType === 3) return false
  // 只能申请已发布的模板
  if (row.status !== 1) return false
  return true
}

// 判断是否显示设为主模板按钮（原型演示：groupId=1就显示）
function canSetAsMaster(row) {
  return row.groupId === 1
}

// 设置为主模板
function setAsMasterTemplate(row) {
  ElMessageBox.confirm(
    `确认将模板「${row.templateName}」设置为主模板？设置后，填报人需要先完成该模板的填报和审批，才能填报同组其他从模板。`,
    '设置主模板',
    {
      type: 'warning',
      confirmButtonText: '确认设置',
    }
  ).then(() => {
    ElMessage.success('已成功设置为主模板')
  }).catch(() => {})
}

// 检查是否已有权限或申请
function hasPermissionOrApplication(row) {
  const app = mockPermissionApplications.find(
    a => a.templateId === row.id &&
         a.applicantOrgCode === userStore.currentRole.orgCode
  )
  if (!app) return { hasPermission: false, hasPendingApplication: false }

  // 检查权限是否过期
  let hasPermission = app.status === 'APPROVED'
  if (hasPermission && app.expiryTime) {
    const now = new Date()
    const expiryDate = new Date(app.expiryTime)
    if (now > expiryDate) {
      // 权限已过期
      app.status = 'EXPIRED'
      hasPermission = false
    }
  }

  return {
    hasPermission: hasPermission,
    hasPendingApplication: app.status === 'PENDING',
  }
}

// 申请查看权限弹窗
const applyPermissionDialogVisible = ref(false)
const applyPermissionForm = ref({
  template: null,
  applyReason: '',
  expiryDate: '', // 权限有效期截止日期
})

function openApplyPermissionDialog(row) {
  const { hasPermission, hasPendingApplication } = hasPermissionOrApplication(row)

  if (hasPermission) {
    ElMessage.info('您已拥有该模板的查看权限')
    return
  }

  if (hasPendingApplication) {
    ElMessage.warning('该模板已有待审批的申请，请勿重复提交')
    return
  }

  // 默认有效期为30天后
  const defaultExpiryDate = new Date()
  defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30)

  applyPermissionForm.value = {
    template: row,
    applyReason: '',
    expiryDate: defaultExpiryDate.toISOString().split('T')[0], // YYYY-MM-DD 格式
  }
  applyPermissionDialogVisible.value = true
}

function submitPermissionApplication() {
  if (!applyPermissionForm.value.applyReason || applyPermissionForm.value.applyReason.trim().length < 10) {
    ElMessage.warning('请填写申请理由（至少10个字）')
    return
  }

  if (!applyPermissionForm.value.expiryDate) {
    ElMessage.warning('请选择权限有效期')
    return
  }

  // 验证有效期不能早于今天
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiryDate = new Date(applyPermissionForm.value.expiryDate)
  expiryDate.setHours(0, 0, 0, 0)

  if (expiryDate <= today) {
    ElMessage.warning('权限有效期必须晚于今天')
    return
  }

  const template = applyPermissionForm.value.template

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
    applyReason: applyPermissionForm.value.applyReason,
    status: 'PENDING',
    applyTime: new Date().toLocaleString('zh-CN'),
    approveTime: null,
    approverUserId: null,
    approverUserName: null,
    approveComment: null,
    validDays: validDays,
    expiryTime: applyPermissionForm.value.expiryDate + ' 23:59:59',
    viewCount: 0,
    lastViewTime: null,
  }

  mockPermissionApplications.unshift(newApplication)
  applyPermissionDialogVisible.value = false
  ElMessage.success('申请已提交，等待模板负责人审批')
}

function isOverdue(row) {
  if (!row.deadlineDate) return false
  return new Date(row.deadlineDate) < new Date()
}

const toEdit = (row) => router.push(`/template/edit/${row.id}`)
const toCreate = () => router.push('/template/edit/new')

// 下发记录抽屉
const distDrawerVisible = ref(false)
const currentDistList = ref([])
function showDistRecord(row) {
  currentDistList.value = mockDistributions.filter(d => d.templateId === row.id)
  distDrawerVisible.value = true
}

// 版本历史抽屉
const versionDrawerVisible = ref(false)
const currentVersionList = ref([])
const currentTemplateName = ref('')
function showVersionHistory(row) {
  currentVersionList.value = mockTemplateVersions[row.id] || []
  currentTemplateName.value = row.templateName
  versionDrawerVisible.value = true
}

// 字段快照弹窗
const snapshotDialogVisible = ref(false)
const currentSnapshot = ref(null)
function viewVersionSnapshot(version) {
  currentSnapshot.value = version
  snapshotDialogVisible.value = true
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">模板管理</div>
        <div class="page-desc">管理数据补录模板，配置字段、校验规则和审批流程</div>
      </div>
      <el-button v-if="userStore.isGroupAdmin || userStore.isUnitAdmin" type="primary" :icon="'Plus'" @click="toCreate">
        新建模板
      </el-button>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filterForm" inline>
        <el-form-item label="模板名称">
          <el-input v-model="filterForm.templateName" placeholder="请输入模板名称" clearable style="width:160px" />
        </el-form-item>
        <el-form-item label="业务域">
          <el-select v-model="filterForm.bizDomain" placeholder="全部" clearable style="width:130px">
            <el-option label="财务域"  value="FINANCE" />
            <el-option label="生产域"  value="PRODUCTION" />
            <el-option label="销售域"  value="SALES" />
            <el-option label="供应链域" value="SUPPLY" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="userStore.isGroupAdmin" label="来源">
          <el-select v-model="filterForm.sourceType" placeholder="全部" clearable style="width:130px">
            <el-option label="集团自建"   value="1" />
            <el-option label="单位自建"   value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="分组">
          <el-select v-model="filterForm.groupId" placeholder="全部" clearable style="width:200px">
            <el-option label="不属于任何分组" :value="0" />
            <el-option
              v-for="g in groupList"
              :key="g.id"
              :label="g.groupName"
              :value="g.id"
            >
              <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
                <span>{{ g.groupName }}</span>
                <el-tag v-if="g.groupType === 'MASTER_SLAVE'" size="small" type="warning" effect="plain">主从</el-tag>
                <el-tag v-else size="small" type="info" effect="plain">普通</el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="'Search'" @click="doSearch">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 模板列表 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="tableData" row-key="id" style="width:100%" stripe>
        <el-table-column label="模板名称" min-width="160">
          <template #default="{ row }">
            <div class="tpl-name-cell">
              <span class="tpl-name" @click="toEdit(row)">{{ row.templateName }}</span>
              <el-tag v-if="row.isMaster === 1" size="small" type="danger" style="margin-left:6px">主</el-tag>
              <el-tag v-if="row.dependOnMaster === 1" size="small" type="warning" style="margin-left:6px">从</el-tag>
              <el-tag v-if="row.sourceType === 3" size="small" type="info" style="margin-left:6px">集团下发</el-tag>
            </div>
            <div class="tpl-code">{{ row.templateCode }}</div>
          </template>
        </el-table-column>
        <el-table-column label="业务域" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.bizDomainLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="所属分组" width="160">
          <template #default="{ row }">
            <el-tag v-if="row.groupName" type="info" size="small" effect="plain">
              {{ row.groupName }}
            </el-tag>
            <span v-else style="color:#ccc">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="sourceSystem"       label="来源系统"   width="100" />
        <el-table-column prop="indicatorCategory"  label="指标分类"   width="120" />
        <el-table-column label="填报周期" width="90" align="center">
          <template #default="{ row }">
            {{ COLLECT_FREQUENCIES.find(f => f.value === row.collectFrequency)?.label || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="允许填报账期" width="120" align="center">
          <template #default="{ row }">
            <span v-if="row.fillPeriod === 0">无限制</span>
            <span v-else>T-{{ row.fillPeriod }}</span>
          </template>
        </el-table-column>
        <!--
        <el-table-column label="版本" width="70" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">V{{ row.currentVersion }}</el-tag>
          </template>
        </el-table-column>
        -->
        <el-table-column label="负责人" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.ownerName">{{ row.ownerName }}</span>
            <span v-else style="color:#ccc">—</span>
          </template>
        </el-table-column>
        <el-table-column label="关联单据" width="90" align="center">
          <template #default="{ row }">
            <el-link
              type="primary"
              :underline="false"
              @click="router.push({ path: '/document/list', query: { templateId: row.id } })"
            >
              {{ row.docCount }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="最后修改" width="160" />
        <el-table-column label="操作" width="360" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="toEdit(row)">
              {{ canEdit(row) ? '编辑' : '查看' }}
            </el-button>
            <!-- <el-button v-if="row.currentVersion > 1" link size="small" @click="showVersionHistory(row)">版本历史</el-button> -->
            <el-button v-if="canDistribute(row)" link type="primary" size="small" @click="openDistDialog(row)">下发</el-button>
            <el-button v-if="canTransfer(row)" link type="warning" size="small" @click="openTransferDialog(row)">转派</el-button>
            <el-button v-if="row.hasDistribution" link type="info" size="small" @click="router.push(`/template/fill-status/${row.id}`)">填报情况</el-button>
            <el-button v-if="canSetAsMaster(row)" link type="warning" size="small" @click="setAsMasterTemplate(row)">设为主模板</el-button>
            <el-button v-if="canApplyViewPermission(row)" link type="primary" size="small" @click="openApplyPermissionDialog(row)">申请查看</el-button>
            <el-button v-if="canDelete(row)" link type="danger" size="small" @click="deleteTemplate(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无模板数据" :image-size="60" />
        </template>
      </el-table>
    </el-card>

    <!-- 下发弹窗 -->
    <el-dialog v-model="distDialogVisible" title="下发模板" width="680px">
      <el-form label-width="90px">
        <el-form-item label="模板名称">
          <div style="font-weight:500;color:#333">{{ distForm.templateName }}</div>
        </el-form-item>
        <el-form-item label="接收单位" required>
          <div style="width:100%;font-size:13px;color:#666;margin-bottom:12px">
            请勾选需要下发的单位，并为每个单位指定一位接收人
          </div>
          <div style="width:100%;max-height:400px;overflow-y:auto;padding:8px;border:1px solid #e4e7ed;border-radius:4px;background:#fafafa">
            <div
              v-for="org in orgs.filter(o => o.orgCode !== 'GROUP')"
              :key="org.orgCode"
              style="margin-bottom:12px;padding:12px;background:#fff;border-radius:6px;border:1px solid #e4e7ed"
              :style="{
                borderColor: selectedOrgCodes.includes(org.orgCode) ? '#409eff' : '#e4e7ed',
                boxShadow: selectedOrgCodes.includes(org.orgCode) ? '0 2px 8px rgba(64,158,255,0.15)' : 'none'
              }"
            >
              <div style="display:flex;align-items:center;gap:12px">
                <!-- 组织复选框 -->
                <el-checkbox
                  :model-value="selectedOrgCodes.includes(org.orgCode)"
                  :disabled="distributedOrgCodes.includes(org.orgCode)"
                  @change="(checked) => toggleOrg(org.orgCode, checked)"
                  style="flex-shrink:0"
                >
                  <span style="font-weight:500;font-size:14px">{{ org.orgName }}</span>
                </el-checkbox>

                <!-- 已下发标签 -->
                <el-tag v-if="distributedOrgCodes.includes(org.orgCode)" size="small" type="info" effect="plain">
                  已下发
                </el-tag>

                <!-- 人员下拉选择 -->
                <el-select
                  v-if="selectedOrgCodes.includes(org.orgCode)"
                  :model-value="getOrgUserId(org.orgCode)"
                  @update:model-value="(val) => updateOrgUser(org.orgCode, val)"
                  placeholder="请选择接收人"
                  filterable
                  clearable
                  style="flex:1;max-width:280px"
                  size="default"
                >
                  <template #prefix>
                    <el-icon style="color:#909399"><User /></el-icon>
                  </template>
                  <el-option
                    v-for="user in (orgUsers[org.orgCode] || [])"
                    :key="user.userId"
                    :value="user.userId"
                    :label="`${user.userName}（${user.position}）`"
                  >
                    <div style="display:flex;justify-content:space-between;align-items:center">
                      <span style="font-weight:500">{{ user.userName }}</span>
                      <span style="color:#909399;font-size:12px">{{ user.position }}</span>
                    </div>
                  </el-option>
                  <template v-if="!orgUsers[org.orgCode] || orgUsers[org.orgCode].length === 0" #empty>
                    <div style="padding:20px;text-align:center">
                      <el-icon style="font-size:40px;color:#dcdfe6"><User /></el-icon>
                      <div style="margin-top:8px;color:#909399;font-size:13px">该单位暂无可选人员</div>
                    </div>
                  </template>
                </el-select>

                <!-- 未选择人员提示 -->
                <div
                  v-if="selectedOrgCodes.includes(org.orgCode) && !getOrgUserId(org.orgCode)"
                  style="flex:1;color:#f56c6c;font-size:12px;display:flex;align-items:center;gap:4px"
                >
                  <el-icon><WarningFilled /></el-icon>
                  <span>请选择接收人</span>
                </div>

                <!-- 已选择人员显示 -->
                <div
                  v-if="selectedOrgCodes.includes(org.orgCode) && getOrgUserId(org.orgCode)"
                  style="flex:1;color:#67c23a;font-size:12px;display:flex;align-items:center;gap:4px"
                >
                  <el-icon><CircleCheckFilled /></el-icon>
                  <span>已选择</span>
                </div>
              </div>
            </div>

            <!-- 无可用单位提示 -->
            <el-empty
              v-if="orgs.filter(o => o.orgCode !== 'GROUP' && !distributedOrgCodes.includes(o.orgCode)).length === 0"
              description="所有单位均已下发"
              :image-size="80"
            />
          </div>
        </el-form-item>

        <!-- 统计信息 -->
        <el-form-item v-if="selectedOrgCodes.length > 0">
          <el-alert
            :title="`已选择 ${selectedOrgCodes.length} 个单位，其中 ${distForm.distributions.filter(d => d.userId).length} 个已指定接收人`"
            type="info"
            :closable="false"
            show-icon
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="distDialogVisible = false" size="default">取消</el-button>
        <el-button type="primary" @click="confirmDistribute" size="default">
          <el-icon style="margin-right:4px"><Check /></el-icon>
          确认下发
        </el-button>
      </template>
    </el-dialog>

    <!-- 转派弹窗 -->
    <el-dialog v-model="transferDialogVisible" title="转派模板" width="520px">
      <el-form label-width="100px">
        <el-form-item label="模板名称">
          <div style="font-weight:500;color:#333">{{ transferForm.templateName }}</div>
        </el-form-item>
        <el-form-item label="当前处理人">
          <div style="color:#666">{{ transferForm.currentUser }}</div>
        </el-form-item>
        <el-form-item label="转派给" required>
          <el-select
            v-model="transferForm.targetUserId"
            placeholder="请选择转派接收人"
            filterable
            style="width:100%"
          >
            <template #prefix>
              <el-icon style="color:#909399"><User /></el-icon>
            </template>
            <el-option
              v-for="user in (orgUsers[userStore.currentRole.orgCode] || [])"
              :key="user.userId"
              :value="user.userId"
              :label="`${user.userName}（${user.position}）`"
            >
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-weight:500">{{ user.userName }}</span>
                <span style="color:#909399;font-size:12px">{{ user.position }}</span>
              </div>
            </el-option>
            <template v-if="!orgUsers[userStore.currentRole.orgCode] || orgUsers[userStore.currentRole.orgCode].length === 0" #empty>
              <div style="padding:20px;text-align:center">
                <el-icon style="font-size:40px;color:#dcdfe6"><User /></el-icon>
                <div style="margin-top:8px;color:#909399;font-size:13px">暂无可选人员</div>
              </div>
            </template>
          </el-select>
        </el-form-item>
        <el-form-item label="转派原因" required>
          <el-input
            v-model="transferForm.transferReason"
            type="textarea"
            :rows="3"
            placeholder="请输入转派原因"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-alert
          title="转派后，该模板的处理权限将移交给接收人"
          type="warning"
          :closable="false"
          show-icon
          style="margin-top:12px"
        />
      </el-form>
      <template #footer>
        <el-button @click="transferDialogVisible = false" size="default">取消</el-button>
        <el-button type="primary" @click="confirmTransfer" size="default">
          <el-icon style="margin-right:4px"><Sort /></el-icon>
          确认转派
        </el-button>
      </template>
    </el-dialog>


    <!-- 版本历史抽屉 -->
    <el-drawer v-model="versionDrawerVisible" :title="`版本历史 - ${currentTemplateName}`" size="700px">
      <el-timeline>
        <el-timeline-item
          v-for="v in [...currentVersionList].reverse()"
          :key="v.id"
          :timestamp="v.createTime"
          placement="top"
        >
          <el-card shadow="never">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <div>
                <el-tag type="primary" size="small">V{{ v.versionNo }}</el-tag>
                <span style="margin-left:8px;color:#888;font-size:13px">{{ v.createBy }}</span>
              </div>
              <el-button v-if="v.fieldSnapshot" link type="primary" size="small" @click="viewVersionSnapshot(v)">
                查看版本快照
              </el-button>
            </div>
            <div style="font-size:13px;color:#666;line-height:1.8">
              <div v-for="(change, idx) in v.changes" :key="idx" style="margin-bottom:4px">
                <el-tag v-if="change.type === 'create'" type="success" size="small" effect="plain">创建</el-tag>
                <el-tag v-else-if="change.type === 'add'" type="primary" size="small" effect="plain">新增</el-tag>
                <el-tag v-else-if="change.type === 'modify'" type="warning" size="small" effect="plain">修改</el-tag>
                <el-tag v-else-if="change.type === 'delete'" type="danger" size="small" effect="plain">删除</el-tag>
                <el-tag v-if="change.category === 'basic'" size="small" effect="plain" style="margin-left:4px">基础信息</el-tag>
                <el-tag v-else-if="change.category === 'field'" size="small" effect="plain" style="margin-left:4px">字段</el-tag>
                <el-tag v-else-if="change.category === 'rule'" size="small" effect="plain" style="margin-left:4px">规则</el-tag>
                <span style="margin-left:8px">
                  <span v-if="change.fieldName || change.ruleName" style="font-weight:500">
                    {{ change.fieldName || change.ruleName }}
                  </span>
                  <span v-if="change.summary">{{ change.summary }}</span>
                  <span v-if="change.detail" style="color:#999">（{{ change.detail }}）</span>
                </span>
              </div>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-if="!currentVersionList.length" description="暂无版本历史" :image-size="80" />
    </el-drawer>

    <!-- 版本快照弹窗 -->
    <el-dialog v-model="snapshotDialogVisible" :title="`版本快照 - V${currentSnapshot?.versionNo}`" width="900px">
      <el-tabs v-if="currentSnapshot" type="border-card">
        <!-- 基础信息 -->
        <el-tab-pane label="基础信息">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="模板名称">{{ currentSnapshot.basicInfoSnapshot?.templateName }}</el-descriptions-item>
            <el-descriptions-item label="业务域">{{ currentSnapshot.basicInfoSnapshot?.bizDomain }}</el-descriptions-item>
            <el-descriptions-item label="来源系统">{{ currentSnapshot.basicInfoSnapshot?.sourceSystem }}</el-descriptions-item>
            <el-descriptions-item label="指标分类">{{ currentSnapshot.basicInfoSnapshot?.indicatorCategory }}</el-descriptions-item>
            <el-descriptions-item label="填报周期">
              {{ COLLECT_FREQUENCIES.find(f => f.value === currentSnapshot.basicInfoSnapshot?.collectFrequency)?.label }}
            </el-descriptions-item>
            <el-descriptions-item label="允许填报账期">
              T-{{ currentSnapshot.basicInfoSnapshot?.fillPeriod }}
            </el-descriptions-item>
            <el-descriptions-item label="审批模式">
              审批模式 {{ currentSnapshot.basicInfoSnapshot?.approvalMode }}
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 字段配置 -->
        <el-tab-pane label="字段配置">
          <el-table :data="currentSnapshot.fieldSnapshot" style="width:100%" size="small">
            <el-table-column prop="sortOrder" label="序号" width="70" align="center" />
            <el-table-column prop="fieldName" label="字段名称" width="120" />
            <el-table-column prop="fieldCode" label="字段编码" width="140" />
            <el-table-column label="字段类型" width="100">
              <template #default="{ row }">
                {{ FIELD_TYPES.find(t => t.value === row.fieldType)?.label || row.fieldType }}
              </template>
            </el-table-column>
            <el-table-column label="必填" width="80" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.isRequired" type="danger" size="small">是</el-tag>
                <span v-else style="color:#ccc">否</span>
              </template>
            </el-table-column>
            <el-table-column label="敏感" width="80" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.isSensitive" type="warning" size="small">是</el-tag>
                <span v-else style="color:#ccc">否</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 校验规则 -->
        <el-tab-pane label="校验规则">
          <el-table :data="currentSnapshot.ruleSnapshot" style="width:100%" size="small">
            <el-table-column prop="ruleCode" label="规则编码" width="100" />
            <el-table-column prop="ruleName" label="规则名称" width="160" />
            <el-table-column prop="ruleType" label="规则类型" width="120">
              <template #default="{ row }">
                <el-tag v-if="row.ruleType === 'FORMAT'" size="small" effect="plain">格式校验</el-tag>
                <el-tag v-else-if="row.ruleType === 'RANGE'" type="warning" size="small" effect="plain">范围校验</el-tag>
                <el-tag v-else-if="row.ruleType === 'MASTER_DATA'" type="success" size="small" effect="plain">主数据校验</el-tag>
                <el-tag v-else-if="row.ruleType === 'CROSS_FIELD'" type="info" size="small" effect="plain">跨字段校验</el-tag>
                <el-tag v-else-if="row.ruleType === 'BALANCE'" type="danger" size="small" effect="plain">平衡校验</el-tag>
                <el-tag v-else size="small" effect="plain">{{ row.ruleType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="ruleDesc" label="规则描述" min-width="200" show-overflow-tooltip />
          </el-table>
          <el-empty v-if="!currentSnapshot.ruleSnapshot || !currentSnapshot.ruleSnapshot.length" description="暂无校验规则" :image-size="60" />
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <!-- 申请查看权限弹窗 -->
    <el-dialog v-model="applyPermissionDialogVisible" title="申请模板查看权限" width="600px">
      <el-form v-if="applyPermissionForm.template" :model="applyPermissionForm" label-width="100px">
        <el-form-item label="模板名称">
          <span>{{ applyPermissionForm.template.templateName }}</span>
        </el-form-item>

        <el-form-item label="模板编码">
          <span style="color:#888">{{ applyPermissionForm.template.templateCode }}</span>
        </el-form-item>

        <el-form-item label="负责人">
          <span>{{ applyPermissionForm.template.ownerName || '未指定' }}</span>
        </el-form-item>

        <el-form-item label="申请理由" required>
          <el-input
            v-model="applyPermissionForm.applyReason"
            type="textarea"
            :rows="4"
            placeholder="请说明申请查看该模板的理由（至少10个字）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="权限有效期" required>
          <el-date-picker
            v-model="applyPermissionForm.expiryDate"
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

        <el-alert type="info" :closable="false">
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
        <el-button @click="applyPermissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPermissionApplication">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
function isOverdue(row) {
  if (!row.deadlineDate) return false
  return new Date(row.deadlineDate) < new Date()
}
</script>

<style scoped>
.tpl-name {
  font-weight: 500;
  color: #1677ff;
  cursor: pointer;
}
.tpl-name:hover { text-decoration: underline; }
.tpl-code { font-size: 12px; color: #aaa; margin-top: 2px; }
.tpl-name-cell { display: flex; align-items: center; }
.text-danger { color: #ff4d4f; }
</style>
