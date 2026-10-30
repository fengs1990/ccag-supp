<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import { mockTemplates, mockTemplateFields, mockTemplateVersions, FIELD_TYPES, TEMPLATE_STATUS, SOURCE_SYSTEMS, INDICATOR_CATEGORIES, COLLECT_FREQUENCIES, FILL_PERIODS, mockOwners } from '../../mock/template.js'
import { mockGroups } from '../../mock/group.js'
import { masterDataCategories } from '../../mock/common.js'
import { mockApprovalFlows } from '../../mock/approvalFlow.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const route  = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isNew = computed(() => route.params.id === 'new')
const templateId = computed(() => isNew.value ? null : Number(route.params.id))

// 当前模板数据
const tpl = ref(null)
const fields = ref([])
const versions = ref([])
const activeTab = ref('basic')

// 分组相关
const existingGroups = ref([])
const createGroupDialogVisible = ref(false)
const newGroup = ref({ groupName: '', groupDesc: '', groupType: 'NORMAL' })

const BIZ_DOMAIN_PREFIX = { FINANCE: 'FIN', PRODUCTION: 'PRD', SALES: 'SLS', SUPPLY: 'SUP' }

function genTemplateCode(bizDomain) {
  const prefix = BIZ_DOMAIN_PREFIX[bizDomain] || 'GEN'
  const seq = String(Math.floor(Math.random() * 900) + 100)
  return `TPL-${prefix}-${seq}`
}

function genRuleCode(existingRules) {
  return `R${String(existingRules.length + 1).padStart(3, '0')}`
}

onMounted(() => {
  // 加载分组列表
  existingGroups.value = [...mockGroups]

  if (isNew.value) {
    tpl.value = {
      id: null, templateCode: '', templateName: '', bizDomain: '', sourceSystem: '',
      indicatorCategory: '', approvalMode: 1, collectFrequency: 'MONTH', fillPeriod: 0,
      remark: '',
      status: 0, sourceType: userStore.isGroupAdmin ? 1 : 2, orgCode: userStore.currentRole.orgCode,
      orgName: userStore.currentRole.orgName, currentVersion: 1,
      groupId: null, groupName: null,
      approvalFlowId: null, // 审批流程ID
      ownerId: null, ownerName: null, // 负责人
    }
    fields.value = []
    versions.value = []
  } else {
    tpl.value = { ...mockTemplates.find(t => t.id === templateId.value) }
    fields.value = [...(mockTemplateFields[templateId.value] || [])]
    versions.value = [...(mockTemplateVersions[templateId.value] || [])]
  }
})

// 监听分组变化，自动加载分组字段
watch(() => tpl.value?.groupId, (newGroupId, oldGroupId) => {
  if (!tpl.value || newGroupId === oldGroupId) return

  const selectedGroup = existingGroups.value.find(g => g.id === newGroupId)

  if (newGroupId && selectedGroup && selectedGroup.fields && selectedGroup.fields.length > 0) {
    // 选择了分组，加载分组字段
    const groupFields = selectedGroup.fields.map(f => ({
      ...f,
      isGroupStd: 1, // 标记为分组标准字段
      fromGroupId: newGroupId, // 记录来源分组
    }))

    // 移除旧分组字段，保留非分组字段
    const nonGroupFields = fields.value.filter(f => !f.isGroupStd)

    // 分组字段放在前面
    fields.value = [...groupFields, ...nonGroupFields]

    // 加载分组的唯一性规则
    if (selectedGroup.uniqueRule) {
      // 移除旧的分组规则
      mockRules.value = mockRules.value.filter(r => r.fromGroupId !== oldGroupId)

      // 添加新的分组规则，构建正确的 ruleExpression
      const groupRule = {
        id: Math.max(...mockRules.value.map(r => r.id), 0) + 1,
        ruleCode: selectedGroup.uniqueRule.ruleCode || 'AUTO_UNIQUE_RULE',
        ruleName: selectedGroup.uniqueRule.ruleName || '分组字段联合唯一性校验',
        ruleType: 'UNIQUE',
        ruleLevel: 1,
        isEnabled: 1,
        errorMessage: selectedGroup.uniqueRule.errorMessage,
        ruleExpression: JSON.stringify({
          type: 'UNIQUE',
          fields: selectedGroup.uniqueRule.fieldCodes || [],
        }),
        fromGroupId: newGroupId, // 标记为分组规则
      }
      mockRules.value.push(groupRule)

      ElMessage.success(`已自动加载分组「${selectedGroup.groupName}」的 ${groupFields.length} 个标准字段和唯一性校验规则`)
    } else {
      ElMessage.success(`已自动加载分组「${selectedGroup.groupName}」的 ${groupFields.length} 个标准字段`)
    }
  } else if (!newGroupId && oldGroupId) {
    // 取消分组，移除分组字段和规则
    fields.value = fields.value.filter(f => !f.isGroupStd)
    mockRules.value = mockRules.value.filter(r => r.fromGroupId !== oldGroupId)
    ElMessage.info('已移除分组字段和规则')
  }
})


// 只读判断
const isReadOnly = computed(() => {
  if (!tpl.value) return true
  if (tpl.value.status === 2) return true        // 已失效
  if (tpl.value.status === 1) return true        // 已发布
  if (tpl.value.docCount > 0) return true        // 已有关联单据
  // UNIT_ADMIN 可以编辑：新建模板(sourceType=2)、集团下发模板(sourceType=3)
  if (userStore.isUnitAdmin && tpl.value.sourceType === 1) return true  // 不能编辑集团自建模板
  return false
})

// 只读原因
const readOnlyReason = computed(() => {
  if (!tpl.value) return ''
  if (tpl.value.status === 2) return '模板已失效，不可修改'
  if (tpl.value.status === 1) return '模板已发布，不可修改'
  if (tpl.value.docCount > 0) return `模板已有 ${tpl.value.docCount} 张关联单据，不可修改`
  if (userStore.isUnitAdmin && tpl.value.sourceType === 1) return '仅可编辑自建模板或集团下发的模板'
  return ''
})

// 指标是否可编辑：只读模式下不可编辑；分组标准字段不可编辑
function isFieldEditable(field) {
  if (isReadOnly.value) return false
  // 分组标准字段不可编辑
  if (field.isGroupStd === 1) return false
  return true
}

// ==================== 指标配置 ====================
const fieldDrawerVisible = ref(false)
const editingField = ref(null)
const editingFieldIdx = ref(-1)

function openAddField() {
  editingField.value = {
    id: Date.now(), templateId: templateId.value,
    fieldCode: '', fieldName: '', fieldType: 'TEXT',
    isRequired: null, isSensitive: null, isGroupStd: userStore.isGroupAdmin ? 1 : 0,
    sortOrder: fields.value.length + 1,
    maxLength: null, minValue: null, maxValue: null, decimalScale: null,
    dateFormat: '', regexPattern: '', enumOptions: [], masterDataCategory: '', masterDataType: '', defaultValue: '', remark: '',
  }
  editingFieldIdx.value = -1
  fieldDrawerVisible.value = true
}

function openEditField(field, idx) {
  editingField.value = { ...field, enumOptions: field.enumOptions ? [...field.enumOptions] : [], masterDataCategory: field.masterDataCategory || '' }
  editingFieldIdx.value = idx
  fieldDrawerVisible.value = true
}

// 主数据：当前分类下的参考数据项
const masterDataChildren = computed(() => {
  if (!editingField.value?.masterDataCategory) return []
  return masterDataCategories.find(c => c.value === editingField.value.masterDataCategory)?.children || []
})

// 主数据：所有参考数据项扁平化（用于直接搜索选择）
const allMasterDataItems = computed(() => {
  const items = []
  masterDataCategories.forEach(cat => {
    cat.children.forEach(item => {
      items.push({
        value: item.value,
        label: item.label,
        categoryValue: cat.value,
        categoryLabel: cat.label,
        displayLabel: `${cat.label} > ${item.label}`, // 用于搜索显示
      })
    })
  })
  return items
})

// 切换分类时清空已选参考数据项
function onMasterDataCategoryChange() {
  if (editingField.value) editingField.value.masterDataType = ''
}

// 参考数据项变化时反向设置分类
function onMasterDataTypeChange(value) {
  if (!value || !editingField.value) return
  const item = allMasterDataItems.value.find(i => i.value === value)
  if (item) {
    editingField.value.masterDataCategory = item.categoryValue
  }
}

// 主数据展示文本（分类 > 参考数据）
function getMasterDataLabel(field) {
  if (!field.masterDataType) return field.masterDataCategory || '—'
  const cat = masterDataCategories.find(c => c.value === field.masterDataCategory)
  const item = cat?.children.find(c => c.value === field.masterDataType)
  return cat && item ? `${cat.label} > ${item.label}` : field.masterDataType
}

function saveField() {
  if (!editingField.value.fieldCode) { ElMessage.warning('请填写字段编码'); return }
  if (!editingField.value.fieldName) { ElMessage.warning('请填写字段名称'); return }
  if (editingField.value.isRequired === null || editingField.value.isRequired === undefined) {
    ElMessage.warning('请选择是否必填'); return
  }
  if (editingField.value.isSensitive === null || editingField.value.isSensitive === undefined) {
    ElMessage.warning('请选择是否敏感'); return
  }
  if (editingFieldIdx.value === -1) {
    fields.value.push({ ...editingField.value })
  } else {
    fields.value[editingFieldIdx.value] = { ...editingField.value }
  }
  fieldDrawerVisible.value = false
  ElMessage.success('字段已保存')
}

