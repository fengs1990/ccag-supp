<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

// 筛选条件
const filterForm = ref({
  orgCode: '',
  urgeType: '', // overdue/reject_over
  urgeStatus: '', // 0=未处理，1=已处理，2=已忽略
})

// Mock 督办单数据（基于 ccag_supp_urge_task 表结构）
// 督办单生成时，延期截止日期 = 创建时间 + 系统配置的延期天数（默认30天）
const urgeTaskList = ref([
  {
    id: 1,
    urgeType: 'OVERDUE',
    targetOrgCode: 'UNIT_CA',
    targetOrgName: '长安乘用车',
    targetDocId: 1001,
    docNo: 'DOC-2026-001001',
    templateId: 1,
    templateName: '财务数据补录模板',
    templateOwnerId: 'admin_group', // 模板负责人
    templateCreateBy: 'admin_group', // 模板创建人
    triggerValue: 32, // 逾期天数
    pushUserId: 'admin_ca',
    pushUserName: '张管理员',
    urgeStatus: 0, // 未处理
    handleTime: null,
    handleRemark: null,
    createBy: 'system',
    createTime: '2026-10-15 09:00:00',
    extendDeadline: '2026-11-14', // 延期截止日期（创建时间 + 30天）
  },
  {
    id: 2,
    urgeType: 'REJECT_OVER',
    targetOrgCode: 'UNIT_CA',
    targetOrgName: '长安乘用车',
    targetDocId: 1004,
    docNo: 'DOC-2026-001004',
    templateId: 1,
    templateName: '财务数据补录模板',
    templateOwnerId: 'admin_group',
    templateCreateBy: 'admin_group',
    triggerValue: 3, // 驳回次数
    pushUserId: 'admin_ca',
    pushUserName: '张管理员',
    urgeStatus: 0, // 未处理
    handleTime: null,
    handleRemark: null,
    createBy: 'system',
    createTime: '2026-10-16 10:00:00',
    extendDeadline: '2026-11-15', // 驳回类型督办单也设置延期日期
  },
  {
    id: 3,
    urgeType: 'OVERDUE',
    targetOrgCode: 'UNIT_CS',
    targetOrgName: '长安商用车',
    targetDocId: 1005,
    docNo: 'DOC-2026-001005',
    templateId: 2,
    templateName: '生产月度产量补录模板',
    templateOwnerId: 'owner_prod',
    templateCreateBy: 'admin_group',
    triggerValue: 17, // 逾期天数
    pushUserId: 'admin_cs',
    pushUserName: '李管理员',
    urgeStatus: 1, // 已处理
    handleTime: '2026-10-17 14:00:00',
    handleRemark: '已联系填报人，预计明日完成',
    createBy: 'system',
    createTime: '2026-10-14 09:00:00',
    extendDeadline: '2026-11-13', // 创建时间 + 30天
  },
  {
    id: 4,
    urgeType: 'OVERDUE',
    targetOrgCode: 'UNIT_KS',
    targetOrgName: '长安跨越',
    targetDocId: 1006,
    docNo: 'DOC-2026-001006',
    templateId: 2,
    templateName: '生产月度产量补录模板',
    templateOwnerId: 'owner_prod',
    templateCreateBy: 'admin_group',
    triggerValue: 107, // 逾期天数
    pushUserId: 'admin_ks',
    pushUserName: '王管理员',
    urgeStatus: 0, // 未处理
    handleTime: null,
    handleRemark: null,
    createBy: 'system',
    createTime: '2026-10-10 09:00:00',
    extendDeadline: '2026-11-09', // 创建时间 + 30天
  },
  {
    id: 5,
    urgeType: 'REJECT_OVER',
    targetOrgCode: 'UNIT_EV',
    targetOrgName: '阿维塔科技',
    targetDocId: 1007,
    docNo: 'DOC-2026-001007',
    templateId: 1,
    templateName: '财务数据补录模板',
    templateOwnerId: 'admin_group',
    templateCreateBy: 'admin_group',
    triggerValue: 2, // 驳回次数
    pushUserId: 'admin_ev',
    pushUserName: '赵管理员',
    urgeStatus: 2, // 已关闭
    handleTime: '2026-10-16 16:00:00',
    handleRemark: '该单据已由填报人撤回重新提交',
    createBy: 'system',
    createTime: '2026-10-15 15:00:00',
    extendDeadline: '2026-11-14', // 创建时间 + 30天
  },
])

