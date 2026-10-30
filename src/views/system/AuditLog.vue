<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 筛选条件
const filterForm = ref({
  bizType: '',
  opType: '',
  opUserId: '',
  startTime: '',
  endTime: '',
})

const activeFilter = ref({ ...filterForm.value })

// 业务类型（模块级）
const BIZ_TYPES = {
  TEMPLATE: { label: '补录模板', color: '#52c41a' },
  DOCUMENT: { label: '补录单据', color: '#1677ff' },
  DOCUMENT_DATA: { label: '单据数据', color: '#13c2c2' },
  IMPORT_TASK: { label: '导入任务', color: '#722ed1' },
  ATTACHMENT: { label: '附件管理', color: '#eb2f96' },
  AUDIT_LOG: { label: '操作日志', color: '#fa8c16' },
  EXPORT_APPLY: { label: '导出申请', color: '#faad14' },
}

// 操作类型
const OP_TYPES = {
  CREATE: { label: '新增', type: 'success', icon: 'Plus' },
  EDIT: { label: '编辑', type: 'primary', icon: 'Edit' },
  DELETE: { label: '删除', type: 'danger', icon: 'Delete' },
  IMPORT: { label: '导入', type: 'info', icon: 'Upload' },
  SUBMIT: { label: '提交', type: 'warning', icon: 'Promotion' },
  APPROVE: { label: '审批通过', type: 'success', icon: 'CircleCheck' },
  REJECT: { label: '审批驳回', type: 'danger', icon: 'CircleClose' },
  WITHDRAW: { label: '撤回', type: 'info', icon: 'RefreshLeft' },
  ARCHIVE: { label: '归档', type: 'success', icon: 'Finished' },
  CORRECTION: { label: '更正', type: 'warning', icon: 'EditPen' },
  EXPORT: { label: '导出', type: 'primary', icon: 'Download' },
  UPLOAD: { label: '上传', type: 'info', icon: 'Upload' },
  DOWNLOAD: { label: '下载', type: 'primary', icon: 'Download' },
  PUBLISH: { label: '发布', type: 'success', icon: 'Promotion' },
  DISTRIBUTE: { label: '下发', type: 'warning', icon: 'Position' },
}