function deleteField(idx) {
  const f = fields.value[idx]
  if (f.isGroupStd && userStore.isUnitAdmin) { ElMessage.error('集团标准指标不可删除'); return }
  fields.value.splice(idx, 1)
}

function moveField(idx, dir) {
  const target = idx + dir
  if (target < 0 || target >= fields.value.length) return
  ;[fields.value[idx], fields.value[target]] = [fields.value[target], fields.value[idx]]
}

// 枚举选项编辑
function addEnumOption() {
  if (!editingField.value.enumOptions) editingField.value.enumOptions = []
  editingField.value.enumOptions.push({ value: '', label: '' })
}
function removeEnumOption(idx) {
  editingField.value.enumOptions.splice(idx, 1)
}

// ==================== 校验规则 ====================

// 聚合函数选项
const AGG_FUNCTIONS = [
  { value: 'SUM',   label: 'SUM（求和）' },
  { value: 'COUNT', label: 'COUNT（计数）' },
  { value: 'AVG',   label: 'AVG（平均值）' },
  { value: 'MAX',   label: 'MAX（最大值）' },
  { value: 'MIN',   label: 'MIN（最小值）' },
]

// 比较操作符
const COMPARE_OPS = [
  { value: '=',  label: '= 等于' },
  { value: '!=', label: '≠ 不等于' },
  { value: '>',  label: '> 大于' },
  { value: '>=', label: '≥ 大于等于' },
  { value: '<',  label: '< 小于' },
  { value: '<=', label: '≤ 小于等于' },
]

// 主数据集选项（与字段配置的 masterDataType 保持一致）
const MASTER_DATASETS = [
  { value: 'ORG',      label: '组织机构' },
  { value: 'MATERIAL', label: '物料主数据' },
  { value: 'CUSTOMER', label: '客户主数据' },
  { value: 'FACTORY',  label: '工厂主数据' },
  { value: 'MODEL',    label: '车型主数据' },
  { value: 'SUBJECT',  label: '科目主数据' },
]

// FORMAT 约束类型
const FORMAT_CONSTRAINTS = [
  { value: 'NOT_EMPTY', label: '非空校验' },
  { value: 'REGEX',     label: '正则表达式' },
  { value: 'DATE_FMT',  label: '日期格式' },
  { value: 'NUMBER',    label: '纯数字' },
  { value: 'INT',       label: '整数' },
]

// 根据结构化 config 生成人类可读描述
function buildRuleDesc(rule) {
  try {
    const c = typeof rule.ruleExpression === 'string'
      ? JSON.parse(rule.ruleExpression)
      : rule.ruleExpression
    if (!c) return '—'
    const fieldLabel = (code) => fields.value.find(f => f.fieldCode === code)?.fieldName || code
    switch (c.type) {
      case 'FORMAT': {
        const constraintLabel = FORMAT_CONSTRAINTS.find(f => f.value === c.constraint)?.label || c.constraint
        if (c.constraint === 'REGEX')    return `【${fieldLabel(c.field)}】匹配正则：${c.pattern}`
        if (c.constraint === 'DATE_FMT') return `【${fieldLabel(c.field)}】日期格式为 ${c.dateFormat}`
        return `【${fieldLabel(c.field)}】${constraintLabel}`
      }
      case 'RANGE': {
        const parts = []
        if (c.min !== null && c.min !== undefined) parts.push(`≥ ${c.min}`)
        if (c.max !== null && c.max !== undefined) parts.push(`≤ ${c.max}`)
        return `【${fieldLabel(c.field)}】${parts.join(' 且 ')}`
      }
      case 'MASTER_DATA': {
        const cat  = masterDataCategories.find(d => d.value === c.category)
        const item = cat?.children.find(d => d.value === c.dataset)
        const dsLabel = cat && item ? `${cat.label} > ${item.label}` : (c.dataset || c.category || '—')
        return `【${fieldLabel(c.field)}】必须存在于 ${dsLabel}`
      }
      case 'CROSS_FIELD': {
        const op = COMPARE_OPS.find(o => o.value === c.op)?.label || c.op
        return `【${fieldLabel(c.fieldA)}】${op}【${fieldLabel(c.fieldB)}】`
      }
      case 'BALANCE': {
        const leftAgg  = c.left?.agg  || 'SUM'
        const rightAgg = c.right?.agg || 'SUM'
        const op = COMPARE_OPS.find(o => o.value === c.op)?.label || c.op
        return `${leftAgg}(${fieldLabel(c.left?.field)}) ${op} ${rightAgg}(${fieldLabel(c.right?.field)})`
      }
      case 'UNIQUE': {
        if (!c.fields || c.fields.length === 0) return '未配置唯一字段'
        const fieldNames = c.fields.map(code => fieldLabel(code)).join(' + ')
        return c.fields.length === 1 ? `【${fieldNames}】字段值唯一` : `【${fieldNames}】联合唯一`
      }
      case 'CUSTOM_SQL': {
        if (!c.paramMapping || c.paramMapping.length === 0) return 'SQL规则（未配置参数）'
        const paramLabels = c.paramMapping.map(code => fieldLabel(code)).join(', ')
        return `SQL规则：【${paramLabels}】`
      }
      default: return rule.ruleExpression || '—'
    }
  } catch {
    return rule.ruleExpression || '—'
  }
}

// 提取规则关联的字段
function getRelatedFields(rule) {
  try {
    const c = typeof rule.ruleExpression === 'string'
      ? JSON.parse(rule.ruleExpression)
      : rule.ruleExpression
    if (!c) return []
    const relatedFields = []

    switch (c.type) {
      case 'FORMAT':
      case 'RANGE':
      case 'MASTER_DATA':
        if (c.field) relatedFields.push(c.field)
        break
      case 'CROSS_FIELD':
        if (c.fieldA) relatedFields.push(c.fieldA)
        if (c.fieldB) relatedFields.push(c.fieldB)
        break
      case 'BALANCE':
        if (c.left?.field) relatedFields.push(c.left.field)
        if (c.right?.field) relatedFields.push(c.right.field)
        break
      case 'UNIQUE':
        if (c.fields && c.fields.length > 0) {
          relatedFields.push(...c.fields)
        }
        break
      case 'CUSTOM_SQL':
        if (c.paramMapping && c.paramMapping.length > 0) {
          relatedFields.push(...c.paramMapping)
        }
        break
    }

    return relatedFields
  } catch {
    return []
  }
}

// 获取某个字段关联的所有规则
function getFieldRules(fieldCode) {
  return mockRules.value.filter(rule => {
    try {
      const c = typeof rule.ruleExpression === 'string'
        ? JSON.parse(rule.ruleExpression)
        : rule.ruleExpression
      if (!c) return false

      switch (c.type) {
        case 'FORMAT':
        case 'RANGE':
        case 'MASTER_DATA':
          return c.field === fieldCode
        case 'CROSS_FIELD':
          return c.fieldA === fieldCode || c.fieldB === fieldCode
        case 'BALANCE':
          return c.left?.field === fieldCode || c.right?.field === fieldCode
        case 'UNIQUE':
          return c.fields && c.fields.includes(fieldCode)
        case 'CUSTOM_SQL':
          return c.paramMapping && c.paramMapping.includes(fieldCode)
        default:
          return false
      }
    } catch {
      return false
    }
  })
}

// 根据字段编码获取字段名称
function getFieldNameByCode(fieldCode) {
  const field = fields.value.find(f => f.fieldCode === fieldCode)
  return field ? field.fieldName : fieldCode
}

// 为字段快速添加规则
function quickAddRuleForField(fieldCode, fieldName) {
  const defaultType = 'FORMAT'
  editingRule.value = {
    id: null,
    ruleCode: '',
    ruleName: `${fieldName}校验`,
    ruleType: defaultType,
    ruleLevel: userStore.isGroupAdmin ? 1 : 2,
    errorMessage: '',
    isEnabled: 1,
    ruleExpression: '',
  }
  ruleConfig.value = initRuleConfig(defaultType)
  // 预填字段
  ruleConfig.value.field = fieldCode
  ruleAdvancedMode.value = false
  ruleDialogVisible.value = true
}

