<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])
import { useUserStore } from '../../stores/user.js'
import { mockDocuments, DOC_STATUS } from '../../mock/document.js'

const router = useRouter()
const userStore = useUserStore()

// 计算默认时间范围（近1年）
function getDefaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setFullYear(start.getFullYear() - 1)
  return [
    start.toISOString().split('T')[0],
    end.toISOString().split('T')[0]
  ]
}

// 筛选条件
const filterForm = ref({ bizDomain: '', orgCode: '', period: '', dateRange: getDefaultDateRange() })
const activeFilter = ref({ ...filterForm.value })
function doSearch() { activeFilter.value = { ...filterForm.value } }
function resetFilter() {
  filterForm.value = { bizDomain: '', orgCode: '', period: '', dateRange: getDefaultDateRange() }
  activeFilter.value = { ...filterForm.value }
}

// Mock 统计数据
const orgStats = ref([
  { orgCode: 'UNIT_CA', orgName: '长安乘用车',   totalRequired: 20, archived: 16, onTime: 14, firstPass: 13, bizDomain: 'FINANCE' },
  { orgCode: 'UNIT_CS', orgName: '长安商用车',   totalRequired: 15, archived: 10, onTime: 8,  firstPass: 9,  bizDomain: 'FINANCE' },
  { orgCode: 'UNIT_KS', orgName: '长安跨越',     totalRequired: 12, archived: 8,  onTime: 7,  firstPass: 7,  bizDomain: 'FINANCE' },
  { orgCode: 'UNIT_EV', orgName: '阿维塔科技',   totalRequired: 10, archived: 10, onTime: 10, firstPass: 9,  bizDomain: 'FINANCE' },
  { orgCode: 'UNIT_CA', orgName: '长安乘用车',   totalRequired: 8,  archived: 6,  onTime: 5,  firstPass: 5,  bizDomain: 'PRODUCTION' },
  { orgCode: 'UNIT_CS', orgName: '长安商用车',   totalRequired: 6,  archived: 3,  onTime: 2,  firstPass: 3,  bizDomain: 'PRODUCTION' },
  { orgCode: 'UNIT_EV', orgName: '阿维塔科技',   totalRequired: 6,  archived: 6,  onTime: 6,  firstPass: 5,  bizDomain: 'PRODUCTION' },
])

const bizDomainStats = ref([
  { bizDomain: 'FINANCE',    bizDomainLabel: '财务域',   totalRequired: 57, archived: 44, onTime: 39, firstPass: 38 },
  { bizDomain: 'PRODUCTION', bizDomainLabel: '生产域',   totalRequired: 20, archived: 15, onTime: 13, firstPass: 13 },
  { bizDomain: 'SALES',      bizDomainLabel: '销售域',   totalRequired: 10, archived: 6,  onTime: 5,  firstPass: 5  },
  { bizDomain: 'SUPPLY',     bizDomainLabel: '供应链域', totalRequired: 8,  archived: 2,  onTime: 1,  firstPass: 2  },
])

// 全局汇总
const globalStat = computed(() => {
  const total     = bizDomainStats.value.reduce((s, r) => s + r.totalRequired, 0)
  const archived  = bizDomainStats.value.reduce((s, r) => s + r.archived, 0)
  const onTime    = bizDomainStats.value.reduce((s, r) => s + r.onTime, 0)
  const firstPass = bizDomainStats.value.reduce((s, r) => s + r.firstPass, 0)
  return {
    totalRequired:  total,
    archived,
    onTime,
    firstPass,
    completeRate: total ? Math.round(archived  / total * 100) : 0,
    onTimeRate:   total ? Math.round(onTime    / total * 100) : 0,
    qualityRate:  archived ? Math.round(firstPass / archived * 100) : 0,
  }
})