// 督办类型
const URGE_TYPES = {
  OVERDUE: { label: '逾期未完成', type: 'danger', icon: 'Clock' },
  REJECT_OVER: { label: '驳回超阈值', type: 'warning', icon: 'CircleClose' },
}

// 督办状态
const URGE_STATUS = {
  0: { label: '待处理', type: 'danger' },
  1: { label: '已完成', type: 'success' },
  2: { label: '已忽略', type: 'info' },
}

// 筛选后的数据
const filteredData = computed(() => {
  let list = urgeTaskList.value
  // 二级单位只能看自己单位的数据
  if (userStore.isUnitAdmin) {
    list = list.filter(d => d.targetOrgCode === userStore.currentRole.orgCode)
  }
  if (filterForm.value.orgCode) {
    list = list.filter(d => d.targetOrgCode === filterForm.value.orgCode)
  }
  if (filterForm.value.urgeType) {
    list = list.filter(d => d.urgeType === filterForm.value.urgeType)
  }
  if (filterForm.value.urgeStatus !== '') {
    list = list.filter(d => d.urgeStatus === Number(filterForm.value.urgeStatus))
  }
  return list.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
})

// 汇总统计
const summary = computed(() => {
  const total = filteredData.value.length
  const pending = filteredData.value.filter(d => d.urgeStatus === 0).length
  const completed = filteredData.value.filter(d => d.urgeStatus === 1).length
  const ignored = filteredData.value.filter(d => d.urgeStatus === 2).length
  return { total, pending, completed, ignored }
})

function resetFilter() {
  filterForm.value = { orgCode: '', urgeType: '', urgeStatus: '' }
}

function completeTask(row) {
  ElMessage.success(`督办单「${row.docNo}」已标记为完成`)
  row.urgeStatus = 1
  row.handleTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
  row.handleRemark = '督办已完成'
}

function ignoreTask(row) {
  ElMessage.info(`已忽略督办单「${row.docNo}」`)
  row.urgeStatus = 2
  row.handleTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
  row.handleRemark = '督办已忽略'
}

function viewDocument(row) {
  router.push({
    path: `/document/detail/${row.targetDocId}`,
    query: {
      fromUrge: 1,
      orgCode: row.targetOrgCode,
      templateId: row.templateId
    }
  })
}

function exportData() {
  ElMessage.success('导出督办清单成功')
}

// 延期功能
const extendDialogVisible = ref(false)
const extendForm = ref({
  taskId: null,
  docNo: '',
  newDeadline: '',
})

// 判断当前用户是否有权限延期（模板负责人或创建人）
function canExtendDeadline(row) {
  if (row.urgeType !== 'OVERDUE' || row.urgeStatus !== 0) {
    return false
  }
  const currentUserId = userStore.currentRole.userId || 'admin_group'
  return currentUserId === row.templateOwnerId || currentUserId === row.templateCreateBy
}

// 打开延期对话框
function openExtendDialog(row) {
  extendForm.value = {
    taskId: row.id,
    docNo: row.docNo,
    newDeadline: '',
  }
  extendDialogVisible.value = true
}

// 保存延期
function saveExtendDeadline() {
  if (!extendForm.value.newDeadline) {
    ElMessage.warning('请选择延期截止日期')
    return
  }

  ElMessageBox.confirm(
    `确认将单据「${extendForm.value.docNo}」的截止日期延期至 ${extendForm.value.newDeadline}？`,
    '确认延期',
    {
      type: 'warning',
      confirmButtonText: '确认延期',
      cancelButtonText: '取消',
    }
  ).then(() => {
    const task = urgeTaskList.value.find(t => t.id === extendForm.value.taskId)
    if (task) {
      task.extendDeadline = extendForm.value.newDeadline
      ElMessage.success('延期设置成功')
      extendDialogVisible.value = false
    }
  }).catch(() => {})
}

// 设计问题弹窗
const designIssuesVisible = ref(false)