// mock 规则数据改为结构化 JSON
const mockRules = ref([
  {
    id: 1, ruleCode: 'R001', ruleName: '借贷方平衡校验', ruleType: 'BALANCE', ruleLevel: 1, isEnabled: 1,
    errorMessage: '借方合计必须等于贷方合计',
    ruleExpression: JSON.stringify({ type: 'BALANCE', left: { agg: 'SUM', field: 'debit_amount' }, op: '=', right: { agg: 'SUM', field: 'credit_amount' } }),
  },
  {
    id: 2, ruleCode: 'R002', ruleName: '账期格式校验', ruleType: 'FORMAT', ruleLevel: 1, isEnabled: 1,
    errorMessage: '账期格式必须为 yyyy-MM',
    ruleExpression: JSON.stringify({ type: 'FORMAT', field: 'period', constraint: 'REGEX', pattern: '^\\d{4}-\\d{2}$' }),
  },
  {
    id: 3, ruleCode: 'R003', ruleName: '金额非负校验', ruleType: 'RANGE', ruleLevel: 1, isEnabled: 1,
    errorMessage: '借方金额不能为负数',
    ruleExpression: JSON.stringify({ type: 'RANGE', field: 'debit_amount', min: 0, max: null }),
  },
  {
    id: 4, ruleCode: 'R004', ruleName: '科目主数据校验', ruleType: 'MASTER_DATA', ruleLevel: 1, isEnabled: 1,
    errorMessage: '科目编码不存在于集团主数据或已停用',
    ruleExpression: JSON.stringify({ type: 'MASTER_DATA', field: 'subject_code', category: 'FINANCE', dataset: 'FIN_ACCOUNT' }),
  },
  {
    id: 5, ruleCode: 'R005', ruleName: '缺失原因必填', ruleType: 'FORMAT', ruleLevel: 2, isEnabled: 1,
    errorMessage: '缺失原因分类不能为空',
    ruleExpression: JSON.stringify({ type: 'FORMAT', field: 'miss_type', constraint: 'NOT_EMPTY' }),
  },
  {
    id: 6, ruleCode: 'R006', ruleName: '科目编码唯一性', ruleType: 'UNIQUE', ruleLevel: 1, isEnabled: 1,
    errorMessage: '科目编码重复，同一单据中科目编码不能重复',
    ruleExpression: JSON.stringify({ type: 'UNIQUE', fields: ['subject_code'] }),
  },
  // 销售数量字段的多个规则
  {
    id: 7, ruleCode: 'R007', ruleName: '销售数量非负', ruleType: 'RANGE', ruleLevel: 1, isEnabled: 1,
    errorMessage: '销售数量不能为负数',
    ruleExpression: JSON.stringify({ type: 'RANGE', field: 'sales_qty', min: 0, max: null }),
  },
  {
    id: 8, ruleCode: 'R008', ruleName: '销售数量上限', ruleType: 'RANGE', ruleLevel: 2, isEnabled: 1,
    errorMessage: '单次销售数量不能超过10000',
    ruleExpression: JSON.stringify({ type: 'RANGE', field: 'sales_qty', min: null, max: 10000 }),
  },
  {
    id: 9, ruleCode: 'R009', ruleName: '销售数量必填', ruleType: 'FORMAT', ruleLevel: 1, isEnabled: 1,
    errorMessage: '销售数量不能为空',
    ruleExpression: JSON.stringify({ type: 'FORMAT', field: 'sales_qty', constraint: 'NOT_EMPTY' }),
  },
])

const ruleDialogVisible = ref(false)
const editingRule = ref(null)
// 当前编辑规则的结构化配置对象（与 ruleExpression JSON 双向同步）
const ruleConfig = ref({})
// 是否使用高级模式（自由文本）
const ruleAdvancedMode = ref(false)

// 计算用于下拉框显示的规则类型值
const displayRuleType = computed({
  get() {
    if (!editingRule.value) return ''
    if (editingRule.value.ruleType === 'CUSTOM_SQL' && ruleConfig.value.customRuleId) {
      return `CUSTOM_SQL_${ruleConfig.value.customRuleId}`
    }
    return editingRule.value.ruleType
  },
  set(value) {
    // 触发 change 事件时会调用 onRuleTypeChange
    if (value.startsWith('CUSTOM_SQL_')) {
      onRuleTypeChange(value)
    } else {
      editingRule.value.ruleType = value
      onRuleTypeChange(value)
    }
  }
})

function initRuleConfig(ruleType) {
  switch (ruleType) {
    case 'FORMAT':      return { type: 'FORMAT',      field: '', constraint: 'NOT_EMPTY', pattern: '', dateFormat: 'yyyy-MM-dd' }
    case 'RANGE':       return { type: 'RANGE',       field: '', min: null, max: null }
    case 'MASTER_DATA': return { type: 'MASTER_DATA', field: '', category: '', dataset: '' }
    case 'CROSS_FIELD': return { type: 'CROSS_FIELD', fieldA: '', op: '>=', fieldB: '' }
    case 'BALANCE':     return { type: 'BALANCE',     left: { agg: 'SUM', field: '' }, op: '=', right: { agg: 'SUM', field: '' } }
    case 'UNIQUE':      return { type: 'UNIQUE',      fields: [] }
    case 'CUSTOM_SQL':  return { type: 'CUSTOM_SQL',  customRuleId: null, sqlTemplate: '', paramMapping: [] }
    default:            return { type: ruleType }
  }
}

function onRuleTypeChange(newType) {
  // 检查是否选择了自定义规则
  if (newType.startsWith('CUSTOM_SQL_')) {
    const ruleId = parseInt(newType.replace('CUSTOM_SQL_', ''))
    const customRule = availableCustomRules.value.find(r => r.id === ruleId)
    if (customRule) {
      // 设置为CUSTOM_SQL类型
      editingRule.value.ruleType = 'CUSTOM_SQL'
      // 初始化配置
      ruleConfig.value = {
        type: 'CUSTOM_SQL',
        customRuleId: ruleId,
        sqlTemplate: customRule.sqlTemplate,
        paramMapping: new Array(customRule.paramCount).fill('')
      }
      // 自动填充错误提示（不填充规则名称）
      if (!editingRule.value.errorMessage || editingRule.value.errorMessage === '') {
        editingRule.value.errorMessage = customRule.errorMessage
      }
    }
  } else {
    // 通用规则类型
    ruleConfig.value = initRuleConfig(newType)
  }
  ruleAdvancedMode.value = false
}

function openAddRule() {
  const defaultType = 'FORMAT'
  editingRule.value = {
    id: null,
    ruleCode: '',
    ruleName: '', ruleType: defaultType, ruleLevel: userStore.isGroupAdmin ? 1 : 2,
    errorMessage: '', isEnabled: 1, ruleExpression: '',
  }
  ruleConfig.value = initRuleConfig(defaultType)
  ruleAdvancedMode.value = false
  ruleDialogVisible.value = true
}

function openEditRule(rule) {
  editingRule.value = { ...rule }
  try {
    ruleConfig.value = JSON.parse(rule.ruleExpression)
    ruleAdvancedMode.value = false
  } catch {
    ruleConfig.value = {}
    ruleAdvancedMode.value = true
  }
  ruleDialogVisible.value = true
}

function saveRule() {
  if (!editingRule.value.ruleName) { ElMessage.warning('请填写规则名称'); return }
  if (!editingRule.value.errorMessage) { ElMessage.warning('请填写错误提示文案'); return }

  if (!ruleAdvancedMode.value) {
    // 结构化模式：简单校验必填配置项
    const c = ruleConfig.value
    if (c.type === 'FORMAT'      && !c.field)    { ElMessage.warning('请选择作用字段'); return }
    if (c.type === 'RANGE'       && !c.field)    { ElMessage.warning('请选择作用字段'); return }
    if (c.type === 'MASTER_DATA' && (!c.field || !c.dataset)) { ElMessage.warning('请选择作用字段和参考数据项'); return }
    if (c.type === 'CROSS_FIELD' && (!c.fieldA || !c.fieldB)) { ElMessage.warning('请选择两个对比字段'); return }
    if (c.type === 'BALANCE'     && (!c.left?.field || !c.right?.field)) { ElMessage.warning('请选择平衡校验的两侧字段'); return }
    if (c.type === 'UNIQUE'      && (!c.fields || c.fields.length === 0)) { ElMessage.warning('请至少选择一个字段作为唯一性约束'); return }
    if (c.type === 'CUSTOM_SQL') {
      if (!c.customRuleId) { ElMessage.warning('请选择高级代码规则'); return }
      const emptyParam = c.paramMapping.findIndex(p => !p)
      if (emptyParam !== -1) { ElMessage.warning(`请选择参数 $${emptyParam + 1}`); return }
    }
    editingRule.value.ruleExpression = JSON.stringify(c)
  }

  const isEdit = editingRule.value.id && mockRules.value.some(r => r.id === editingRule.value.id)
  if (isEdit) {
    const idx = mockRules.value.findIndex(r => r.id === editingRule.value.id)
    mockRules.value[idx] = { ...editingRule.value }
    ElMessage.success('规则已更新')
  } else {
    mockRules.value.push({ ...editingRule.value })
    ElMessage.success('规则已添加')
  }
  ruleDialogVisible.value = false
}