// 按企业过滤后的数据
const filteredOrgStats = computed(() => {
  let list = orgStats.value
  // 二级单位只能看自己单位的数据
  if (userStore.isUnitAdmin) {
    list = list.filter(r => r.orgCode === userStore.currentRole.orgCode)
  }
  if (activeFilter.value.bizDomain) list = list.filter(r => r.bizDomain === activeFilter.value.bizDomain)
  if (activeFilter.value.orgCode)   list = list.filter(r => r.orgCode  === activeFilter.value.orgCode)
  // 合并同一单位
  const map = {}
  list.forEach(r => {
    if (!map[r.orgCode]) map[r.orgCode] = { orgCode: r.orgCode, orgName: r.orgName, totalRequired: 0, archived: 0, onTime: 0, firstPass: 0 }
    map[r.orgCode].totalRequired += r.totalRequired
    map[r.orgCode].archived      += r.archived
    map[r.orgCode].onTime        += r.onTime
    map[r.orgCode].firstPass     += r.firstPass
  })
  return Object.values(map).map(r => ({
    ...r,
    completeRate: r.totalRequired ? Math.round(r.archived  / r.totalRequired * 100) : 0,
    onTimeRate:   r.totalRequired ? Math.round(r.onTime    / r.totalRequired * 100) : 0,
    qualityRate:  r.archived      ? Math.round(r.firstPass / r.archived      * 100) : 0,
  })).sort((a, b) => b.completeRate - a.completeRate)
})

const filteredBizStats = computed(() => {
  return bizDomainStats.value
    .filter(r => !activeFilter.value.bizDomain || r.bizDomain === activeFilter.value.bizDomain)
    .map(r => ({
      ...r,
      completeRate: r.totalRequired ? Math.round(r.archived  / r.totalRequired * 100) : 0,
      onTimeRate:   r.totalRequired ? Math.round(r.onTime    / r.totalRequired * 100) : 0,
      qualityRate:  r.archived      ? Math.round(r.firstPass / r.archived      * 100) : 0,
    }))
})

// Tab 选中的业务域
const selectedBizDomain = ref('')

// 初始化时设置默认选中第一个业务域
onMounted(() => {
  if (filteredBizStats.value.length > 0) {
    selectedBizDomain.value = filteredBizStats.value[0].bizDomain
  }
  nextTick(() => {
    if (pieChartRef.value) {
      pieChart = echarts.init(pieChartRef.value)
      pieChart.setOption(buildPieOption())
    }
  })
})

// 单据状态分布（基于 mock 单据数据，集团管理员看全量，单位管理员看本单位）
const docStats = computed(() => {
  let list = mockDocuments
  if (userStore.isUnitAdmin) list = list.filter(d => d.orgCode === userStore.currentRole.orgCode)
  const statusMap = {}
  list.forEach(d => { statusMap[d.status] = (statusMap[d.status] || 0) + 1 })
  return statusMap
})

// 状态分布辅助
const statusItems = {
  DRAFT:    { label: '草稿',   color: '#8c8c8c' },
  PENDING:  { label: '审核中', color: '#1677ff' },
  APPROVED: { label: '已通过', color: '#52c41a' },
  REJECTED: { label: '已驳回', color: '#ff4d4f' },
  ARCHIVED: { label: '已归档', color: '#13c2c2' },
  AMENDED:  { label: '已更正', color: '#fa8c16' },
}

const totalDocCount = computed(() => Object.values(docStats.value).reduce((s, v) => s + v, 0))

const overdueList = computed(() => {
  let list = mockDocuments
  if (userStore.isUnitAdmin) list = list.filter(d => d.orgCode === userStore.currentRole.orgCode)
  return list.filter(d =>
    ['DRAFT', 'PENDING'].includes(d.status) &&
    d.deadlineDate &&
    new Date(d.deadlineDate) < new Date()
  )
})
function rateColor(rate) {
  if (rate >= 90) return '#52c41a'
  if (rate >= 70) return '#1677ff'
  if (rate >= 50) return '#fa8c16'
  return '#ff4d4f'
}

function rateStatus(rate) {
  if (rate >= 90) return 'success'
  if (rate >= 70) return 'primary'
  if (rate >= 50) return 'warning'
  return 'exception'
}

// 单位列表（筛选用）
const orgOptions = [
  { value: 'UNIT_CA', label: '长安乘用车' },
  { value: 'UNIT_CS', label: '长安商用车' },
  { value: 'UNIT_KS', label: '长安跨越' },
  { value: 'UNIT_EV', label: '阿维塔科技' },
]

// 饼图
const pieChartRef = ref(null)
let pieChart = null

