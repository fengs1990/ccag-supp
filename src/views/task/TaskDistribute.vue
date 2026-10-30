<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { mockTemplates } from '../../mock/template.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

// 扫描配置
const scanConfig = ref({
  templateId: null,
  orgCodes: [],
  yearRange: [2024, 2026],
  scanTypes: ['MISSING_INDICATOR', 'MISSING_PERIOD', 'EMPTY_DIMENSION'],
})

// 扫描类型
const SCAN_TYPES = [
  { value: 'MISSING_INDICATOR', label: '缺指标' },
  { value: 'MISSING_PERIOD', label: '断月份' },
  { value: 'EMPTY_DIMENSION', label: '空维度' },
]

// 组织列表
const ORG_LIST = [
  { code: 'UNIT_CA', name: '长安乘用车' },
  { code: 'UNIT_CS', name: '长安商用车' },
  { code: 'UNIT_KS', name: '长安跨越' },
  { code: 'UNIT_EV', name: '阿维塔科技' },
]

// 可用模板（已发布）
const availableTemplates = computed(() => mockTemplates.filter(t => t.status === 1))

// 扫描状态
const scanning = ref(false)
const scanResult = ref([])
const selectedTasks = ref([])

// Mock扫描结果
const mockScanResult = [
  {
    id: 1,
    orgCode: 'UNIT_CA',
    orgName: '长安乘用车',
    templateId: 1,
    templateName: '财务数据补录模板',
    issueType: 'MISSING_PERIOD',
    issueTypeLabel: '断月份',
    issueDesc: '2024年1月、2024年3月、2024年5月数据缺失',
    missingPeriods: ['2024-01', '2024-03', '2024-05'],
    priority: 'HIGH',
    dataCount: 3,
    createTime: '2026-10-18 10:00:00',
  },
  {
    id: 2,
    orgCode: 'UNIT_CA',
    orgName: '长安乘用车',
    templateId: 1,
    templateName: '财务数据补录模板',
    issueType: 'MISSING_INDICATOR',
    issueTypeLabel: '缺指标',
    issueDesc: '2025年全年缺失"研发费用"指标数据',
    missingPeriods: ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'],
    priority: 'HIGH',
    dataCount: 12,
    createTime: '2026-10-18 10:00:00',
  },
  {
    id: 3,
    orgCode: 'UNIT_CS',
    orgName: '长安商用车',
    templateId: 2,
    templateName: '生产月度产量补录模板',
    issueType: 'EMPTY_DIMENSION',
    issueTypeLabel: '空维度',
    issueDesc: '2026年1-6月部分车型缺失"工厂编码"维度',
    missingPeriods: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'],
    priority: 'MEDIUM',
    dataCount: 6,
    createTime: '2026-10-18 10:00:00',
  },
  {
    id: 4,
    orgCode: 'UNIT_KS',
    orgName: '长安跨越',
    templateId: 1,
    templateName: '财务数据补录模板',
    issueType: 'MISSING_PERIOD',
    issueTypeLabel: '断月份',
    issueDesc: '2025年8月、9月、10月数据缺失',
    missingPeriods: ['2025-08', '2025-09', '2025-10'],
    priority: 'MEDIUM',
    dataCount: 3,
    createTime: '2026-10-18 10:00:00',
  },
  {
    id: 5,
    orgCode: 'UNIT_EV',
    orgName: '阿维塔科技',
    templateId: 2,
    templateName: '生产月度产量补录模板',
    issueType: 'MISSING_INDICATOR',
    issueTypeLabel: '缺指标',
    issueDesc: '2026年1-9月缺失"实际产量"指标',
    missingPeriods: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'],
    priority: 'HIGH',
    dataCount: 9,
    createTime: '2026-10-18 10:00:00',
  },
]