function deleteRule(idOrIdx) {
  // 支持传入规则ID或索引
  let idx = idOrIdx
  if (typeof idOrIdx === 'number' && idOrIdx > 100) {
    // 传入的是ID，需要找到索引
    idx = mockRules.value.findIndex(r => r.id === idOrIdx)
    if (idx === -1) {
      ElMessage.error('规则不存在')
      return
    }
  }
  const r = mockRules.value[idx]
  if (r.ruleLevel === 1 && userStore.isUnitAdmin) { ElMessage.error('集团全局强规则不可删除'); return }

  ElMessageBox.confirm(`确认删除规则「${r.ruleName}」？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '确认删除',
  }).then(() => {
    mockRules.value.splice(idx, 1)
    ElMessage.success('规则已删除')
  }).catch(() => {})
}

const ruleTypeLabel    = { FORMAT: '格式校验', RANGE: '范围校验', MASTER_DATA: '主数据校验', CROSS_FIELD: '跨字段校验', BALANCE: '平衡校验', UNIQUE: '唯一性校验' }
const ruleTypeTagType  = { FORMAT: '', RANGE: 'warning', MASTER_DATA: 'success', CROSS_FIELD: 'info', BALANCE: 'danger', UNIQUE: 'primary' }

// ==================== 自定义规则 ====================
const availableCustomRules = ref([
  {
    id: 1,
    ruleCode: 'SQL_001',
    ruleName: '借贷平衡校验',
    sqlTemplate: 'ABS(SUM($1) - SUM($2)) > 0.01',
    paramCount: 2,
    paramNames: ['借方金额字段', '贷方金额字段'],
    errorMessage: '借方金额合计与贷方金额合计不相等',
  },
  {
    id: 2,
    ruleCode: 'SQL_002',
    ruleName: '金额区间合理性校验',
    sqlTemplate: '$1 < 0 OR $1 > 10000000',
    paramCount: 1,
    paramNames: ['金额字段'],
    errorMessage: '金额超出合理范围（0-1000万）',
  },
])

// 设计问题弹窗
const designIssuesVisible = ref(false)

// ==================== 分组管理 ====================
function openCreateGroupDialog() {
  newGroup.value = { groupName: '', groupDesc: '', groupType: 'NORMAL' }
  createGroupDialogVisible.value = true
}

function confirmCreateGroup() {
  if (!newGroup.value.groupName) {
    ElMessage.warning('请输入分组名称')
    return
  }

  // 检查分组名称是否重复
  if (existingGroups.value.some(g => g.groupName === newGroup.value.groupName)) {
    ElMessage.warning('分组名称已存在，请使用其他名称')
    return
  }

  // 创建新分组（mock）
  const newGroupId = Date.now()
  const newGroupCode = `GRP_${Date.now()}`

  const createdGroup = {
    id: newGroupId,
    groupCode: newGroupCode,
    groupName: newGroup.value.groupName,
    groupDesc: newGroup.value.groupDesc,
    groupType: newGroup.value.groupType,
    templateCount: 0,
    status: 1,
    createBy: userStore.currentRole.userName,
    createTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
    updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
  }

  existingGroups.value.push(createdGroup)
  mockGroups.push(createdGroup)

  // 自动选中新创建的分组
  tpl.value.groupId = newGroupId
  tpl.value.groupName = newGroup.value.groupName

  ElMessage.success('分组创建成功')
  createGroupDialogVisible.value = false
}

// 监听分组选择变化
watch(() => tpl.value?.groupId, (newGroupId) => {
  if (newGroupId) {
    const group = existingGroups.value.find(g => g.id === newGroupId)
    if (group) {
      tpl.value.groupName = group.groupName
    }
  } else {
    tpl.value.groupName = null
  }
})

// ==================== 审批流程 ====================
// 可用的审批流程（状态为已启用）
const availableFlows = computed(() => {
  return mockApprovalFlows.filter(f => f.status === 1)
})

// 当前选中的审批流程
const selectedFlow = computed(() => {
  if (!tpl.value?.approvalFlowId) return null
  return mockApprovalFlows.find(f => f.id === tpl.value.approvalFlowId)
})

// 获取角色名称
function getRoleName(roleKey) {
  const roles = {
    GROUP_ADMIN: '集团管理员',
    UNIT_ADMIN: '单位管理员',
    REVIEWER: '审核员',
    REPORTER: '填报人',
  }
  return roles[roleKey] || roleKey
}

// 获取用户名称
function getUserName(userId) {
  const user = mockOwners.find(u => u.userId === userId)
  return user ? user.userName : userId
}

// ==================== 保存 ====================
function saveDraft() {
  // 更新负责人姓名
  if (tpl.value.ownerId) {
    const owner = mockOwners.find(o => o.userId === tpl.value.ownerId)
    tpl.value.ownerName = owner ? owner.userName : null
  } else {
    tpl.value.ownerName = null
  }
  ElMessage.success('草稿已保存')
}

// ==================== 模板下发 ====================
const distributeDialogVisible = ref(false)
const distributeForm = ref({
  targetOrgs: [], // 下发目标单位
})

// 可下发的单位列表（集团 + 六大分子公司）
const availableOrgs = [
  { orgCode: 'GROUP',           orgName: '中国长安' },
  { orgCode: 'UNIT_CHANGAN',    orgName: '长安汽车' },
  { orgCode: 'UNIT_CHENZHI',    orgName: '辰致集团' },
  { orgCode: 'UNIT_FINANCE',    orgName: '财务公司' },
  { orgCode: 'UNIT_CAFC',       orgName: '长安汽车金融' },
  { orgCode: 'UNIT_WANYOU',     orgName: '万友汽车' },
  { orgCode: 'UNIT_MINSHENG',   orgName: '长安民生物流' },
]

function openDistributeDialog() {
  distributeForm.value = {
    targetOrgs: [],
  }
  distributeDialogVisible.value = true
}

function submitDistribute() {
  if (distributeForm.value.targetOrgs.length === 0) {
    ElMessage.warning('请至少选择一个下发目标单位')
    return
  }

  // 模拟下发操作
  const orgNames = distributeForm.value.targetOrgs.map(code => {
    const org = availableOrgs.find(o => o.orgCode === code)
    return org ? org.orgName : code
  }).join('、')

  ElMessage.success(`模板已下发至：${orgNames}`)
  distributeDialogVisible.value = false

  // 更新模板状态为已发布
  if (tpl.value.status === 0) {
    tpl.value.status = 1
  }
}

function goBack() {
  router.push('/template/list')
}
</script>

<template>
  <div v-if="tpl">
    <!-- 页面顶部 -->
    <div class="page-header" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px">
        <el-button :icon="'ArrowLeft'" circle size="small" @click="goBack" />
        <div>
          <div class="page-title">
            {{ isNew ? '新建模板' : (isReadOnly ? '查看模板' : '编辑模板') }}：{{ isNew ? '' : tpl.templateName }}
            <el-tag v-if="!isNew" :type="TEMPLATE_STATUS[tpl.status].type" size="small" style="margin-left:8px">
              {{ TEMPLATE_STATUS[tpl.status].label }}
            </el-tag>
            <el-tag v-if="tpl.sourceType === 3" type="warning" size="small" style="margin-left:4px">集团下发</el-tag>
          </div>
          <div v-if="!isNew" class="page-desc">{{ tpl.templateCode }} · V{{ tpl.currentVersion }} · 最后修改：{{ tpl.updateTime }}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px" v-if="!isReadOnly">
        <el-button :icon="'QuestionFilled'" @click="designIssuesVisible = true">设计问题</el-button>
        <el-button @click="saveDraft">保存草稿</el-button>
        <el-button type="primary" v-if="tpl.status === 0 && userStore.isGroupAdmin" @click="openDistributeDialog">模板下发</el-button>
      </div>
      <el-tag v-else-if="readOnlyReason" type="warning" effect="light">
        <el-icon style="margin-right:4px"><Lock /></el-icon>{{ readOnlyReason }}
      </el-tag>
    </div>

    <!-- Tab 内容 -->
    <el-tabs v-model="activeTab" type="border-card" class="tpl-tabs">

      <!-- Tab1: 基本信息 -->
      <el-tab-pane label="基本信息" name="basic">
        <el-card shadow="never" class="tab-content-card">
          <el-form :model="tpl" label-width="110px" :disabled="isReadOnly">
            <el-form-item v-if="!isNew" label="模板编码">
              <span class="auto-gen-code">{{ tpl.templateCode }}</span>
            </el-form-item>
            <el-form-item label="模板名称" required>
              <el-input v-model="tpl.templateName" placeholder="请输入模板名称" style="width:360px" />
            </el-form-item>
            <el-form-item label="业务域" required>
              <el-select v-model="tpl.bizDomain" style="width:200px">
                <el-option label="财务域"   value="FINANCE" />
                <el-option label="生产域"   value="PRODUCTION" />
                <el-option label="销售域"   value="SALES" />
                <el-option label="供应链域" value="SUPPLY" />
              </el-select>
            </el-form-item>
            <el-form-item label="来源系统">
              <el-select v-model="tpl.sourceSystem" placeholder="请选择来源系统" clearable style="width:220px">
                <el-option v-for="s in SOURCE_SYSTEMS" :key="s.value" :label="s.label" :value="s.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="指标分类">
              <el-select v-model="tpl.indicatorCategory" placeholder="请选择指标分类" clearable style="width:220px">
                <el-option v-for="c in INDICATOR_CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="填报周期" required>
              <el-select v-model="tpl.collectFrequency" placeholder="请选择填报周期" style="width:220px">
                <el-option v-for="f in COLLECT_FREQUENCIES" :key="f.value" :label="f.label" :value="f.value" />
              </el-select>
              <div style="font-size:12px;color:#888;margin-top:4px">
                数据按什么周期进行填报（年度、季度、月度等），选择"非周期"则不受账期约束
              </div>
            </el-form-item>
            <el-form-item v-if="tpl.collectFrequency !== 'NONE'" label="允许填报账期" required>
              <el-select v-model="tpl.fillPeriod" placeholder="请选择允许填报账期" style="width:220px">
                <el-option v-for="p in FILL_PERIODS" :key="p.value" :label="p.label" :value="p.value" />
              </el-select>
              <div style="font-size:12px;color:#888;margin-top:4px">
                允许填报的账期范围（如 T-2 表示可填报最近2个账期的数据）
              </div>
            </el-form-item>
            <el-form-item label="审批流程">
              <div style="width:100%">
                <el-select
                  v-model="tpl.approvalFlowId"
                  placeholder="选择审批流程模板"
                  clearable
                  style="width:360px"
                >
                  <el-option
                    v-for="flow in availableFlows"
                    :key="flow.id"
                    :label="flow.flowName"
                    :value="flow.id"
                  >
                    <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
                      <span>{{ flow.flowName }}</span>
                      <el-tag size="small" type="primary" effect="plain">{{ flow.nodes.length }}级审批</el-tag>
                    </div>
                  </el-option>
                </el-select>
                <div style="font-size:12px;color:#888;margin-top:4px">
                  基于此模板创建的单据将自动使用此审批流程。如未选择，单据创建时需手动指定审批人。
                </div>

                <!-- 流程节点预览 -->
                <div v-if="selectedFlow" style="margin-top:16px">
                  <div style="display:flex;align-items:center;gap:8px;overflow-x:auto;padding-bottom:8px">
                    <div v-for="(node, index) in selectedFlow.nodes" :key="node.nodeId" style="display:flex;align-items:center;gap:8px">
                      <div style="min-width:200px;padding:12px;background:#fff;border:1px solid #d9d9d9;border-radius:4px">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                          <span style="font-weight:600;font-size:14px">{{ node.nodeName }}</span>
                        </div>
                        <div style="font-size:12px;color:#888">
                          <span v-if="node.nodeType === 'MANUAL_SELECT'">
                            手动指定审批人
                          </span>
                          <span v-else-if="node.nodeType === 'FIXED_USER'">
                            固定审批人：{{ getUserName(node.assignValue) }}
                          </span>
                          <span v-else-if="node.nodeType === 'ROLE'">
                            按角色分配：{{ getRoleName(node.assignValue) }}
                          </span>
                          <span v-else>
                            {{ node.nodeType }}
                          </span>
                        </div>
                      </div>
                      <el-icon v-if="index < selectedFlow.nodes.length - 1" style="color:#999;font-size:18px">
                        <Right />
                      </el-icon>
                    </div>
                  </div>
                </div>
              </div>
            </el-form-item>

            <el-form-item label="所属分组">
              <el-select
                v-model="tpl.groupId"
                placeholder="不分组"
                clearable
                filterable
                style="width:300px"
              >
                <el-option
                  v-for="g in existingGroups"
                  :key="g.id"
                  :label="g.groupName"
                  :value="g.id"
                >
                  <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
                    <span>{{ g.groupName }}</span>
                    <div style="display:flex;gap:4px">
                      <el-tag v-if="g.groupType === 'MASTER_SLAVE'" size="small" type="warning" effect="plain">
                        主从分组
                      </el-tag>
                      <el-tag v-else size="small" type="info" effect="plain">
                        普通分组
                      </el-tag>
                      <el-tag size="small" type="info" effect="plain">
                        {{ g.templateCount }}个模板
                      </el-tag>
                    </div>
                  </div>
                </el-option>
              </el-select>

              <div style="color:#999;font-size:12px;margin-top:4px">
                <div v-if="!tpl.groupId"></div>
                <div v-else-if="existingGroups.find(g => g.id === tpl.groupId)?.groupType === 'NORMAL'">
                  普通分组：分组内的所有模板数据，根据唯一标识进行整合后上传集团
                </div>
                <div v-else-if="existingGroups.find(g => g.id === tpl.groupId)?.groupType === 'MASTER_SLAVE'">
                  主从分组：与同组其他模板数据合并上传，并进行主从关联校验
                </div>
              </div>
            </el-form-item>

            <el-form-item label="负责人">
              <el-select v-model="tpl.ownerId" placeholder="请选择负责人" clearable style="width:200px" filterable>
                <el-option
                  v-for="owner in mockOwners"
                  :key="owner.userId"
                  :label="`${owner.userName}（${owner.deptName}）`"
                  :value="owner.userId"
                >
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span>{{ owner.userName }}</span>
                    <el-tag size="small" type="info" effect="plain">{{ owner.deptName }}</el-tag>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="模板说明">
              <el-input v-model="tpl.remark" type="textarea" :rows="3" style="width:420px" />
            </el-form-item>
          </el-form>

          <!-- 版本历史 -->
          <el-divider v-if="versions.length" content-position="left" style="margin-top:24px">版本历史</el-divider>
          <el-timeline v-if="versions.length">
            <el-timeline-item
              v-for="v in [...versions].reverse()"
              :key="v.id"
              :timestamp="v.createTime"
              placement="top"
            >
              <span style="font-weight:500">V{{ v.versionNo }}</span>
              <span style="color:#888;margin-left:8px">{{ v.changeDesc }}</span>
              <span style="color:#aaa;margin-left:8px;font-size:12px">{{ v.createBy }}</span>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-tab-pane>

      <!-- Tab2: 指标配置 -->
      <el-tab-pane label="指标配置" name="fields">
        <el-card shadow="never">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>指标列表（共 {{ fields.length }} 个）</span>
              <div style="display:flex;align-items:center;gap:8px">
                <el-tag v-if="userStore.isUnitAdmin" type="info" size="small">
                  <el-icon><Lock /></el-icon> 集团标准指标已锁定，仅可新增本地扩展指标
                </el-tag>
                <el-button
                  v-if="!isReadOnly"
                  type="primary" size="small" :icon="'Plus'"
                  @click="openAddField"
                >
                  添加指标
                </el-button>
              </div>
            </div>
          </template>

          <el-table :data="fields" row-key="id" style="width:100%">
            <el-table-column label="排序" width="80" align="center">
              <template #default="{ $index }">
                <div style="display:flex;flex-direction:column;gap:2px;align-items:center">
                  <el-icon
                    v-if="$index > 0 && isFieldEditable(fields[$index])"
                    style="cursor:pointer;color:#1677ff"
                    @click="moveField($index, -1)"
                  ><ArrowUp /></el-icon>
                  <span style="font-size:12px;color:#aaa">{{ $index + 1 }}</span>
                  <el-icon
                    v-if="$index < fields.length - 1 && isFieldEditable(fields[$index])"
                    style="cursor:pointer;color:#1677ff"
                    @click="moveField($index, 1)"
                  ><ArrowDown /></el-icon>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="fieldCode" label="指标编码" width="160" />
            <el-table-column prop="fieldName" label="指标名称" width="160">
              <template #default="{ row }">
                {{ row.fieldName }}
                <el-icon v-if="row.isGroupStd === 1" style="color:#722ed1;margin-left:4px" title="分组标准字段，不可修改"><Lock /></el-icon>
              </template>
            </el-table-column>
            <el-table-column label="指标类型" width="120">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ FIELD_TYPES.find(t => t.value === row.fieldType)?.label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="必填" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="row.isRequired ? 'danger' : 'info'" size="small">{{ row.isRequired ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="敏感" width="70" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.isSensitive" type="warning" size="small">敏感</el-tag>
                <span v-else style="color:#ccc">—</span>
              </template>
            </el-table-column>
            <el-table-column label="来源" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.isGroupStd === 1" type="warning" size="small">
                  分组字段
                </el-tag>
                <el-tag v-else type="success" size="small">
                  自定义
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="补充配置">
              <template #default="{ row }">
                <span v-if="row.fieldType === 'TEXT' && row.maxLength" style="font-size:12px;color:#888">最大 {{ row.maxLength }} 字</span>
                <span v-if="row.fieldType === 'NUMBER'" style="font-size:12px;color:#888">
                  {{ row.decimalScale != null ? `小数${row.decimalScale}位` : '' }}
                  {{ row.minValue != null ? ` 最小${row.minValue}` : '' }}
                  {{ row.maxValue != null ? ` 最大${row.maxValue}` : '' }}
                </span>
                <span v-if="row.fieldType === 'DATE' && row.dateFormat" style="font-size:12px;color:#888">{{ row.dateFormat }}</span>
                <span v-if="row.fieldType === 'ENUM' && row.enumOptions" style="font-size:12px;color:#888">{{ row.enumOptions.length }} 个选项</span>
                <span v-if="row.fieldType === 'MASTER_DATA'" style="font-size:12px;color:#888">{{ getMasterDataLabel(row) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="规则">
              <template #default="{ row }">
                <div v-if="getFieldRules(row.fieldCode).length > 0" style="display:flex;flex-wrap:wrap;gap:4px">
                  <el-tag
                    v-for="rule in getFieldRules(row.fieldCode)"
                    :key="rule.id"
                    size="small"
                    :type="ruleTypeTagType[rule.ruleType]"
                    style="cursor:pointer"
                    @click="openEditField(row, fields.indexOf(row))"
                  >
                    {{ rule.ruleName }}
                  </el-tag>
                </div>
                <span v-else style="color:#aaa;font-size:12px">—</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row, $index }">
                <el-button link type="primary" size="small" @click="openEditField(row, $index)">
                  {{ isFieldEditable(row) ? '编辑' : '查看' }}
                </el-button>
                <el-button
                  v-if="isFieldEditable(row)"
                  link type="danger" size="small"
                  @click="deleteField($index)"
                >删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- Tab3: 校验规则 -->
      <el-tab-pane label="校验规则" name="rules">
        <el-card shadow="never">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>校验规则（共 {{ mockRules.length }} 条）</span>
              <div style="display:flex;gap:8px;align-items:center">
                <el-tag type="info" size="small">
                  <el-icon><InfoFilled /></el-icon>
                  集团全局强规则不可删除
                </el-tag>
                <el-button v-if="!isReadOnly" type="primary" size="small" :icon="'Plus'" @click="openAddRule">
                  添加规则
                </el-button>
              </div>
            </div>
          </template>

          <el-table :data="mockRules" style="width:100%" stripe>
            <el-table-column prop="ruleName" label="规则名称" width="160">
              <template #default="{ row }">
                {{ row.ruleName }}
                <el-icon v-if="row.fromGroupId" style="color:#722ed1;margin-left:4px" title="分组标准规则，不可修改"><Lock /></el-icon>
              </template>
            </el-table-column>
            <el-table-column label="规则类型" width="110">
              <template #default="{ row }">
                <template v-if="row.ruleType === 'CUSTOM_SQL'">
                  <el-tag type="warning" size="small">自定义规则</el-tag>
                </template>
                <template v-else>
                  <el-tag :type="ruleTypeTagType[row.ruleType]" size="small">{{ ruleTypeLabel[row.ruleType] }}</el-tag>
                </template>
              </template>
            </el-table-column>
            <el-table-column label="关联字段" width="220">
              <template #default="{ row }">
                <div v-if="getRelatedFields(row).length > 0" style="display:flex;flex-wrap:wrap;gap:4px">
                  <el-tag v-for="fieldCode in getRelatedFields(row)" :key="fieldCode" size="small" type="info">
                    {{ getFieldNameByCode(fieldCode) }}
                  </el-tag>
                </div>
                <span v-else style="color:#aaa">—</span>
              </template>
            </el-table-column>
            <el-table-column label="级别" width="130">
              <template #default="{ row }">
                <el-tag :type="row.ruleLevel === 1 ? 'danger' : 'info'" size="small">
                  {{ row.ruleLevel === 1 ? '集团全局规则' : '本地规则' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="规则描述" min-width="220">
              <template #default="{ row }">
                <span class="rule-desc">{{ buildRuleDesc(row) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="errorMessage" label="错误提示" min-width="180" show-overflow-tooltip />
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.isEnabled" :active-value="1" :inactive-value="0"
                  :disabled="row.ruleLevel === 1 && userStore.isUnitAdmin" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row, $index }">
                <template v-if="!isReadOnly && !row.fromGroupId && (row.ruleLevel !== 1 || userStore.isGroupAdmin)">
                  <el-button link type="primary" size="small" @click="openEditRule(row)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="deleteRule($index)">删除</el-button>
                </template>
                <el-button v-else link type="primary" size="small" @click="openEditRule(row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>

  <!-- 指标配置抽屉 -->
  <el-drawer
    v-model="fieldDrawerVisible"
    :title="editingFieldIdx === -1 ? '添加指标' : (isFieldEditable(fields[editingFieldIdx] || {}) ? '编辑指标' : '查看指标')"
    size="480px"
    destroy-on-close
  >
    <el-form v-if="editingField" :model="editingField" label-width="100px">
      <el-form-item label="指标编码" required>
        <el-input v-model="editingField.fieldCode" placeholder="如 org_code" :disabled="editingFieldIdx !== -1" />
      </el-form-item>
      <el-form-item label="指标名称" required>
        <el-input v-model="editingField.fieldName" placeholder="如 组织编码" />
      </el-form-item>
      <el-form-item label="指标类型" required>
        <el-select v-model="editingField.fieldType" style="width:100%">
          <el-option v-for="t in FIELD_TYPES" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="是否必填" required>
        <el-radio-group v-model="editingField.isRequired">
          <el-radio :value="1">是</el-radio>
          <el-radio :value="0">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="是否敏感" required>
        <el-radio-group v-model="editingField.isSensitive">
          <el-radio :value="1">是</el-radio>
          <el-radio :value="0">否</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 按字段类型展示不同配置 -->
      <template v-if="editingField.fieldType === 'TEXT'">
        <el-form-item label="最大字符数">
          <el-input-number v-model="editingField.maxLength" :min="1" :max="2000" style="width:160px" />
        </el-form-item>
      </template>

      <template v-if="editingField.fieldType === 'NUMBER'">
        <el-form-item label="最小值">
          <el-input-number v-model="editingField.minValue" style="width:160px" />
        </el-form-item>
        <el-form-item label="最大值">
          <el-input-number v-model="editingField.maxValue" style="width:160px" />
        </el-form-item>
        <el-form-item label="小数位数">
          <el-input-number v-model="editingField.decimalScale" :min="0" :max="6" style="width:120px" />
        </el-form-item>
      </template>

      <template v-if="editingField.fieldType === 'DATE'">
        <el-form-item label="日期格式">
          <el-select v-model="editingField.dateFormat" style="width:180px">
            <el-option label="yyyy-MM-dd" value="yyyy-MM-dd" />
            <el-option label="yyyy-MM"    value="yyyy-MM" />
            <el-option label="yyyy"       value="yyyy" />
          </el-select>
        </el-form-item>
      </template>

      <template v-if="editingField.fieldType === 'ENUM' || editingField.fieldType === 'RADIO' || editingField.fieldType === 'CHECKBOX'">
        <el-form-item label="选项列表">
          <div style="width:100%">
            <div v-for="(opt, idx) in editingField.enumOptions" :key="idx" style="display:flex;gap:8px;margin-bottom:6px">
              <el-input v-model="opt.value" placeholder="值" style="width:80px" />
              <el-input v-model="opt.label" placeholder="显示文本" style="flex:1" />
              <el-button link type="danger" :icon="'Delete'" @click="removeEnumOption(idx)" />
            </div>
            <el-button size="small" :icon="'Plus'" @click="addEnumOption">添加选项</el-button>
          </div>
        </el-form-item>
      </template>

      <template v-if="editingField.fieldType === 'MASTER_DATA'">
        <el-form-item label="主数据分类" required>
          <el-select
            v-model="editingField.masterDataCategory"
            placeholder="请选择主数据分类"
            style="width:100%"
            filterable
            clearable
            @change="onMasterDataCategoryChange"
          >
            <el-option
              v-for="cat in masterDataCategories"
              :key="cat.value"
              :label="cat.label"
              :value="cat.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="参考数据项" required>
          <el-select
            v-model="editingField.masterDataType"
            placeholder="可直接搜索选择参考数据项"
            style="width:100%"
            filterable
            clearable
            @change="onMasterDataTypeChange"
          >
            <el-option-group
              v-for="cat in masterDataCategories"
              :key="cat.value"
              :label="cat.label"
            >
              <el-option
                v-for="item in cat.children"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-option-group>
          </el-select>
          <div style="font-size:12px;color:#999;margin-top:4px">
            <el-icon style="margin-right:4px"><InfoFilled /></el-icon>
            可直接搜索参考数据项名称，选中后自动带出所属分类
          </div>
        </el-form-item>
      </template>

      <el-form-item label="指标说明">
        <el-input v-model="editingField.remark" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="fieldDrawerVisible = false">取消</el-button>
      <el-button
        v-if="editingField && (editingFieldIdx === -1 || isFieldEditable(fields[editingFieldIdx] || {}))"
        type="primary" @click="saveField"
      >保存</el-button>
    </template>
  </el-drawer>

  <!-- 规则配置弹窗 -->
  <el-dialog
    v-model="ruleDialogVisible"
    :title="(editingRule?.id && mockRules.some(r => r.id === editingRule.id)) ? '编辑校验规则' : '添加校验规则'"
    width="580px"
  >
    <el-form v-if="editingRule" :model="editingRule" label-width="100px">

      <!-- 编辑时展示规则编码 -->
      <el-form-item v-if="editingRule.id && mockRules.some(r => r.id === editingRule.id)" label="规则编码">
        <span class="auto-gen-code">{{ editingRule.ruleCode }}</span>
      </el-form-item>

      <el-form-item label="规则名称" required>
        <el-input v-model="editingRule.ruleName" placeholder="请输入规则名称" />
      </el-form-item>

      <el-form-item label="规则类型" required>
        <el-select v-model="displayRuleType" style="width:100%">
          <el-option-group label="通用规则">
            <el-option v-for="(label, key) in ruleTypeLabel" :key="key" :label="label" :value="key">
              <span>{{ label }}</span>
              <el-tag size="small" style="float:right;margin-left:8px" type="info">通用</el-tag>
            </el-option>
          </el-option-group>
          <el-option-group label="自定义规则">
            <el-option
              v-for="rule in availableCustomRules"
              :key="`custom_${rule.id}`"
              :label="rule.ruleName"
              :value="`CUSTOM_SQL_${rule.id}`"
            >
              <span>{{ rule.ruleName }}</span>
              <el-tag size="small" style="float:right;margin-left:8px" type="warning">定制</el-tag>
            </el-option>
          </el-option-group>
        </el-select>
      </el-form-item>

      <!-- ======= 结构化配置区 ======= -->
      <template v-if="true">

        <!-- FORMAT：格式校验 -->
        <template v-if="editingRule.ruleType === 'FORMAT'">
          <el-form-item label="作用指标" required>
            <el-select v-model="ruleConfig.field" placeholder="选择指标" style="width:220px">
              <el-option v-for="f in fields" :key="f.fieldCode" :label="f.fieldName" :value="f.fieldCode" />
            </el-select>
          </el-form-item>
          <el-form-item label="约束类型" required>
            <el-select v-model="ruleConfig.constraint" style="width:220px">
              <el-option v-for="c in FORMAT_CONSTRAINTS" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="ruleConfig.constraint === 'REGEX'" label="正则表达式" required>
            <el-input v-model="ruleConfig.pattern" placeholder="如 ^\d{4}-\d{2}$" style="width:280px" />
          </el-form-item>
          <el-form-item v-if="ruleConfig.constraint === 'DATE_FMT'" label="日期格式" required>
            <el-select v-model="ruleConfig.dateFormat" style="width:180px">
              <el-option label="yyyy-MM-dd" value="yyyy-MM-dd" />
              <el-option label="yyyy-MM"    value="yyyy-MM" />
              <el-option label="yyyy"       value="yyyy" />
            </el-select>
          </el-form-item>
        </template>

        <!-- RANGE：范围校验 -->
        <template v-if="editingRule.ruleType === 'RANGE'">
          <el-form-item label="作用指标" required>
            <el-select v-model="ruleConfig.field" placeholder="选择指标" style="width:220px">
              <el-option v-for="f in fields.filter(f => f.fieldType === 'NUMBER')" :key="f.fieldCode" :label="f.fieldName" :value="f.fieldCode" />
            </el-select>
            <div style="font-size:12px;color:#aaa;margin-top:4px">仅数字类型字段可用</div>
          </el-form-item>
          <el-form-item label="最小值">
            <el-input-number v-model="ruleConfig.min" placeholder="不限" style="width:160px" />
          </el-form-item>
          <el-form-item label="最大值">
            <el-input-number v-model="ruleConfig.max" placeholder="不限" style="width:160px" />
          </el-form-item>
        </template>

        <!-- MASTER_DATA：主数据校验 -->
        <template v-if="editingRule.ruleType === 'MASTER_DATA'">
          <el-form-item label="作用指标" required>
            <el-select v-model="ruleConfig.field" placeholder="选择指标" style="width:220px">
              <el-option v-for="f in fields" :key="f.fieldCode" :label="f.fieldName" :value="f.fieldCode" />
            </el-select>
          </el-form-item>
          <el-form-item label="主数据分类" required>
            <el-select
              v-model="ruleConfig.category"
              placeholder="请选择主数据分类"
              style="width:220px"
              @change="ruleConfig.dataset = ''"
            >
              <el-option v-for="cat in masterDataCategories" :key="cat.value" :label="cat.label" :value="cat.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="参考数据项" required>
            <el-select
              v-model="ruleConfig.dataset"
              placeholder="请先选择主数据分类"
              style="width:220px"
              :disabled="!ruleConfig.category"
            >
              <el-option
                v-for="item in masterDataCategories.find(c => c.value === ruleConfig.category)?.children || []"
                :key="item.value" :label="item.label" :value="item.value"
              />
            </el-select>
            <div style="font-size:12px;color:#aaa;margin-top:4px">
              字段值必须在所选参考数据中存在
            </div>
          </el-form-item>
        </template>

        <!-- CROSS_FIELD：跨字段逻辑校验 -->
        <template v-if="editingRule.ruleType === 'CROSS_FIELD'">
          <div style="display:flex;align-items:center;gap:8px;padding:0 0 16px 100px;flex-wrap:wrap">
            <el-select v-model="ruleConfig.fieldA" placeholder="字段 A" style="width:160px">
              <el-option v-for="f in fields" :key="f.fieldCode" :label="f.fieldName" :value="f.fieldCode" />
            </el-select>
            <el-select v-model="ruleConfig.op" style="width:110px">
              <el-option v-for="o in COMPARE_OPS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
            <el-select v-model="ruleConfig.fieldB" placeholder="字段 B" style="width:160px">
              <el-option v-for="f in fields.filter(f => f.fieldCode !== ruleConfig.fieldA)" :key="f.fieldCode" :label="f.fieldName" :value="f.fieldCode" />
            </el-select>
          </div>
          <div style="font-size:12px;color:#888;padding-left:100px;margin-top:-8px;margin-bottom:12px">
            示例：结束日期 ≥ 开始日期
          </div>
        </template>

        <!-- BALANCE：平衡校验 -->
        <template v-if="editingRule.ruleType === 'BALANCE'">
          <el-form-item label="左侧">
            <div style="display:flex;align-items:center;gap:8px">
              <el-select v-model="ruleConfig.left.agg" style="width:140px">
                <el-option v-for="a in AGG_FUNCTIONS" :key="a.value" :label="a.label" :value="a.value" />
              </el-select>
              <span style="color:#888">（</span>
              <el-select v-model="ruleConfig.left.field" placeholder="选择字段" style="width:160px">
                <el-option v-for="f in fields.filter(f => f.fieldType === 'NUMBER')" :key="f.fieldCode" :label="f.fieldName" :value="f.fieldCode" />
              </el-select>
              <span style="color:#888">）</span>
            </div>
          </el-form-item>
          <el-form-item label="操作符">
            <el-select v-model="ruleConfig.op" style="width:130px">
              <el-option v-for="o in COMPARE_OPS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="右侧">
            <div style="display:flex;align-items:center;gap:8px">
              <el-select v-model="ruleConfig.right.agg" style="width:140px">
                <el-option v-for="a in AGG_FUNCTIONS" :key="a.value" :label="a.label" :value="a.value" />
              </el-select>
              <span style="color:#888">（</span>
              <el-select v-model="ruleConfig.right.field" placeholder="选择字段" style="width:160px">
                <el-option v-for="f in fields.filter(f => f.fieldType === 'NUMBER')" :key="f.fieldCode" :label="f.fieldName" :value="f.fieldCode" />
              </el-select>
              <span style="color:#888">）</span>
            </div>
          </el-form-item>
          <div style="font-size:12px;color:#888;padding-left:100px;margin-top:-8px;margin-bottom:12px">
            示例：SUM（借方金额）= SUM（贷方金额）
          </div>
        </template>

        <!-- UNIQUE：唯一性校验 -->
        <template v-if="editingRule.ruleType === 'UNIQUE'">
          <el-form-item label="唯一性指标" required>
            <el-select
              v-model="ruleConfig.fields"
              multiple
              placeholder="选择一个或多个字段构成唯一约束"
              style="width:100%;max-width:500px"
              collapse-tags
              collapse-tags-tooltip
            >
              <el-option v-for="f in fields" :key="f.fieldCode" :label="f.fieldName" :value="f.fieldCode" />
            </el-select>
            <div style="font-size:12px;color:#888;margin-top:8px;line-height:1.6">
              <div><el-icon><InfoFilled /></el-icon> 单字段唯一：选择一个字段，该字段的值在所有行中不能重复（如：员工编号）</div>
              <div style="margin-top:4px"><el-icon><InfoFilled /></el-icon> 联合唯一：选择多个字段，这些字段的组合值不能重复（如：年份+月份+部门）</div>
            </div>
          </el-form-item>
          <div style="font-size:12px;color:#888;padding-left:100px;margin-bottom:12px">
            示例：【员工编号】唯一 或 【部门 + 岗位】联合唯一
          </div>
        </template>

        <!-- CUSTOM_SQL：定制规则参数配置 -->
        <template v-if="editingRule.ruleType === 'CUSTOM_SQL' && ruleConfig.customRuleId">
          <el-alert type="info" :closable="false" style="margin-bottom:12px">
            <template #default>
              <div style="font-size:12px;color:#666;font-family:monospace">
                {{ ruleConfig.sqlTemplate }}
              </div>
            </template>
          </el-alert>

          <el-form-item
            v-for="(paramName, index) in availableCustomRules.find(r => r.id === ruleConfig.customRuleId)?.paramNames"
            :key="index"
            :label="`参数 $${index + 1}`"
            required
          >
            <div style="width:100%;max-width:500px">
              <div style="margin-bottom:4px;font-size:12px;color:#888">{{ paramName }}</div>
              <el-select v-model="ruleConfig.paramMapping[index]" placeholder="选择字段" style="width:100%">
                <el-option v-for="f in fields" :key="f.fieldCode" :label="f.fieldName" :value="f.fieldCode">
                  <span>{{ f.fieldName }}</span>
                  <span style="float:right;color:#8492a6;font-size:12px">{{ f.fieldCode }}</span>
                </el-option>
              </el-select>
            </div>
          </el-form-item>
        </template>

        <!-- 实时预览 -->
        <el-form-item label="规则预览">
          <div class="rule-preview">
            {{ buildRuleDesc({ ruleType: editingRule.ruleType, ruleExpression: JSON.stringify(ruleConfig) }) }}
          </div>
        </el-form-item>

      </template>

      <el-divider style="margin:8px 0" />

      <el-form-item label="错误提示" required>
        <el-input v-model="editingRule.errorMessage" placeholder="校验不通过时展示给用户的提示文案" />
      </el-form-item>

    </el-form>

    <template #footer>
      <el-button @click="ruleDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="saveRule">保存</el-button>
    </template>
  </el-dialog>

  <!-- 设计问题弹窗 -->
  <el-dialog v-model="designIssuesVisible" title="模板管理 - 设计问题讨论" width="700px">
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
          问题 1：审批模式的具体配置逻辑
        </div>
        <div style="padding-left:16px;margin-bottom:12px">
          <div style="font-weight:600;margin-bottom:6px">问题描述：</div>
          <div style="color:#666;margin-bottom:12px">
            模板的审批模式包括：单人审批、多级串行审批、按组织自动分派。这些审批模式的具体配置逻辑需要明确。
          </div>
          <div style="font-weight:600;margin-bottom:6px">待确认：</div>
          <ul style="margin:0;padding-left:20px;color:#666">
            <li style="margin-bottom:8px">
              <strong>多级串行审批：</strong>是否在创建模板时就需要指定"各级或各单位"的"审批角色或审批人"？
              <ul style="margin-top:4px;padding-left:20px">
                <li>如：第一级由"单位管理员"审批，第二级由"集团审核员"审批？</li>
                <li>还是仅配置审批级数（如2级），运行时动态分配？</li>
                <li>不同单位是否可以有不同的审批配置（单位A走2级，单位B走1级）？</li>
              </ul>
            </li>
            <li style="margin-bottom:8px">
              <strong>按组织自动分派：</strong>是否是自动随机分配一个组织下的某个角色中的人员？
              <ul style="margin-top:4px;padding-left:20px">
                <li>如何确定"组织"的范围（是填报单位？还是集团总部？）</li>
                <li>是否随机分配，还是按负载均衡、轮询等规则？</li>
                <li>分配的目标角色是什么（审核员？单位管理员？）</li>
              </ul>
            </li>
            <li style="margin-bottom:8px">
              <strong>系统角色清单：</strong>当前系统有哪些角色？
              <ul style="margin-top:4px;padding-left:20px">
                <li>GROUP_ADMIN（集团管理员）：负责模板管理、任务下发</li>
                <li>UNIT_ADMIN（单位管理员）：负责本单位模板管理、单据审批</li>
                <li>REVIEWER（审核员）：负责单据审批</li>
                <li>REPORTER（填报人）：负责单据填报</li>
                <li>是否还需要新增角色（如"财务审核"、"生产审核"等业务专属角色）？</li>
              </ul>
            </li>
          </ul>
        </div>
      </div>

      <div style="margin-bottom:24px">
        <div style="font-weight:600;font-size:15px;color:#1677ff;margin-bottom:12px">
          问题 2：填报时限是否需要精确到小时
        </div>
        <div style="padding-left:16px;margin-bottom:12px">
          <div style="font-weight:600;margin-bottom:6px">问题描述：</div>
          <div style="color:#666;margin-bottom:12px">
            当前原型设计中，模板配置的填报时限为天数（fillDeadlineDays），单据截止日期精确到日期（如2026-11-30）。实际业务中是否需要更精确的时间控制？
          </div>
          <div style="font-weight:600;margin-bottom:6px">待确认：</div>
          <ul style="margin:0;padding-left:20px;color:#666">
            <li style="margin-bottom:8px">
              <strong>时限精度要求：</strong>填报时限是否需要精确到小时甚至分钟（如"30天6小时"，截止时间为"2026-11-30 18:00:00"）？
            </li>
            <li style="margin-bottom:8px">
              <strong>起始时间定义：</strong>填报时限的起始时间点如何定义？
              <ul style="margin-top:4px;padding-left:20px">
                <li>选项A：单据创建成功时刻（如单据创建于2026-10-20 14:30:00，填报时限30天，则截止时间为2026-11-19 14:30:00）</li>
                <li>选项B：单据创建当日零点（如单据创建于2026-10-20任意时刻，截止时间统一为2026-11-19 23:59:59）</li>
                <li>选项C：单据创建次日零点（如单据创建于2026-10-20任意时刻，从2026-10-21 00:00:00开始计算30天）</li>
              </ul>
            </li>
            <li style="margin-bottom:8px">
              <strong>逾期判定标准：</strong>逾期是按"截止日期23:59:59前必须归档"，还是按"截止日期当天内归档即可"？
            </li>
            <li style="margin-bottom:8px">
              <strong>提醒机制：</strong>如果精确到小时，是否需要更精细的提醒机制（如"距离截止还剩2小时"的紧急提醒）？
            </li>
          </ul>
        </div>
      </div>

      <div style="background:#f0f5ff;border:1px solid #adc6ff;padding:12px;border-radius:4px">
        <div style="font-weight:600;color:#1677ff;margin-bottom:6px">
          <el-icon style="vertical-align:middle"><InfoFilled /></el-icon>
          后续行动
        </div>
        <div style="font-size:13px;color:#1677ff">
          • 设计审批流配置表结构（ccag_supp_approval_flow），支持模板级的审批流定义<br/>
          • 明确审批人分配策略（随机、轮询、负载均衡）及配置方式<br/>
          • 确认是否需要扩展业务专属审批角色，及角色权限矩阵<br/>
          • 设计审批流可视化配置界面（流程图、节点配置）<br/>
          • 明确填报时限精度要求（天/小时）及起始时间定义（创建时刻/当日零点/次日零点）<br/>
          • 确定逾期判定标准和提醒机制细节
        </div>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="designIssuesVisible = false">知道了</el-button>
    </template>
  </el-dialog>

  <!-- 新建分组对话框 -->
  <el-dialog v-model="createGroupDialogVisible" title="新建分组" width="500px">
    <el-form :model="newGroup" label-width="100px">
      <el-form-item label="分组名称" required>
        <el-input
          v-model="newGroup.groupName"
          placeholder="如：财务综合报表数据组"
          maxlength="50"
        />
      </el-form-item>
      <el-form-item label="分组类型" required>
        <el-radio-group v-model="newGroup.groupType">
          <el-radio value="NORMAL">普通分组</el-radio>
          <el-radio value="MASTER_SLAVE">主从分组</el-radio>
        </el-radio-group>
        <div style="font-size:12px;color:#888;margin-top:8px;line-height:1.6">
          <div v-if="newGroup.groupType === 'NORMAL'">
            <el-icon><InfoFilled /></el-icon> 普通分组：分组内的所有模板数据独立上传，互不依赖
          </div>
          <div v-if="newGroup.groupType === 'MASTER_SLAVE'">
            <el-icon><InfoFilled /></el-icon> 主从分组：分组内包含一个主表模板和多个从表模板，上传时会进行关联校验
          </div>
        </div>
      </el-form-item>
      <el-form-item label="分组说明">
        <el-input
          v-model="newGroup.groupDesc"
          type="textarea"
          :rows="3"
          placeholder="说明该分组包含哪些模板，用途等"
          maxlength="200"
        />
      </el-form-item>
      <el-alert
        type="info"
        :closable="false"
        style="margin-top:12px"
      >
        <template #title>
          <span style="font-size:13px">
            创建后，当前模板将自动加入该分组。分组编码由系统自动生成。
          </span>
        </template>
      </el-alert>
    </el-form>
    <template #footer>
      <el-button @click="createGroupDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmCreateGroup">确定</el-button>
    </template>
  </el-dialog>

  <!-- 模板下发对话框 -->
  <el-dialog v-model="distributeDialogVisible" title="模板下发" width="600px">
    <el-form :model="distributeForm" label-width="120px">
      <el-form-item label="下发目标单位" required>
        <el-checkbox-group v-model="distributeForm.targetOrgs">
          <div style="display:flex;flex-direction:column;gap:12px">
            <el-checkbox
              v-for="org in availableOrgs"
              :key="org.orgCode"
              :label="org.orgCode"
              :value="org.orgCode"
            >
              {{ org.orgName }}
            </el-checkbox>
          </div>
        </el-checkbox-group>
      </el-form-item>

      <el-alert type="info" :closable="false" style="margin-top:12px">
        <template #title>
          <span style="font-size:13px">
            模板下发后，目标单位可以查看和使用该模板进行数据填报
          </span>
        </template>
      </el-alert>
    </el-form>

    <template #footer>
      <el-button @click="distributeDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="submitDistribute">确认下发</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
:deep(.tpl-tabs) {
  border-radius: 4px;
}
:deep(.tpl-tabs .el-tabs__content) {
  padding: 0;
  background: #f0f2f5;
}
.tab-content-card {
  width: 100%;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-bottom: none;
}
:deep(.tpl-tabs .el-tab-pane) {
  min-height: 400px;
}
.auto-gen-code {
  font-family: monospace;
  font-size: 13px;
  color: #1a1a1a;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}
.rule-desc {
  font-size: 13px;
  color: #555;
  font-family: monospace;
}
.rule-preview {
  font-size: 13px;
  color: #1677ff;
  font-family: monospace;
  background: #f0f5ff;
  border: 1px solid #d6e4ff;
  border-radius: 4px;
  padding: 6px 10px;
  min-height: 32px;
  width: 100%;
}
.auto-gen-tip {
  font-size: 12px;
  color: #aaa;
  margin-left: 8px;
}
</style>
