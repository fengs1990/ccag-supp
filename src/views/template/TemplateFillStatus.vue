<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mockTemplates, mockDistributions, COLLECT_FREQUENCIES } from '../../mock/template.js'
import { mockGroups } from '../../mock/group.js'
import { mockDocuments } from '../../mock/document.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()

const templateId = computed(() => Number(route.params.id))
const currentTemplate = ref(null)
const currentGroup = ref(null)
const groupTemplates = ref([])
const pageMode = ref('single') // 'single' 或 'group'

const distributions = ref([])

// 查询条件
const queryForm = ref({
  startPeriod: '',
  endPeriod: '',
})

// 填报统计数据
const fillStatusData = ref([])

// 选中的缺失账期（用于生成督办单）
const selectedMissingItems = ref([])

// 分组模式下的模板Tab切换
const activeTemplateTab = ref(null)

onMounted(() => {
  const template = mockTemplates.find(t => t.id === templateId.value)

  if (!template) {
    ElMessage.error('模板不存在')
    router.back()
    return
  }

  currentTemplate.value = template

  // 判断模板是否属于分组
  if (currentTemplate.value.groupId) {
    // 分组模板：显示整个分组的填报情况
    currentGroup.value = mockGroups.find(g => g.id === currentTemplate.value.groupId)
    groupTemplates.value = mockTemplates.filter(t => t.groupId === currentTemplate.value.groupId)
    pageMode.value = 'group'
    // 默认选中当前模板
    activeTemplateTab.value = currentTemplate.value.id
  } else {
    // 独立模板：仅显示该模板的填报情况
    groupTemplates.value = [currentTemplate.value]
    pageMode.value = 'single'
    activeTemplateTab.value = currentTemplate.value.id
  }

  // 加载分发记录（分组模式下加载所有组内模板的分发记录）
  if (pageMode.value === 'group') {
    const groupTemplateIds = groupTemplates.value.map(t => t.id)
    distributions.value = mockDistributions.filter(d => groupTemplateIds.includes(d.templateId))
  } else {
    distributions.value = mockDistributions.filter(d => d.templateId === templateId.value)
  }

  // 默认查询最近6个月
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  queryForm.value.startPeriod = formatPeriod(sixMonthsAgo, currentTemplate.value.collectFrequency)
  queryForm.value.endPeriod = formatPeriod(now, currentTemplate.value.collectFrequency)

  doQuery()
})