// 优先级配置
const PRIORITY_CONFIG = {
  HIGH: { label: '高', type: 'danger', color: '#ff4d4f' },
  MEDIUM: { label: '中', type: 'warning', color: '#fa8c16' },
  LOW: { label: '低', type: 'info', color: '#8c8c8c' },
}

// 执行扫描
function doScan() {
  if (!scanConfig.value.templateId) {
    ElMessage.warning('请选择补录模板')
    return
  }
  if (!scanConfig.value.orgCodes.length) {
    ElMessage.warning('请选择扫描单位')
    return
  }
  if (!scanConfig.value.scanTypes.length) {
    ElMessage.warning('请至少选择一种扫描类型')
    return
  }

  scanning.value = true

  // 模拟扫描
  setTimeout(() => {
    scanning.value = false
    // 根据筛选条件过滤mock数据
    scanResult.value = mockScanResult.filter(item => {
      const matchTemplate = item.templateId === scanConfig.value.templateId
      const matchOrg = scanConfig.value.orgCodes.includes(item.orgCode)
      const matchType = scanConfig.value.scanTypes.includes(item.issueType)
      return matchTemplate && matchOrg && matchType
    })
    ElMessage.success(`扫描完成，发现 ${scanResult.value.length} 个数据缺口`)
  }, 2000)
}

// 重置扫描
function resetScan() {
  scanConfig.value = {
    templateId: null,
    orgCodes: [],
    yearRange: [2024, 2026],
    scanTypes: ['MISSING_INDICATOR', 'MISSING_PERIOD', 'EMPTY_DIMENSION'],
  }
  scanResult.value = []
  selectedTasks.value = []
}

// 批量下发
function batchDistribute() {
  if (!selectedTasks.value.length) {
    ElMessage.warning('请至少选择一个补录任务')
    return
  }

  const taskCount = selectedTasks.value.length
  const orgSet = new Set(selectedTasks.value.map(id => {
    const task = scanResult.value.find(t => t.id === id)
    return task?.orgName
  }))

  ElMessageBox.confirm(
    `确认下发 ${taskCount} 个补录任务至 ${orgSet.size} 个单位？下发后各单位将收到站内消息通知，并可在单据管理中查看待补录任务。`,
    '批量下发补录任务',
    {
      type: 'warning',
      confirmButtonText: '确认下发',
    }
  ).then(() => {
    ElMessage.success(`已成功下发 ${taskCount} 个补录任务`)
    // 移除已下发的任务
    scanResult.value = scanResult.value.filter(item => !selectedTasks.value.includes(item.id))
    selectedTasks.value = []
  }).catch(() => {})
}

// 单个下发
function distributeOne(task) {
  ElMessageBox.confirm(
    `确认下发补录任务至「${task.orgName}」？`,
    '下发补录任务',
    {
      type: 'warning',
      confirmButtonText: '确认下发',
    }
  ).then(() => {
    ElMessage.success('补录任务已下发')
    scanResult.value = scanResult.value.filter(item => item.id !== task.id)
    selectedTasks.value = selectedTasks.value.filter(id => id !== task.id)
  }).catch(() => {})
}

// 查看详情
function viewDetail(task) {
  ElMessageBox.alert(
    `<div style="line-height:1.8">
      <div><strong>单位：</strong>${task.orgName}</div>
      <div><strong>模板：</strong>${task.templateName}</div>
      <div><strong>问题类型：</strong>${task.issueTypeLabel}</div>
      <div><strong>问题描述：</strong>${task.issueDesc}</div>
      <div><strong>缺失账期：</strong>${task.missingPeriods.join('、')}</div>
      <div><strong>缺失数量：</strong>${task.dataCount} 个账期</div>
    </div>`,
    '缺口详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭',
    }
  )
}