// Mock 操作日志数据
const auditLogs = ref([
  {
    id: 1,
    bizType: 'DOCUMENT',
    bizId: '1001',
    opType: 'CREATE',
    opUserId: 'u001',
    opUserName: '张小红',
    opTime: '2026-10-17 09:30:00',
    clientIp: '192.168.1.100',
    opDesc: '创建单据 [DOC-2026-001001] 财务数据补录-2026年9月',
  },
  {
    id: 2,
    bizType: 'DOCUMENT_DATA',
    bizId: '1001',
    opType: 'EDIT',
    opUserId: 'u001',
    opUserName: '张小红',
    opTime: '2026-10-17 10:15:00',
    clientIp: '192.168.1.100',
    opDesc: '编辑单据数据 [DOC-2026-001001] 财务数据补录-2026年9月',
  },
  {
    id: 3,
    bizType: 'DOCUMENT',
    bizId: '1001',
    opType: 'SUBMIT',
    opUserId: 'u001',
    opUserName: '张小红',
    opTime: '2026-10-17 10:30:00',
    clientIp: '192.168.1.100',
    opDesc: '提交单据 [DOC-2026-001001] 财务数据补录-2026年9月',
  },
  {
    id: 4,
    bizType: 'DOCUMENT',
    bizId: '1001',
    opType: 'APPROVE',
    opUserId: 'u004',
    opUserName: '陈志远',
    opTime: '2026-10-17 14:20:00',
    clientIp: '192.168.1.105',
    opDesc: '审批通过 [DOC-2026-001001] 财务数据补录-2026年9月',
  },
  {
    id: 5,
    bizType: 'DOCUMENT',
    bizId: '1004',
    opType: 'REJECT',
    opUserId: 'u004',
    opUserName: '陈志远',
    opTime: '2026-10-17 15:30:00',
    clientIp: '192.168.1.105',
    opDesc: '审批驳回 [DOC-2026-001004] 销售数据补录-2026年9月',
  },
  {
    id: 6,
    bizType: 'ATTACHMENT',
    bizId: '1',
    opType: 'UPLOAD',
    opUserId: 'u001',
    opUserName: '张小红',
    opTime: '2026-10-17 09:45:00',
    clientIp: '192.168.1.100',
    opDesc: '上传附件 财务凭证_202609.pdf',
  },
  {
    id: 7,
    bizType: 'IMPORT_TASK',
    bizId: '101',
    opType: 'IMPORT',
    opUserId: 'u001',
    opUserName: '张小红',
    opTime: '2026-10-16 16:00:00',
    clientIp: '192.168.1.100',
    opDesc: 'Excel批量导入 [DOC-2026-001002] 生产数据补录-2026年9月',
  },
  {
    id: 8,
    bizType: 'EXPORT_APPLY',
    bizId: 'export_001',
    opType: 'EXPORT',
    opUserId: 'u002',
    opUserName: '李明华',
    opTime: '2026-10-17 11:00:00',
    clientIp: '192.168.1.102',
    opDesc: '导出单据数据 [DOC-2026-001001] 财务数据补录-2026年9月',
  },
  {
    id: 9,
    bizType: 'TEMPLATE',
    bizId: '1',
    opType: 'EDIT',
    opUserId: 'u003',
    opUserName: '王建国',
    opTime: '2026-10-10 14:30:00',
    clientIp: '192.168.1.103',
    opDesc: '修改模板配置 [TPL-001] 财务数据补录模板',
  },
  {
    id: 10,
    bizType: 'DOCUMENT',
    bizId: '1003',
    opType: 'ARCHIVE',
    opUserId: 'u002',
    opUserName: '李明华',
    opTime: '2026-10-17 16:00:00',
    clientIp: '192.168.1.102',
    opDesc: '单据归档 [DOC-2026-001003] 采购数据补录-2026年9月',
  },
  {
    id: 11,
    bizType: 'TEMPLATE',
    bizId: '1',
    opType: 'PUBLISH',
    opUserId: 'u003',
    opUserName: '王建国',
    opTime: '2026-09-01 10:30:00',
    clientIp: '192.168.1.103',
    opDesc: '发布模板 [TPL-001] 财务数据补录模板 V3',
  },
  {
    id: 12,
    bizType: 'TEMPLATE',
    bizId: '1',
    opType: 'DISTRIBUTE',
    opUserId: 'u003',
    opUserName: '王建国',
    opTime: '2026-09-05 10:30:00',
    clientIp: '192.168.1.103',
    opDesc: '下发模板 [TPL-001] 财务数据补录模板',
  },
])

// 筛选后的数据
const filteredData = computed(() => {
  let list = auditLogs.value
  if (activeFilter.value.bizType) {
    list = list.filter(d => d.bizType === activeFilter.value.bizType)
  }
  if (activeFilter.value.opType) {
    list = list.filter(d => d.opType === activeFilter.value.opType)
  }
  if (activeFilter.value.opUserId) {
    list = list.filter(d => d.opUserName.includes(activeFilter.value.opUserId))
  }
  if (activeFilter.value.startTime) {
    list = list.filter(d => d.opTime >= activeFilter.value.startTime)
  }
  if (activeFilter.value.endTime) {
    list = list.filter(d => d.opTime <= activeFilter.value.endTime)
  }
  return list.sort((a, b) => new Date(b.opTime) - new Date(a.opTime))
})

// 统计数据
const summary = computed(() => {
  const total = filteredData.value.length
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = filteredData.value.filter(d => d.opTime.startsWith(today)).length
  const userCount = new Set(filteredData.value.map(d => d.opUserId)).size
  return { total, todayCount, userCount }
})

function doSearch() {
  activeFilter.value = { ...filterForm.value }
}

function resetFilter() {
  filterForm.value = {
    bizType: '',
    opType: '',
    opUserId: '',
    startTime: '',
    endTime: '',
  }
  activeFilter.value = { ...filterForm.value }
}

// 查看详情
const detailDialogVisible = ref(false)
const currentLog = ref(null)

function viewDetail(row) {
  currentLog.value = row
  detailDialogVisible.value = true
}

// 格式化JSON
function formatJson(data) {
  if (!data) return '无'
  return JSON.stringify(data, null, 2)
}

// 导出日志
function exportLogs() {
  ElMessage.success('导出操作日志成功')
}