// 根据填报周期格式化账期
function formatPeriod(date, frequency) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  switch (frequency) {
    case 'YEAR':
      return `${year}`
    case 'HALF_YEAR':
      return `${year}H${month <= 6 ? 1 : 2}`
    case 'QUARTER':
      return `${year}Q${Math.ceil(month / 3)}`
    case 'MONTH':
      return `${year}-${String(month).padStart(2, '0')}`
    case 'WEEK':
      const weekNum = Math.ceil((date.getDate() + new Date(year, month - 1, 1).getDay()) / 7)
      return `${year}W${String(weekNum).padStart(2, '0')}`
    case 'DAY':
      return `${year}-${String(month).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    default:
      return `${year}-${String(month).padStart(2, '0')}`
  }
}

// 生成账期列表
function generatePeriods(start, end, frequency) {
  const periods = []
  const startDate = parsePeriod(start, frequency)
  const endDate = parsePeriod(end, frequency)

  let current = new Date(startDate)
  while (current <= endDate) {
    periods.push(formatPeriod(current, frequency))
    current = getNextPeriod(current, frequency)
  }

  return periods
}

// 解析账期字符串为日期
function parsePeriod(periodStr, frequency) {
  if (!periodStr) return new Date()

  switch (frequency) {
    case 'YEAR':
      return new Date(parseInt(periodStr), 0, 1)
    case 'HALF_YEAR': {
      const [year, half] = periodStr.split('H')
      return new Date(parseInt(year), half === '1' ? 0 : 6, 1)
    }
    case 'QUARTER': {
      const [year, quarter] = periodStr.split('Q')
      return new Date(parseInt(year), (parseInt(quarter) - 1) * 3, 1)
    }
    case 'MONTH':
      return new Date(periodStr + '-01')
    case 'WEEK': {
      const [year, week] = periodStr.split('W')
      const date = new Date(parseInt(year), 0, 1)
      date.setDate(date.getDate() + (parseInt(week) - 1) * 7)
      return date
    }
    case 'DAY':
      return new Date(periodStr)
    default:
      return new Date(periodStr + '-01')
  }
}

// 获取下一个账期
function getNextPeriod(date, frequency) {
  const next = new Date(date)
  switch (frequency) {
    case 'YEAR':
      next.setFullYear(next.getFullYear() + 1)
      break
    case 'HALF_YEAR':
      next.setMonth(next.getMonth() + 6)
      break
    case 'QUARTER':
      next.setMonth(next.getMonth() + 3)
      break
    case 'MONTH':
      next.setMonth(next.getMonth() + 1)
      break
    case 'WEEK':
      next.setDate(next.getDate() + 7)
      break
    case 'DAY':
      next.setDate(next.getDate() + 1)
      break
  }
  return next
}

// 执行查询
function doQuery() {
  if (!queryForm.value.startPeriod || !queryForm.value.endPeriod) {
    ElMessage.warning('请选择查询账期范围')
    return
  }

  // 清空选中项
  selectedMissingItems.value = []

  // 获取当前要查询的模板ID（分组模式下根据Tab选择，独立模式下使用当前模板）
  const queryTemplateId = activeTemplateTab.value || templateId.value

  // 获取当前模板的分发记录
  const currentDistributions = distributions.value.filter(d => d.templateId === queryTemplateId)

  const periods = generatePeriods(
    queryForm.value.startPeriod,
    queryForm.value.endPeriod,
    currentTemplate.value.collectFrequency
  )

  // 构建填报统计数据
  fillStatusData.value = currentDistributions.map(dist => {
    const orgCode = dist.targetOrgCode
    const orgName = dist.targetOrgName

    const periodStatus = periods.map(period => {
      // 查找该单位在该账期的单据（使用当前选中的模板ID）
      const doc = mockDocuments.find(d =>
        d.templateId === queryTemplateId &&
        d.orgCode === orgCode &&
        d.accountPeriod === period
      )

      // 只有已归档状态才算填报成功
      const isCompleted = doc && doc.status === 'ARCHIVED'

      return {
        period,
        hasData: !!doc,
        isCompleted,
        docId: doc?.id,
        docNo: doc?.docNo,
        status: doc?.status,
        statusLabel: doc ? getStatusLabel(doc.status) : '缺失',
      }
    })

    const totalPeriods = periods.length
    const filledPeriods = periodStatus.filter(p => p.isCompleted).length
    const missingPeriods = totalPeriods - filledPeriods
    const fillRate = totalPeriods > 0 ? ((filledPeriods / totalPeriods) * 100).toFixed(1) : '0.0'

    return {
      orgCode,
      orgName,
      periodStatus,
      totalPeriods,
      filledPeriods,
      missingPeriods,
      fillRate,
    }
  })
}

// 获取单据状态标签
function getStatusLabel(status) {
  const labels = {
    DRAFT: '草稿',
    PENDING: '待审批',
    REJECTED: '已驳回',
    ARCHIVED: '已归档',
    UPLOADED: '已上传',
  }
  return labels[status] || status
}

// 重置查询
function resetQuery() {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  queryForm.value.startPeriod = formatPeriod(sixMonthsAgo, currentTemplate.value.collectFrequency)
  queryForm.value.endPeriod = formatPeriod(now, currentTemplate.value.collectFrequency)
  doQuery()
}

// 查看单据详情
function viewDocument(docId) {
  if (docId) {
    router.push(`/document/detail/${docId}`)
  }
}

// 切换缺失账期选中状态
function toggleMissingItem(orgCode, period) {
  const key = `${orgCode}|||${period}`
  const index = selectedMissingItems.value.indexOf(key)
  if (index > -1) {
    selectedMissingItems.value.splice(index, 1)
  } else {
    selectedMissingItems.value.push(key)
  }
}

// 判断是否选中
function isMissingItemSelected(orgCode, period) {
  return selectedMissingItems.value.includes(`${orgCode}|||${period}`)
}

// 批量生成督办单
const urgeDialogVisible = ref(false)
const urgeForm = ref({
  extendDeadline: '',
  selectedCount: 0,
  orgPeriodMap: {},
})

function batchCreateUrge() {
  if (selectedMissingItems.value.length === 0) {
    ElMessage.warning('请至少选择一个缺失账期')
    return
  }

  // 解析选中项，按单位分组统计
  const orgPeriodMap = {}
  selectedMissingItems.value.forEach(key => {
    const [orgCode, period] = key.split('|||')
    if (!orgPeriodMap[orgCode]) {
      const orgData = fillStatusData.value.find(d => d.orgCode === orgCode)
      orgPeriodMap[orgCode] = {
        orgName: orgData?.orgName || orgCode,
        periods: []
      }
    }
    orgPeriodMap[orgCode].periods.push(period)
  })

  // 打开对话框
  urgeForm.value = {
    extendDeadline: '',
    selectedCount: selectedMissingItems.value.length,
    orgPeriodMap: orgPeriodMap,
  }
  urgeDialogVisible.value = true
}

// 确认生成督办单
function confirmCreateUrge() {
  if (!urgeForm.value.extendDeadline) {
    ElMessage.warning('请选择延期截止日期')
    return
  }

  ElMessageBox.confirm(
    `确认为 ${Object.keys(urgeForm.value.orgPeriodMap).length} 个单位的 ${urgeForm.value.selectedCount} 个缺失账期生成督办单？延期截止日期为：${urgeForm.value.extendDeadline}`,
    '确认生成督办单',
    {
      type: 'warning',
      confirmButtonText: '确认生成',
    }
  ).then(() => {
    ElMessage.success(`已成功生成 ${urgeForm.value.selectedCount} 个督办单，推送至相关单位管理员`)
    selectedMissingItems.value = []
    urgeDialogVisible.value = false
  }).catch(() => {})
}


// 返回模板列表
function goBack() {
  router.push('/template/list')
}

// 账期输入组件的类型
const periodInputType = computed(() => {
  switch (currentTemplate.value?.collectFrequency) {
    case 'YEAR':
      return 'year'
    case 'MONTH':
      return 'month'
    case 'DAY':
      return 'date'
    default:
      return 'month'
  }
})

// ==================== 模板Tab切换 ====================
function handleTemplateTabChange(templateId) {
  activeTemplateTab.value = templateId
  doQuery()
}
</script>

<template>
  <div v-if="currentTemplate">
    <div class="page-header">
      <div>
        <div class="page-title">
          <el-button link :icon="'ArrowLeft'" @click="goBack" style="margin-right:8px" />
          填报情况监控
          <el-tag v-if="pageMode === 'group'" type="primary" size="small" style="margin-left:8px">分组</el-tag>
        </div>
        <div v-if="pageMode === 'group'" class="page-desc">
          {{ currentGroup.groupName }} · 包含 {{ groupTemplates.length }} 个模板：
          <span v-for="(tpl, idx) in groupTemplates" :key="tpl.id" style="margin-left:4px">
            {{ tpl.templateName }}<span v-if="idx < groupTemplates.length - 1">、</span>
          </span>
        </div>
        <div v-else class="page-desc">{{ currentTemplate.templateName }} · {{ currentTemplate.templateCode }}</div>
      </div>
      <div style="display:flex;gap:8px">
        <el-button v-if="selectedMissingItems.length > 0" type="danger" :icon="'Bell'" @click="batchCreateUrge">
          生成督办单（{{ selectedMissingItems.length }}）
        </el-button>
      </div>
    </div>

    <!-- 分组提示信息 -->
    <el-alert v-if="pageMode === 'group'" type="info" :closable="false" style="margin-bottom:16px">
      <template #title>
        <span style="font-size:13px">
          该模板属于分组「{{ currentGroup.groupName }}」，展示同组所有模板的填报情况
        </span>
      </template>
    </el-alert>

    <!-- 查询条件 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header>
        <span style="font-weight:600">查询条件</span>
      </template>
      <el-form :model="queryForm" inline>
        <el-form-item label="账期范围">
          <el-date-picker
            v-if="currentTemplate.collectFrequency === 'YEAR'"
            v-model="queryForm.startPeriod"
            type="year"
            placeholder="开始年份"
            value-format="YYYY"
            style="width:140px"
          />
          <el-date-picker
            v-else-if="currentTemplate.collectFrequency === 'MONTH' || currentTemplate.collectFrequency === 'QUARTER' || currentTemplate.collectFrequency === 'HALF_YEAR'"
            v-model="queryForm.startPeriod"
            type="month"
            placeholder="开始月份"
            value-format="YYYY-MM"
            style="width:150px"
          />
          <el-date-picker
            v-else-if="currentTemplate.collectFrequency === 'DAY'"
            v-model="queryForm.startPeriod"
            type="date"
            placeholder="开始日期"
            value-format="YYYY-MM-DD"
            style="width:150px"
          />
          <el-input
            v-else
            v-model="queryForm.startPeriod"
            placeholder="开始账期"
            style="width:150px"
          />
          <span style="margin:0 8px">至</span>
          <el-date-picker
            v-if="currentTemplate.collectFrequency === 'YEAR'"
            v-model="queryForm.endPeriod"
            type="year"
            placeholder="结束年份"
            value-format="YYYY"
            style="width:140px"
          />
          <el-date-picker
            v-else-if="currentTemplate.collectFrequency === 'MONTH' || currentTemplate.collectFrequency === 'QUARTER' || currentTemplate.collectFrequency === 'HALF_YEAR'"
            v-model="queryForm.endPeriod"
            type="month"
            placeholder="结束月份"
            value-format="YYYY-MM"
            style="width:150px"
          />
          <el-date-picker
            v-else-if="currentTemplate.collectFrequency === 'DAY'"
            v-model="queryForm.endPeriod"
            type="date"
            placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width:150px"
          />
          <el-input
            v-else
            v-model="queryForm.endPeriod"
            placeholder="结束账期"
            style="width:150px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="'Search'" @click="doQuery">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
      <div style="font-size:13px;color:#666;margin-top:8px">
        <el-icon><InfoFilled /></el-icon>
        填报周期：{{ COLLECT_FREQUENCIES.find(f => f.value === currentTemplate.collectFrequency)?.label }} |
        已下发单位：{{ distributions.length }} 个
      </div>
    </el-card>

    <!-- 填报统计汇总 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size:14px;color:#666;margin-bottom:8px">总账期数</div>
          <div style="font-size:28px;font-weight:600;color:#333">
            {{ fillStatusData[0]?.totalPeriods || 0 }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size:14px;color:#666;margin-bottom:8px">平均完成率</div>
          <div style="font-size:28px;font-weight:600;color:#1677ff">
            {{ fillStatusData.length > 0 ? (fillStatusData.reduce((sum, d) => sum + parseFloat(d.fillRate), 0) / fillStatusData.length).toFixed(1) : '0.0' }}%
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size:14px;color:#666;margin-bottom:8px">完成单位数</div>
          <div style="font-size:28px;font-weight:600;color:#67c23a">
            {{ fillStatusData.filter(d => parseFloat(d.fillRate) === 100).length }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size:14px;color:#666;margin-bottom:8px">缺失账期总数</div>
          <div style="font-size:28px;font-weight:600;color:#f56c6c">
            {{ fillStatusData.reduce((sum, d) => sum + d.missingPeriods, 0) }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 填报明细表格 -->
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600">各单位填报明细</span>
          <!-- 分组模式下显示模板Tab切换 -->
          <el-radio-group v-if="pageMode === 'group'" v-model="activeTemplateTab" @change="handleTemplateTabChange" size="small">
            <el-radio-button v-for="tpl in groupTemplates" :key="tpl.id" :label="tpl.id">
              {{ tpl.templateName }}
            </el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-table :data="fillStatusData" style="width:100%" stripe border>
        <el-table-column prop="orgName" label="单位" width="140" fixed="left" />
        <el-table-column label="填报完成率" width="100" align="center" fixed="left">
          <template #default="{ row }">
            <div style="font-size:18px;font-weight:600" :style="{ color: parseFloat(row.fillRate) === 100 ? '#67c23a' : (parseFloat(row.fillRate) >= 80 ? '#1677ff' : '#f56c6c') }">
              {{ row.fillRate }}%
            </div>
            <div style="font-size:12px;color:#666;margin-top:4px">
              {{ row.filledPeriods }}/{{ row.totalPeriods }}
            </div>
          </template>
        </el-table-column>
        <el-table-column
          v-for="(ps, idx) in fillStatusData[0]?.periodStatus || []"
          :key="idx"
          :label="ps.period"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <div v-if="row.periodStatus[idx].isCompleted" style="cursor:pointer" @click="viewDocument(row.periodStatus[idx].docId)">
              <el-icon style="color:#67c23a;font-size:18px"><CircleCheck /></el-icon>
              <div style="font-size:11px;color:#67c23a;margin-top:2px">已归档</div>
            </div>
            <div v-else-if="row.periodStatus[idx].hasData" style="cursor:pointer" @click="viewDocument(row.periodStatus[idx].docId)">
              <el-icon style="color:#fa8c16;font-size:18px"><Clock /></el-icon>
              <div style="font-size:11px;color:#fa8c16;margin-top:2px">{{ row.periodStatus[idx].statusLabel }}</div>
            </div>
            <div v-else style="cursor:pointer;padding:4px" @click="toggleMissingItem(row.orgCode, ps.period)">
              <div
                :style="{
                  border: isMissingItemSelected(row.orgCode, ps.period) ? '2px solid #1677ff' : '2px solid transparent',
                  borderRadius: '4px',
                  padding: '2px',
                  background: isMissingItemSelected(row.orgCode, ps.period) ? '#e6f4ff' : 'transparent'
                }"
              >
                <el-icon style="color:#f56c6c;font-size:18px"><CircleClose /></el-icon>
                <div style="font-size:11px;color:#f56c6c;margin-top:2px">缺失</div>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 生成督办单对话框 -->
    <el-dialog v-model="urgeDialogVisible" title="生成督办单" width="600px">
      <div style="margin-bottom:20px">
        <div style="font-size:14px;color:#666;margin-bottom:12px">
          将为 <strong style="color:#1677ff">{{ Object.keys(urgeForm.orgPeriodMap).length }}</strong> 个单位的
          <strong style="color:#f56c6c">{{ urgeForm.selectedCount }}</strong> 个缺失账期生成督办单
        </div>
        <div style="max-height:200px;overflow-y:auto;background:#f5f5f5;padding:12px;border-radius:4px">
          <div v-for="(data, orgCode) in urgeForm.orgPeriodMap" :key="orgCode" style="margin-bottom:8px">
            <div style="font-weight:600;color:#333">{{ data.orgName }}</div>
            <div style="color:#666;font-size:13px;padding-left:16px">缺失账期：{{ data.periods.join('、') }}</div>
          </div>
        </div>
      </div>

      <el-form :model="urgeForm" label-width="120px">
        <el-form-item label="延期截止日期" required>
          <el-date-picker
            v-model="urgeForm.extendDeadline"
            type="date"
            placeholder="选择延期截止日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width:220px"
          />
        </el-form-item>
        <el-form-item label="">
          <div style="font-size:12px;color:#999;line-height:1.5">
            督办单生成后，相关单位需在此日期前完成数据补录
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="urgeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmCreateUrge">确认生成</el-button>
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
  display: flex;
  align-items: center;
}
.page-desc {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}
</style>