function buildPieOption() {
  const data = Object.entries(statusItems)
    .map(([key, item]) => ({
      name: item.label,
      value: docStats.value[key] || 0,
      itemStyle: { color: item.color },
    }))
    .filter(d => d.value > 0)
  const total = data.reduce((s, d) => s + d.value, 0)
  return {
    title: {
      text: `{count|${total}}\n{label|总单据数}`,
      left: 'center',
      top: 'center',
      textStyle: {
        rich: {
          count: {
            fontSize: 32,
            fontWeight: 'bold',
            color: '#1a1a1a',
            lineHeight: 40,
          },
          label: {
            fontSize: 14,
            color: '#888',
            lineHeight: 24,
          },
        },
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 张 ({d}%)',
    },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      label: {
        show: true,
        fontSize: 12,
        formatter: '{b}\n{c} 张',
        lineHeight: 18,
      },
      labelLine: {
        show: true,
        length: 10,
        length2: 14,
        smooth: true,
      },
      emphasis: {
        label: { fontSize: 13, fontWeight: 'bold' },
      },
      data,
    }],
  }
}

onMounted(() => {
  // 初始化默认选中第一个业务域
  if (filteredBizStats.value.length > 0) {
    selectedBizDomain.value = filteredBizStats.value[0].bizDomain
  }
  // 初始化饼图
  nextTick(() => {
    if (pieChartRef.value) {
      pieChart = echarts.init(pieChartRef.value)
      pieChart.setOption(buildPieOption())
    }
  })
})