// 问题反馈
const issueDialogVisible = ref(false)
const issues = [
  {
    id: 1,
    title: '日志记录粒度问题',
    category: '性能优化',
    priority: 'high',
    description: '单条数据的操作可以记录，批量操作的数据如果要记录批量操作的所有数据明细会导致系统缓慢，操作日志表数据量不可控，后面查询也会有很大的压力。',
    suggestions: [
      '批量操作只记录汇总信息（如"批量导入100条数据，成功95条，失败5条"），不记录每条数据的详细快照',
      '对于批量删除、批量修改等操作，只记录操作范围（如筛选条件）和影响行数，不记录每行的before_data',
      '引入日志级别机制：基础级别只记录操作摘要，详细级别记录完整快照，由配置决定',
      '考虑日志归档策略：超过一定时间（如6个月）的详细快照可以归档到冷存储',
    ],
    impact: '如果每个批量操作都记录所有明细，当用户批量导入1000条数据时，将产生1000条日志记录，导致：\n1. 数据库写入压力大，影响主业务性能\n2. 日志表快速膨胀，查询性能下降\n3. 存储成本增加',
    status: 'pending',
    createTime: '2026-10-17 18:00:00',
  }
]

function showIssues() {
  issueDialogVisible.value = true
}
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">操作日志</div>
        <div class="page-desc">系统所有操作的审计记录，支持查询和追溯</div>
      </div>
      <div style="display:flex;gap:8px">
        <el-button :icon="'Warning'" @click="showIssues">设计问题</el-button>
        <el-button type="primary" :icon="'Download'" @click="exportLogs">导出日志</el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="8">
        <el-card shadow="hover">
          <div style="font-size:14px;color:#666;margin-bottom:8px">总操作记录</div>
          <div style="font-size:28px;font-weight:600;color:#333">{{ summary.total }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div style="font-size:14px;color:#666;margin-bottom:8px">今日操作</div>
          <div style="font-size:28px;font-weight:600;color:#1677ff">{{ summary.todayCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div style="font-size:14px;color:#666;margin-bottom:8px">活跃用户数</div>
          <div style="font-size:28px;font-weight:600;color:#52c41a">{{ summary.userCount }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never" style="margin-bottom:16px">
      <el-form :model="filterForm" inline>
        <el-form-item label="业务类型">
          <el-select v-model="filterForm.bizType" placeholder="全部" clearable style="width:140px">
            <el-option v-for="(v, k) in BIZ_TYPES" :key="k" :label="v.label" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="filterForm.opType" placeholder="全部" clearable style="width:120px">
            <el-option v-for="(v, k) in OP_TYPES" :key="k" :label="v.label" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="filterForm.opUserId" placeholder="用户名" clearable style="width:120px" />
        </el-form-item>
        <el-form-item label="操作时间">
          <el-date-picker
            v-model="filterForm.startTime"
            type="datetime"
            placeholder="开始时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width:180px"
          />
          <span style="margin:0 8px">至</span>
          <el-date-picker
            v-model="filterForm.endTime"
            type="datetime"
            placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width:180px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="'Search'" @click="doSearch">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 日志列表 -->
    <el-card shadow="never">
      <template #header>
        <span style="font-weight:600">操作日志（{{ filteredData.length }} 条）</span>
      </template>
      <el-table :data="filteredData" style="width:100%" stripe>
        <el-table-column prop="opTime" label="操作时间" width="160" />
        <el-table-column label="业务类型" width="110">
          <template #header>
            <span>业务类型</span>
            <el-tooltip
              content="系统模块分类：补录模板、补录单据、单据数据、导入任务、附件管理等"
              placement="top"
            >
              <el-icon style="margin-left:4px;color:#909399;cursor:help"><QuestionFilled /></el-icon>
            </el-tooltip>
          </template>
          <template #default="{ row }">
            <el-tag
              size="small"
              :style="{
                backgroundColor: BIZ_TYPES[row.bizType]?.color + '15',
                color: BIZ_TYPES[row.bizType]?.color,
                border: '1px solid ' + BIZ_TYPES[row.bizType]?.color + '40'
              }"
            >
              {{ BIZ_TYPES[row.bizType]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作类型" width="110" align="center">
          <template #header>
            <span>操作类型</span>
            <el-tooltip
              content="具体操作行为：新增、编辑、删除、提交、审批、导入、导出等"
              placement="top"
            >
              <el-icon style="margin-left:4px;color:#909399;cursor:help"><QuestionFilled /></el-icon>
            </el-tooltip>
          </template>
          <template #default="{ row }">
            <el-tag :type="OP_TYPES[row.opType]?.type" size="small">
              <el-icon style="margin-right:4px"><component :is="OP_TYPES[row.opType]?.icon" /></el-icon>
              {{ OP_TYPES[row.opType]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="opDesc" label="操作描述" min-width="250" show-overflow-tooltip />
        <el-table-column label="操作人" width="110">
          <template #default="{ row }">
            <div style="font-weight:500">{{ row.opUserName }}</div>
            <div style="font-size:12px;color:#aaa">{{ row.opUserId }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="clientIp" label="IP地址" width="130" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="操作日志详情"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-descriptions v-if="currentLog" :column="2" border>
        <el-descriptions-item label="日志ID">{{ currentLog.id }}</el-descriptions-item>
        <el-descriptions-item label="业务类型">
          <el-tag
            size="small"
            :style="{
              backgroundColor: BIZ_TYPES[currentLog.bizType]?.color + '15',
              color: BIZ_TYPES[currentLog.bizType]?.color,
              border: '1px solid ' + BIZ_TYPES[currentLog.bizType]?.color + '40'
            }"
          >
            {{ BIZ_TYPES[currentLog.bizType]?.label }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作类型">
          <el-tag :type="OP_TYPES[currentLog.opType]?.type" size="small">
            {{ OP_TYPES[currentLog.opType]?.label }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作人">{{ currentLog.opUserName }}（{{ currentLog.opUserId }}）</el-descriptions-item>
        <el-descriptions-item label="操作时间">{{ currentLog.opTime }}</el-descriptions-item>
        <el-descriptions-item label="客户端IP">{{ currentLog.clientIp }}</el-descriptions-item>
        <el-descriptions-item label="操作描述" :span="2">{{ currentLog.opDesc }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 设计问题弹窗 -->
    <el-dialog
      v-model="issueDialogVisible"
      title="原型设计问题记录"
      width="900px"
      :close-on-click-modal="false"
    >
      <div style="margin-bottom:16px;padding:12px;background:#fff7e6;border:1px solid #ffd591;border-radius:6px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <el-icon color="#fa8c16" :size="18"><Warning /></el-icon>
          <span style="font-weight:600;color:#fa8c16">原型阶段待讨论问题</span>
        </div>
        <div style="font-size:13px;color:#666">
          以下是操作日志功能在原型设计阶段发现的需要与团队讨论的问题，这些问题可能影响系统性能、存储成本或用户体验。
        </div>
      </div>

      <div v-for="issue in issues" :key="issue.id" style="margin-bottom:24px">
        <el-card shadow="hover">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <el-tag
                  :type="issue.priority === 'high' ? 'danger' : issue.priority === 'medium' ? 'warning' : 'info'"
                  size="small"
                >
                  {{ issue.priority === 'high' ? '高优先级' : issue.priority === 'medium' ? '中优先级' : '低优先级' }}
                </el-tag>
                <el-tag type="info" size="small" effect="plain">{{ issue.category }}</el-tag>
                <span style="font-size:12px;color:#999">{{ issue.createTime }}</span>
              </div>
              <div style="font-size:16px;font-weight:600;color:#333">问题{{ issue.id }}：{{ issue.title }}</div>
            </div>
            <el-tag :type="issue.status === 'resolved' ? 'success' : 'warning'" size="small">
              {{ issue.status === 'resolved' ? '已解决' : '待讨论' }}
            </el-tag>
          </div>

          <el-divider style="margin:16px 0" />

          <div style="margin-bottom:16px">
            <div style="font-weight:600;color:#333;margin-bottom:8px">问题描述：</div>
            <div style="font-size:14px;color:#666;line-height:1.8;white-space:pre-wrap">{{ issue.description }}</div>
          </div>

          <div v-if="issue.impact" style="margin-bottom:16px;padding:12px;background:#fff2e8;border-radius:6px">
            <div style="font-weight:600;color:#fa541c;margin-bottom:8px">影响分析：</div>
            <div style="font-size:13px;color:#666;line-height:1.8;white-space:pre-wrap">{{ issue.impact }}</div>
          </div>

          <div v-if="issue.suggestions && issue.suggestions.length">
            <div style="font-weight:600;color:#333;margin-bottom:8px">建议方案：</div>
            <ul style="margin:0;padding-left:24px">
              <li
                v-for="(suggestion, idx) in issue.suggestions"
                :key="idx"
                style="font-size:14px;color:#666;line-height:1.8;margin-bottom:8px"
              >
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </el-card>
      </div>

      <template #footer>
        <el-button @click="issueDialogVisible = false">关闭</el-button>
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