// 设计问题弹窗
const designIssuesVisible = ref(false)
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">补录任务下发</div>
        <div class="page-desc">扫描全域数据缺口，批量下发补录任务</div>
      </div>
      <el-button :icon="'QuestionFilled'" @click="designIssuesVisible = true">设计问题</el-button>
    </div>

    <!-- 扫描配置 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header>
        <span style="font-weight:600">数据缺口扫描配置</span>
      </template>

      <el-form :model="scanConfig" label-width="110px">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="补录模板" required>
              <el-select v-model="scanConfig.templateId" placeholder="选择模板" style="width:100%">
                <el-option
                  v-for="t in availableTemplates"
                  :key="t.id"
                  :label="t.templateName"
                  :value="t.id"
                >
                  <span>{{ t.templateName }}</span>
                  <el-tag size="small" type="info" style="margin-left:8px">{{ t.bizDomainLabel }}</el-tag>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="扫描单位" required>
              <el-select v-model="scanConfig.orgCodes" placeholder="选择单位（可多选）" multiple style="width:100%">
                <el-option
                  v-for="org in ORG_LIST"
                  :key="org.code"
                  :label="org.name"
                  :value="org.code"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="年度范围">
              <el-slider
                v-model="scanConfig.yearRange"
                range
                :min="2020"
                :max="2026"
                :marks="{ 2020: '2020', 2023: '2023', 2026: '2026' }"
                style="width:calc(100% - 40px);margin-left:20px"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="扫描类型" required>
              <el-checkbox-group v-model="scanConfig.scanTypes">
                <el-checkbox v-for="type in SCAN_TYPES" :key="type.value" :value="type.value">
                  {{ type.label }}
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>
        <div style="text-align:center;margin-top:24px">
          <el-button type="primary" :icon="'Search'" :loading="scanning" size="large" @click="doScan">
            {{ scanning ? '扫描中...' : '开始扫描' }}
          </el-button>
          <el-button size="large" @click="resetScan">重置</el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 扫描结果 -->
    <el-card v-if="scanResult.length" shadow="never">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-weight:600">数据缺口清单</span>
            <el-tag type="info" size="small" style="margin-left:8px">共 {{ scanResult.length }} 个缺口</el-tag>
          </div>
          <el-button
            type="primary"
            :icon="'Promotion'"
            :disabled="!selectedTasks.length"
            @click="batchDistribute"
          >批量下发（{{ selectedTasks.length }}）</el-button>
        </div>
      </template>

      <el-table
        :data="scanResult"
        style="width:100%"
        stripe
        @selection-change="(val) => { selectedTasks = val.map(v => v.id) }"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="orgName" label="单位" width="120" />
        <el-table-column prop="templateName" label="模板" min-width="150" show-overflow-tooltip />
        <el-table-column label="问题类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="warning">{{ row.issueTypeLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="PRIORITY_CONFIG[row.priority].type" size="small">
              {{ PRIORITY_CONFIG[row.priority].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="issueDesc" label="问题描述" min-width="280" show-overflow-tooltip />
        <el-table-column label="缺失账期" width="120" align="center">
          <template #default="{ row }">
            <span style="color:#1677ff;font-weight:600">{{ row.dataCount }}</span> 个
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="发现时间" width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewDetail(row)">查看详情</el-button>
            <el-button link type="success" size="small" @click="distributeOne(row)">下发</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 空状态 -->
    <el-card v-else-if="!scanning" shadow="never">
      <el-empty description="请配置扫描条件并开始扫描" :image-size="80" />
    </el-card>

    <!-- 设计问题弹窗 -->
    <el-dialog v-model="designIssuesVisible" title="补录任务下发 - 设计问题讨论" width="700px">
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
            问题 1：扫描出的数据缺口如何转化为补录单据
          </div>
          <div style="padding-left:16px;margin-bottom:12px">
            <div style="font-weight:600;margin-bottom:6px">问题描述：</div>
            <div style="color:#666;margin-bottom:12px">
              扫描出的缺失指标、断月份、空维度数据，下发后需要单位进行补录。这个补录操作的具体形式是什么？
            </div>
            <div style="font-weight:600;margin-bottom:6px">待确认：</div>
            <ul style="margin:0;padding-left:20px;color:#666">
              <li>是否生成类似更正单的补充单据？</li>
              <li>系统将原单据（如果存在）的数据复制出来，单位在此基础上补充缺失字段、缺失月份或空维度？</li>
              <li>补充单据与原单据的关系如何建立？如何标识补录完成状态？</li>
              <li>查询时如何展示原单据与补录单的数据合并结果？</li>
            </ul>
            <div style="background:#f6ffed;border:1px solid #b7eb8f;padding:10px;margin-top:12px;border-radius:4px">
              <div style="color:#389e0d;font-size:13px">
                <strong>建议方案：</strong>生成"补录单"（doc_type=SUPPLEMENT），携带原单据ID引用（origin_doc_id）。补录单提交后与原单据形成补充关系，原单据状态标记为"已补录"（SUPPLEMENTED），查询时合并展示完整数据。
              </div>
            </div>
          </div>
        </div>

        <div style="margin-bottom:24px">
          <div style="font-weight:600;font-size:15px;color:#1677ff;margin-bottom:12px">
            问题 2：历史指标数据补录是否还是走模板下发流程，只是区分 补录模板 和 正常模板，补录模板设置填写账期不受限制
          </div>
          <div style="padding-left:16px;margin-bottom:12px">
            <div style="font-weight:600;margin-bottom:6px">问题描述：</div>
            <div style="color:#666;margin-bottom:12px">
              历史数据补录往往涉及跨年度、跨账期的数据缺口，与正常的T-N期内补录场景不同。是否需要单独的补录模板机制？
            </div>
            <div style="font-weight:600;margin-bottom:6px">待确认：</div>
            <ul style="margin:0;padding-left:20px;color:#666">
              <li><strong>是否需要手动选择录入字段生成补录模板？</strong><br/>
                例如：2024年缺失"研发费用"指标，管理员手动选择需要补录的字段（研发费用、组织、账期等），生成一个临时的补录模板，只包含这些必要字段，简化填报。
              </li>
              <li style="margin-top:8px"><strong>补录模板是否走标准的模板下发流程？</strong><br/>
                通过模板管理创建"XX年度XX指标补录模板"，然后走正常的模板下发线路给各单位，单位基于该模板创建补录单据。
              </li>
              <li style="margin-top:8px"><strong>补录模板是否不限制账期？</strong><br/>
                正常模板有账期限制（如T-3，只能补录最近3个月），但历史补录模板可以设置为"不限制账期"或"指定历史账期范围"，允许补录多年前的数据。
              </li>
              <li style="margin-top:8px"><strong>补录模板与正常模板的关系？</strong><br/>
                补录模板是否基于正常模板复制字段定义？还是完全独立的模板？补录完成后数据如何与正常模板的数据合并统计？
              </li>
            </ul>
            <div style="background:#f6ffed;border:1px solid #b7eb8f;padding:10px;margin-top:12px;border-radius:4px">
              <div style="color:#389e0d;font-size:13px">
                <strong>建议方案：</strong>支持基于现有模板生成"补录模板"（模板类型=SUPPLEMENT），继承原模板字段定义但可精简字段范围。补录模板配置中增加"账期限制开关"，关闭后允许补录任意历史账期。走标准模板下发流程，确保权限控制和审批流程一致。补录完成的数据通过origin_template_id关联回正常模板。
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
            • 与业务方确认补录单据的数据继承规则和审批流程<br>
            • 设计补录单与原单据的关联关系（数据库ER图）<br>
            • 明确批量下发的事务边界和回滚策略（如部分单位下发失败的处理）<br>
            • 设计补录模板的字段精简机制和账期控制开关<br>
            • 确认补录数据与正常数据的合并统计规则
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
:deep(.el-slider__marks-text) {
  font-size: 12px;
}
</style>