watch(docStats, () => {
  if (pieChart) pieChart.setOption(buildPieOption())
}, { deep: true })
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">补录质量看板</div>
        <div class="page-desc">全局补录完成率、及时率、数据合格率统计</div>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filterForm" inline>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width:260px"
          />
        </el-form-item>
        <el-form-item label="业务域">
          <el-select v-model="filterForm.bizDomain" placeholder="全部" clearable style="width:120px">
            <el-option label="财务域"   value="FINANCE" />
            <el-option label="生产域"   value="PRODUCTION" />
            <el-option label="销售域"   value="SALES" />
            <el-option label="供应链域" value="SUPPLY" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="userStore.isGroupAdmin" label="单位">
          <el-select v-model="filterForm.orgCode" placeholder="全部" clearable style="width:140px">
            <el-option v-for="o in orgOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="'Search'" @click="doSearch">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 全局核心指标卡片 -->
    <el-row :gutter="16" style="margin-bottom:16px" class="kpi-row">
      <el-col :span="6" class="kpi-col">
        <div class="kpi-card">
          <div class="kpi-icon" style="background:#e6f4ff">
            <el-icon style="color:#1677ff;font-size:22px"><Document /></el-icon>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ globalStat.archived }} / {{ globalStat.totalRequired }}</div>
            <div class="kpi-label">已归档 / 应补录总数</div>
            <div class="kpi-sub">截至今日统计</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6" class="kpi-col">
        <div class="kpi-card">
          <div class="kpi-icon" :style="{ background: globalStat.completeRate >= 80 ? '#f6ffed' : '#fff7e6' }">
            <el-icon :style="{ color: rateColor(globalStat.completeRate), fontSize: '22px' }"><CircleCheck /></el-icon>
          </div>
          <div class="kpi-content">
            <div class="kpi-value" :style="{ color: rateColor(globalStat.completeRate) }">{{ globalStat.completeRate }}%</div>
            <div class="kpi-label">补录完成率</div>
            <div class="kpi-sub">已归档 / 应补录总数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6" class="kpi-col">
        <div class="kpi-card">
          <div class="kpi-icon" :style="{ background: globalStat.onTimeRate >= 80 ? '#f6ffed' : '#fff7e6' }">
            <el-icon :style="{ color: rateColor(globalStat.onTimeRate), fontSize: '22px' }"><Timer /></el-icon>
          </div>
          <div class="kpi-content">
            <div class="kpi-value" :style="{ color: rateColor(globalStat.onTimeRate) }">{{ globalStat.onTimeRate }}%</div>
            <div class="kpi-label">及时率</div>
            <div class="kpi-sub">截止日前归档 / 应补录总数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6" class="kpi-col">
        <div class="kpi-card">
          <div class="kpi-icon" :style="{ background: globalStat.qualityRate >= 80 ? '#f6ffed' : '#fff7e6' }">
            <el-icon :style="{ color: rateColor(globalStat.qualityRate), fontSize: '22px' }"><Medal /></el-icon>
          </div>
          <div class="kpi-content">
            <div class="kpi-value" :style="{ color: rateColor(globalStat.qualityRate) }">{{ globalStat.qualityRate }}%</div>
            <div class="kpi-label">数据合格率</div>
            <div class="kpi-sub">一次性通过 / 已归档总数</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom:16px" class="stretch-row">
      <!-- 按企业统计 -->
      <el-col :span="14" class="stretch-col">
        <el-card shadow="never" class="stretch-card">
          <template #header>
            <span style="font-weight:600">按企业统计</span>
          </template>
          <el-table :data="filteredOrgStats" style="width:100%" size="small" stripe>
            <el-table-column prop="orgName" label="单位" width="130" />
            <el-table-column label="完成率" min-width="140">
              <template #default="{ row }">
                <div class="rate-cell">
                  <el-progress
                    :percentage="row.completeRate"
                    :status="rateStatus(row.completeRate)"
                    :stroke-width="8"
                    style="flex:1"
                  />
                  <span class="rate-num" :style="{ color: rateColor(row.completeRate) }">{{ row.completeRate }}%</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="及时率" min-width="140">
              <template #default="{ row }">
                <div class="rate-cell">
                  <el-progress
                    :percentage="row.onTimeRate"
                    :status="rateStatus(row.onTimeRate)"
                    :stroke-width="8"
                    style="flex:1"
                  />
                  <span class="rate-num" :style="{ color: rateColor(row.onTimeRate) }">{{ row.onTimeRate }}%</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="合格率" min-width="140">
              <template #default="{ row }">
                <div class="rate-cell">
                  <el-progress
                    :percentage="row.qualityRate"
                    :status="rateStatus(row.qualityRate)"
                    :stroke-width="8"
                    style="flex:1"
                  />
                  <span class="rate-num" :style="{ color: rateColor(row.qualityRate) }">{{ row.qualityRate }}%</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="已归档/应补录" width="110" align="center">
              <template #default="{ row }">
                <span style="font-size:12px">{{ row.archived }} / {{ row.totalRequired }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 按业务域统计 -->
      <el-col :span="10" class="stretch-col">
        <el-card shadow="never" class="stretch-card biz-card">
          <el-tabs v-model="selectedBizDomain" type="card" class="biz-tabs">
            <el-tab-pane
              v-for="row in filteredBizStats"
              :key="row.bizDomain"
              :label="row.bizDomainLabel"
              :name="row.bizDomain"
            >
              <div class="biz-stat-content">
                <div class="biz-stat-summary">
                  <div class="biz-summary-card">
                    <div class="biz-summary-label">应补录</div>
                    <div class="biz-summary-value">{{ row.totalRequired }}</div>
                  </div>
                  <div class="biz-summary-card primary">
                    <div class="biz-summary-label">已归档</div>
                    <div class="biz-summary-value">{{ row.archived }}</div>
                  </div>
                </div>
                <div class="biz-stat-bars">
                  <div class="biz-bar-row">
                    <span class="biz-bar-label">完成率</span>
                    <el-progress :percentage="row.completeRate" :status="rateStatus(row.completeRate)" :stroke-width="8" style="flex:1" />
                    <span class="biz-bar-val" :style="{ color: rateColor(row.completeRate) }">{{ row.completeRate }}%</span>
                  </div>
                  <div class="biz-bar-row">
                    <span class="biz-bar-label">及时率</span>
                    <el-progress :percentage="row.onTimeRate" :status="rateStatus(row.onTimeRate)" :stroke-width="8" style="flex:1" />
                    <span class="biz-bar-val" :style="{ color: rateColor(row.onTimeRate) }">{{ row.onTimeRate }}%</span>
                  </div>
                  <div class="biz-bar-row">
                    <span class="biz-bar-label">合格率</span>
                    <el-progress :percentage="row.qualityRate" :status="rateStatus(row.qualityRate)" :stroke-width="8" style="flex:1" />
                    <span class="biz-bar-val" :style="{ color: rateColor(row.qualityRate) }">{{ row.qualityRate }}%</span>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>

    <!-- 单据状态分布 + 近期单据明细 -->
    <el-row :gutter="16" class="stretch-row">
      <!-- 状态分布 -->
      <el-col :span="8" class="stretch-col">
        <el-card shadow="never" class="stretch-card">
          <template #header><span style="font-weight:600">单据状态分布</span></template>
          <div ref="pieChartRef" class="pie-chart" />
        </el-card>
      </el-col>

      <!-- 逾期未完成 -->
      <el-col :span="16" class="stretch-col">
        <el-card shadow="never" class="stretch-card">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:600">逾期未完成单据</span>
              <el-tag type="danger" size="small">需关注</el-tag>
            </div>
          </template>
          <el-table :data="overdueList" style="width:100%" size="small">
            <el-table-column label="单据编号" width="180">
              <template #default="{ row }">
                <el-link type="primary" :underline="false" @click="router.push(`/document/detail/${row.id}`)">
                  {{ row.docNo }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column prop="orgName"      label="所属单位"  width="120" />
            <el-table-column prop="templateName" label="模板"      min-width="140" show-overflow-tooltip />
            <el-table-column prop="deadlineDate" label="截止日期"  width="110">
              <template #default="{ row }">
                <span style="color:#ff4d4f">{{ row.deadlineDate }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="DOC_STATUS[row.status].type" size="small">{{ DOC_STATUS[row.status].label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="currentHandler" label="当前处理人" width="100" />
            <el-table-column prop="createBy" label="填报人" width="80" />
            <template #empty>
              <el-empty description="暂无逾期单据" :image-size="60" />
            </template>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { mockDocuments } from '../../mock/document.js'
import { useUserStore } from '../../stores/user.js'
import { computed } from 'vue'

const STATUS_ITEMS = {
  DRAFT:    { label: '草稿',   color: '#8c8c8c' },
  PENDING:  { label: '审核中', color: '#1677ff' },
  APPROVED: { label: '已通过', color: '#52c41a' },
  REJECTED: { label: '已驳回', color: '#ff4d4f' },
  ARCHIVED: { label: '已归档', color: '#13c2c2' },
  AMENDED:  { label: '已更正', color: '#fa8c16' },
}
</script>

<style scoped>
/* 等高行列通用类 */
.kpi-row   { align-items: stretch; }
.kpi-col   { display: flex; flex-direction: column; }
.stretch-row { align-items: stretch; }
.stretch-col { display: flex; flex-direction: column; }
.stretch-card { flex: 1; display: flex; flex-direction: column; }
:deep(.stretch-card .el-card__body) { flex: 1; }

/* KPI 卡片 */
.kpi-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.kpi-icon {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kpi-content { flex: 1; min-width: 0; }
.kpi-value { font-size: 26px; font-weight: 700; color: #1a1a1a; line-height: 1.2; }
.kpi-label { font-size: 13px; color: #666; margin-top: 4px; }
.kpi-sub   { font-size: 11px; color: #aaa; margin-top: 2px; }

/* 进度条单元格 */
.rate-cell { display: flex; align-items: center; gap: 8px; }
.rate-num  { font-size: 12px; font-weight: 600; width: 36px; text-align: right; flex-shrink: 0; }

/* 业务域统计 Tab */
.biz-card :deep(.el-card__body) { padding: 0; }
.biz-tabs :deep(.el-tabs__header) { margin: 0; }
.biz-tabs :deep(.el-tabs__content) { padding: 16px 20px; }

.biz-stat-content { display: flex; flex-direction: column; gap: 16px; }
.biz-stat-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.biz-summary-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  border: 2px solid #e8e8e8;
  transition: all 0.3s;
}
.biz-summary-card:hover {
  border-color: #d9d9d9;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.biz-summary-card.primary {
  background: linear-gradient(135deg, #e6f4ff 0%, #f0f8ff 100%);
  border-color: #91caff;
}
.biz-summary-card.primary:hover {
  border-color: #69b1ff;
}
.biz-summary-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
  margin-bottom: 8px;
}
.biz-summary-card.primary .biz-summary-label {
  color: #0958d9;
}
.biz-summary-value {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
}
.biz-summary-card.primary .biz-summary-value {
  color: #1677ff;
}
.biz-stat-bars { display: flex; flex-direction: column; gap: 10px; }
.biz-bar-row { display: flex; align-items: center; gap: 8px; }
.biz-bar-label { font-size: 12px; color: #888; width: 36px; flex-shrink: 0; }
.biz-bar-val { font-size: 12px; font-weight: 600; width: 36px; text-align: right; flex-shrink: 0; }

/* 饼图 */
.pie-chart { width: 100%; height: 300px; }
</style>