</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">督办任务管理</div>
        <div class="page-desc">系统自动扫描逾期未完成和驳回超阈值的补录任务，生成督办清单推送给分管管理员</div>
      </div>
      <div style="display:flex;gap:8px">
        <el-button :icon="'QuestionFilled'" @click="designIssuesVisible = true">设计问题</el-button>
        <el-button type="primary" :icon="'Download'" @click="exportData">导出清单</el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size:14px;color:#666;margin-bottom:8px">督办任务总数</div>
          <div style="font-size:28px;font-weight:600;color:#333">{{ summary.total }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size:14px;color:#666;margin-bottom:8px">待处理</div>
          <div style="font-size:28px;font-weight:600;color:#f56c6c">{{ summary.pending }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size:14px;color:#666;margin-bottom:8px">已完成</div>
          <div style="font-size:28px;font-weight:600;color:#67c23a">{{ summary.completed }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size:14px;color:#666;margin-bottom:8px">已忽略</div>
          <div style="font-size:28px;font-weight:600;color:#909399">{{ summary.ignored }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never" style="margin-bottom:16px">
      <el-form :model="filterForm" inline>
        <el-form-item label="所属单位">
          <el-select v-model="filterForm.orgCode" placeholder="全部" clearable style="width:160px">
            <el-option label="长安乘用车" value="UNIT_CA" />
            <el-option label="长安商用车" value="UNIT_CS" />
            <el-option label="长安跨越" value="UNIT_KS" />
            <el-option label="阿维塔科技" value="UNIT_EV" />
          </el-select>
        </el-form-item>
        <el-form-item label="督办类型">
          <el-select v-model="filterForm.urgeType" placeholder="全部" clearable style="width:140px">
            <el-option label="逾期未完成" value="OVERDUE" />
            <el-option label="驳回超阈值" value="REJECT_OVER" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="filterForm.urgeStatus" placeholder="全部" clearable style="width:120px">
            <el-option label="待处理" :value="0" />
            <el-option label="已完成" :value="1" />
            <el-option label="已忽略" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="'Search'">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 督办清单 -->
    <el-card shadow="never">
      <template #header>
        <span style="font-weight:600">督办清单（{{ filteredData.length }} 条）</span>
      </template>
      <el-table :data="filteredData" style="width:100%" stripe>
        <el-table-column prop="targetOrgName" label="被督办单位" width="130" />
        <el-table-column label="督办类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="URGE_TYPES[row.urgeType].type" size="small">
              <el-icon style="margin-right:4px"><component :is="URGE_TYPES[row.urgeType].icon" /></el-icon>
              {{ URGE_TYPES[row.urgeType].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="关联单据" width="150">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="viewDocument(row)">
              {{ row.docNo }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="模板名称" min-width="180">
          <template #default="{ row }">
            {{ row.templateName }}
          </template>
        </el-table-column>
        <el-table-column label="触发值" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.urgeType === 'OVERDUE'" :style="{ color: row.triggerValue > 30 ? '#f56c6c' : '#e6a23c' }">
              逾期 {{ row.triggerValue }} 天
            </span>
            <span v-else :style="{ color: '#e6a23c' }">
              驳回 {{ row.triggerValue }} 次
            </span>
          </template>
        </el-table-column>
        <el-table-column label="推送对象" width="110">
          <template #default="{ row }">
            {{ row.pushUserName }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="生成时间" width="160" />
        <el-table-column label="处理状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="URGE_STATUS[row.urgeStatus].type" size="small">
              {{ URGE_STATUS[row.urgeStatus].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理时间" width="160">
          <template #default="{ row }">
            {{ row.handleTime || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="延期截止日期" width="120" align="center">
          <template #default="{ row }">
            <span v-if="row.extendDeadline" style="color:#e6a23c;font-weight:500">
              {{ row.extendDeadline }}
            </span>
            <span v-else style="color:#ccc">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewDocument(row)">查看单据</el-button>
            <el-button link type="warning" size="small" @click="openExtendDialog(row)">
              延期
            </el-button>
            <el-button v-if="row.urgeStatus === 0" link type="success" size="small" @click="completeTask(row)">
              完成督办
            </el-button>
            <el-button v-if="row.urgeStatus === 0" link type="info" size="small" @click="ignoreTask(row)">
              忽略
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 延期对话框 -->
    <el-dialog v-model="extendDialogVisible" title="单据延期" width="500px">
      <el-form :model="extendForm" label-width="120px">
        <el-form-item label="单据编号">
          <el-input v-model="extendForm.docNo" disabled />
        </el-form-item>
        <el-form-item label="延期截止日期" required>
          <el-date-picker
            v-model="extendForm.newDeadline"
            type="date"
            placeholder="选择新的截止日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="extendDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveExtendDeadline">确认延期</el-button>
      </template>
    </el-dialog>

    <!-- 设计问题弹窗 -->
    <el-dialog v-model="designIssuesVisible" title="督办管理 - 设计问题讨论" width="700px">
      <div style="line-height:1.8;color:#333">
        <div style="background:#fff7e6;border-left:4px solid #faad14;padding:12px 16px;margin-bottom:20px">
          <div style="font-weight:600;color:#d46b08;margin-bottom:8px">
            <el-icon style="vertical-align:middle"><Warning /></el-icon>
            原型阶段待讨论问题
          </div>
          <div style="font-size:13px;color:#ad6800">
            以下问题需要在详细设计阶段明确业务规则，目前仅在原型中体现基本交互流程
          </div>
        </div>

        <div style="margin-bottom:24px">
          <div style="font-weight:600;font-size:15px;color:#1677ff;margin-bottom:12px">
            问题 1：督办阈值的配置方式
          </div>
          <div style="padding-left:16px;margin-bottom:12px">
            <div style="font-weight:600;margin-bottom:6px">问题描述：</div>
            <div style="color:#666;margin-bottom:12px">
              如何界定驳回次数和逾期天数是否达到阈值？单据表（ccag_supp_document）中并没有存储阈值字段。
            </div>
            <div style="font-weight:600;margin-bottom:6px">待确认：</div>
            <ul style="margin:0;padding-left:20px;color:#666">
              <li>是否所有单据统一使用一个全局阈值？（如：驳回3次触发督办，逾期30天触发督办）</li>
              <li>还是按模板维度配置不同阈值？（财务模板驳回2次即督办，生产模板驳回5次才督办）</li>
              <li>还是按单位维度配置阈值？（重点单位更严格，一般单位更宽松）</li>
              <li>阈值配置是否需要单独的管理界面？由谁来配置和调整？</li>
            </ul>
            <div style="background:#f6ffed;border:1px solid #b7eb8f;padding:10px;margin-top:12px;border-radius:4px">
              <div style="color:#389e0d;font-size:13px">
                <strong>建议方案：</strong>在系统配置表中维护阈值参数，支持全局默认值 + 按模板/单位的个性化覆盖
              </div>
            </div>
          </div>
        </div>

        <div style="margin-bottom:24px">
          <div style="font-weight:600;font-size:15px;color:#1677ff;margin-bottom:12px">
            问题 2：账期控制与督办单的冲突处理
          </div>
          <div style="padding-left:16px;margin-bottom:12px">
            <div style="font-weight:600;margin-bottom:6px">问题描述：</div>
            <div style="color:#666;margin-bottom:12px">
              如果单据逾期时已超过该模板允许的账期范围（如模板规定只能补录T-3以内的数据），此时单据既无法在规定时间内完成，也无法跨账期填报，形成死锁。
            </div>
            <div style="font-weight:600;margin-bottom:6px">待确认：</div>
            <ul style="margin:0;padding-left:20px;color:#666">
              <li>是否允许存在督办单的情况下，对应单位在该模板下不受账期控制？</li>
              <li>还是督办单生成后自动延长截止日期和账期限制？</li>
              <li>还是将此类单据标记为"异常单据"，走特殊审批流程由集团特批放开账期？</li>
              <li>如何避免督办机制被滥用（故意拖延至账期外，利用督办单绕过账期控制）？</li>
            </ul>
            <div style="background:#f6ffed;border:1px solid #b7eb8f;padding:10px;margin-top:12px;border-radius:4px">
              <div style="color:#389e0d;font-size:13px">
                <strong>建议方案：</strong>督办单触发后自动延期30天，但需要分管领导审批确认；延期次数记录在案用于考核
              </div>
            </div>
          </div>
        </div>

        <div style="background:#f0f5ff;border:1px solid #adc6ff;padding:12px;border-radius:4px">
          <div style="font-weight:600;color:#1677ff;margin-bottom:6px">
            <el-icon style="vertical-align:middle"><InfoFilled /></el-icon>
            后续行动
          </div>
          <div style="font-size:13px;color:#1677ff">
            • 召开业务需求澄清会，邀请财务、生产、IT、管理层代表<br>
            • 形成《督办管理业务规则说明书》文档<br>
            • 在详细设计阶段补充阈值配置表和账期豁免审批流程设计
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="designIssuesVisible = false">知道了</el-button>
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
