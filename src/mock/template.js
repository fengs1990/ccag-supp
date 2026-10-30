// 字段类型定义
export const FIELD_TYPES = [
  { value: 'TEXT',        label: '文本' },
  { value: 'NUMBER',      label: '数字' },
  { value: 'DATE',        label: '日期' },
  { value: 'ENUM',        label: '下拉枚举' },
  { value: 'RADIO',       label: '单选' },
  { value: 'CHECKBOX',    label: '多选' },
  { value: 'MASTER_DATA', label: '主数据下拉' },
  { value: 'ATTACHMENT',  label: '附件' },
]

// 模板状态
export const TEMPLATE_STATUS = {
  0: { label: '草稿',   type: 'info' },
  1: { label: '已发布', type: 'success' },
  2: { label: '已失效', type: 'danger' },
}

// 来源系统
export const SOURCE_SYSTEMS = [
  { value: 'SAP-FI',  label: 'SAP-FI（财务）' },
  { value: 'SAP-CO',  label: 'SAP-CO（成本）' },
  { value: 'SAP-MM',  label: 'SAP-MM（物料）' },
  { value: 'MES',     label: 'MES（生产执行）' },
  { value: 'CRM',     label: 'CRM（客户关系）' },
  { value: 'WMS',     label: 'WMS（仓库管理）' },
  { value: 'OA',      label: 'OA（办公自动化）' },
  { value: 'OTHER',   label: '其他' },
]

// 指标分类
export const INDICATOR_CATEGORIES = [
  { value: '损益类指标',   label: '损益类指标' },
  { value: '成本类指标',   label: '成本类指标' },
  { value: '资产负债指标', label: '资产负债指标' },
  { value: '产量类指标',   label: '产量类指标' },
  { value: '销量类指标',   label: '销量类指标' },
  { value: '供应链指标',   label: '供应链指标' },
  { value: '人力资源指标', label: '人力资源指标' },
  { value: '其他指标',     label: '其他指标' },
]

// 审批模式
export const APPROVAL_MODES = [
  { value: 1, label: '单人审核' },
  { value: 2, label: '多级串行' },
  { value: 3, label: '按组织自动分派' },
]

// 填报周期（数据按什么周期填报）
export const COLLECT_FREQUENCIES = [
  { value: 'NONE',     label: '非周期' },
  { value: 'YEAR',     label: '年' },
  { value: 'HALF_YEAR', label: '半年' },
  { value: 'QUARTER',  label: '季度' },
  { value: 'MONTH',    label: '月' },
  { value: 'WEEK',     label: '周' },
  { value: 'DAY',      label: '日' },
]

// 允许填报账期选项（允许填报哪些历史账期，T-1 到 T-12 和无限制）
export const FILL_PERIODS = [
  { value: 0, label: '无限制' },
  { value: 1, label: 'T-1（上1个账期）' },
  { value: 2, label: 'T-2（上2个账期）' },
  { value: 3, label: 'T-3（上3个账期）' },
  { value: 4, label: 'T-4（上4个账期）' },
  { value: 5, label: 'T-5（上5个账期）' },
  { value: 6, label: 'T-6（上6个账期）' },
  { value: 12, label: 'T-12（上12个账期）' },
]

// 可选负责人列表
export const mockOwners = [
  { userId: 'u001', userName: '王建国', deptName: '数据管理部' },
  { userId: 'u002', userName: '李明华', deptName: '财务部' },
  { userId: 'u003', userName: '张伟', deptName: '生产部' },
  { userId: 'u004', userName: '陈志远', deptName: '审计部' },
  { userId: 'u005', userName: '刘芳', deptName: '供应链部' },
  { userId: 'u006', userName: '赵敏', deptName: '销售部' },
  { userId: 'u007', userName: '孙强', deptName: '质量管理部' },
]

// 模板分组定义
export const mockTemplateGroups = [
  {
    groupId: 1,
    groupCode: 'GRP-FINANCE-001',
    groupName: '财务核心数据补录组',
    orgCode: 'GROUP',
    bizDomain: 'FINANCE',
    masterTemplateId: 1, // 【角色审批】财务数据补录 为主模板
    description: '财务数据必须先填报资产负债表主模板，审批通过后才能填报明细科目',
    isEnabled: 1,
    createTime: '2026-09-15 10:00:00',
    updateTime: '2026-09-15 10:00:00',
  },
  {
    groupId: 2,
    groupCode: 'GRP-PRODUCTION-001',
    groupName: '生产数据补录组',
    orgCode: 'UNIT_CA',
    bizDomain: 'PRODUCTION',
    masterTemplateId: 3, // 【手动指定】项目数据补录 为主模板
    description: '生产数据必须先填报产量汇总，审批通过后才能填报各车间明细',
    isEnabled: 1,
    createTime: '2026-10-01 09:00:00',
    updateTime: '2026-10-01 09:00:00',
  },
]

// 模板列表 mock 数据
export const mockTemplates = [
  {
    id: 1,
    templateCode: 'TPL-ROLE-001',
    templateName: '【角色审批】财务数据补录',
    bizDomain: 'FINANCE',
    bizDomainLabel: '财务域',
    sourceSystem: 'SAP-FI',
    indicatorCategory: '损益类指标',
    orgCode: 'GROUP',
    orgName: '长安汽车集团（总部）',
    sourceType: 1,
    sourceTypeLabel: '集团自建',
    currentVersion: 1,
    status: 1,
    approvalMode: 2,
    approvalFlowId: 5, // 角色审批流程
    collectFrequency: 'MONTH',
    fillPeriod: 2,
    fillDeadlineDays: 30,
    fillDeadlineTime: '2026-11-30 23:59:59',
    maxOverdueDays: 30,
    remark: '使用角色审批流程，审批人可选择自动分配或手动指定',
    createBy: '王建国',
    createTime: '2026-10-22 14:00:00',
    updateTime: '2026-10-22 14:00:00',
    hasDistribution: true,
    docCount: 5,
    groupId: 1,
    groupName: '财务综合报表数据组',
    isMaster: 1, // 是主模板
    dependOnMaster: 0, // 主模板不依赖
    ownerId: 'u002',
    ownerName: '李明华',
  },
  {
    id: 2,
    templateCode: 'TPL-FIXED-001',
    templateName: '【固定审批】重要财务数据补录',
    bizDomain: 'FINANCE',
    bizDomainLabel: '财务域',
    sourceSystem: 'SAP-FI',
    indicatorCategory: '损益类指标',
    orgCode: 'GROUP',
    orgName: '长安汽车集团（总部）',
    sourceType: 1,
    sourceTypeLabel: '集团自建',
    currentVersion: 1,
    status: 1,
    approvalMode: 2,
    approvalFlowId: 6, // 固定人员审批流程
    collectFrequency: 'MONTH',
    fillPeriod: 2,
    fillDeadlineDays: 30,
    fillDeadlineTime: '2026-11-30 23:59:59',
    maxOverdueDays: 30,
    remark: '使用固定审批人流程，由财务总监和质量负责人固定审批',
    createBy: '王建国',
    createTime: '2026-10-22 14:30:00',
    updateTime: '2026-10-22 14:30:00',
    hasDistribution: true,
    docCount: 2,
    groupId: 1,
    groupName: '财务综合报表数据组',
    isMaster: 0, // 不是主模板
    dependOnMaster: 1, // 依赖主模板
    ownerId: 'u002',
    ownerName: '李明华',
  },
  {
    id: 3,
    templateCode: 'TPL-MANUAL-001',
    templateName: '【手动指定】项目数据补录',
    bizDomain: 'PRODUCTION',
    bizDomainLabel: '生产域',
    sourceSystem: 'MES',
    indicatorCategory: '产量类指标',
    orgCode: 'GROUP',
    orgName: '长安汽车集团（总部）',
    sourceType: 1,
    sourceTypeLabel: '集团自建',
    currentVersion: 1,
    status: 1,
    approvalMode: 2,
    approvalFlowId: 7, // 手动指定审批流程
    collectFrequency: 'MONTH',
    fillPeriod: 1,
    fillDeadlineDays: 30,
    fillDeadlineTime: '2026-10-31 18:00:00',
    maxRejectCount: 2,
    maxOverdueDays: 15,
    remark: '使用手动指定审批流程，创建单据时需要指定项目负责人和部门主管',
    createBy: '王建国',
    createTime: '2026-10-22 15:00:00',
    updateTime: '2026-10-22 15:00:00',
    hasDistribution: true,
    docCount: 3,
    groupId: null,
    groupName: null,
    isMaster: 0,
    dependOnMaster: 0,
    ownerId: 'u003',
    ownerName: '张伟',
  },
  {
    id: 4,
    templateCode: 'TPL-MIX-001',
    templateName: '【混合审批】供应链数据补录',
    bizDomain: 'SUPPLY',
    bizDomainLabel: '供应链域',
    sourceSystem: 'WMS',
    indicatorCategory: '供应链指标',
    orgCode: 'GROUP',
    orgName: '长安汽车集团（总部）',
    sourceType: 1,
    sourceTypeLabel: '集团自建',
    currentVersion: 1,
    status: 1,
    approvalMode: 2,
    approvalFlowId: 4, // 混合审批流程
    collectFrequency: 'MONTH',
    fillPeriod: 3,
    fillDeadlineDays: 20,
    fillDeadlineTime: '2026-11-20 23:59:59',
    maxRejectCount: 2,
    maxOverdueDays: 15,
    remark: '使用混合审批流程，第一级手动指定，第二级角色自动分配',
    createBy: '张伟',
    createTime: '2026-10-22 15:30:00',
    updateTime: '2026-10-22 15:30:00',
    hasDistribution: true,
    docCount: 1,
    groupId: null,
    groupName: null,
    isMaster: 0,
    dependOnMaster: 0,
    ownerId: 'u005',
    ownerName: '刘芳',
  },
  {
    id: 5,
    templateCode: 'TPL-DRAFT-001',
    templateName: '【草稿】销售数据补录模板',
    bizDomain: 'SALES',
    bizDomainLabel: '销售域',
    sourceSystem: 'CRM',
    indicatorCategory: '销量类指标',
    orgCode: 'GROUP',
    orgName: '长安汽车集团（总部）',
    sourceType: 1,
    sourceTypeLabel: '集团自建',
    currentVersion: 1,
    status: 0, // 草稿状态
    approvalMode: 2,
    approvalFlowId: 5, // 角色审批流程
    collectFrequency: 'MONTH',
    fillPeriod: 2,
    fillDeadlineDays: 25,
    fillDeadlineTime: null,
    maxRejectCount: 3,
    maxOverdueDays: 30,
    remark: '销售域数据补录模板，目前处于草稿状态，待完善后发布',
    createBy: '李明',
    createTime: '2026-10-23 10:00:00',
    updateTime: '2026-10-23 10:00:00',
    hasDistribution: false,
    docCount: 0,
    groupId: null,
    groupName: null,
    isMaster: 0,
    dependOnMaster: 0,
    ownerId: 'u006',
    ownerName: '赵敏',
  },
  {
    id: 6,
    templateCode: 'TPL-NONE-001',
    templateName: '【非周期】客户投诉记录补录',
    bizDomain: 'SALES',
    bizDomainLabel: '销售域',
    sourceSystem: 'CRM',
    indicatorCategory: '其他指标',
    orgCode: 'UNIT_CA',
    orgName: '长安乘用车',
    sourceType: 2,
    sourceTypeLabel: '二级单位自建',
    currentVersion: 1,
    status: 1,
    approvalMode: 1,
    approvalFlowId: null,
    collectFrequency: 'NONE', // 非周期
    fillPeriod: 0, // 非周期不需要此字段
    fillDeadlineDays: 0,
    fillDeadlineTime: null,
    maxRejectCount: 3,
    maxOverdueDays: 30,
    remark: '非周期模板，用于记录客户投诉事件，可随时补录，不受账期限制。数据审批通过后归档，后续可追加新的投诉记录',
    createBy: '张小红',
    createTime: '2026-10-24 10:00:00',
    updateTime: '2026-10-24 10:00:00',
    hasDistribution: false,
    docCount: 1,
    groupId: null,
    groupName: null,
    isMaster: 0,
    dependOnMaster: 0,
    ownerId: 'u006',
    ownerName: '赵敏',
  },
]

// 模板字段 mock（按 templateId 分组）
export const mockTemplateFields = {
  1: [
    { id: 101, templateId: 1, fieldCode: 'org_code',     fieldName: '组织编码',   fieldType: 'MASTER_DATA', isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 1, masterDataType: 'ORG', remark: '填写所属组织机构的唯一编码，用于标识数据归属' },
    { id: 102, templateId: 1, fieldCode: 'period',       fieldName: '账期',       fieldType: 'DATE',        isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 2, dateFormat: 'yyyy-MM', remark: '数据所属的会计期间，格式为YYYY-MM' },
    { id: 103, templateId: 1, fieldCode: 'subject_code', fieldName: '科目编码',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 3, maxLength: 20, remark: '会计科目的唯一编码，需符合企业会计准则' },
    { id: 104, templateId: 1, fieldCode: 'subject_name', fieldName: '科目名称',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 4, maxLength: 100, remark: '会计科目的完整名称' },
    { id: 105, templateId: 1, fieldCode: 'debit_amount', fieldName: '借方金额',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 1, isGroupStd: 1, sortOrder: 5, decimalScale: 2, minValue: 0, remark: '会计分录借方金额，保留2位小数' },
    { id: 106, templateId: 1, fieldCode: 'credit_amount',fieldName: '贷方金额',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 1, isGroupStd: 1, sortOrder: 6, decimalScale: 2, minValue: 0, remark: '会计分录贷方金额，保留2位小数' },
    { id: 107, templateId: 1, fieldCode: 'currency',     fieldName: '币种',       fieldType: 'ENUM',        isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 7, enumOptions: [{ value: 'CNY', label: '人民币' }, { value: 'USD', label: '美元' }], remark: '交易使用的货币币种' },
    { id: 108, templateId: 1, fieldCode: 'id_card_photo', fieldName: '身份证照片', fieldType: 'ATTACHMENT',  isRequired: 0, isSensitive: 1, isGroupStd: 0, sortOrder: 8, remark: '上传经办人身份证照片，支持图片、PDF等格式，可上传多个文件' },
  ],
  2: [
    // 从模板自己的字段（不包含主模板字段，主模板字段会在运行时从主单据获取）
    { id: 201, templateId: 2, fieldCode: 'detail_subject_code', fieldName: '明细科目编码', fieldType: 'TEXT',   isRequired: 1, isSensitive: 0, isGroupStd: 0, sortOrder: 1, maxLength: 20 },
    { id: 202, templateId: 2, fieldCode: 'detail_subject_name', fieldName: '明细科目名称', fieldType: 'TEXT',   isRequired: 1, isSensitive: 0, isGroupStd: 0, sortOrder: 2, maxLength: 100 },
    { id: 203, templateId: 2, fieldCode: 'detail_amount',       fieldName: '明细金额',     fieldType: 'NUMBER', isRequired: 1, isSensitive: 1, isGroupStd: 0, sortOrder: 3, decimalScale: 2, minValue: 0 },
    { id: 204, templateId: 2, fieldCode: 'remark',              fieldName: '备注',         fieldType: 'TEXT',   isRequired: 0, isSensitive: 0, isGroupStd: 0, sortOrder: 4, maxLength: 200 },
  ],
  3: [
    { id: 301, templateId: 3, fieldCode: 'factory_code',  fieldName: '工厂编码',   fieldType: 'MASTER_DATA', isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 1, masterDataType: 'FACTORY' },
    { id: 302, templateId: 3, fieldCode: 'period',        fieldName: '生产月份',   fieldType: 'DATE',        isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 2, dateFormat: 'yyyy-MM' },
    { id: 303, templateId: 3, fieldCode: 'actual_qty',    fieldName: '实际产量',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 3, decimalScale: 0, minValue: 0 },
  ],
  4: [
    { id: 401, templateId: 4, fieldCode: 'warehouse_code', fieldName: '仓库编码',   fieldType: 'MASTER_DATA', isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 1, masterDataType: 'WAREHOUSE' },
    { id: 402, templateId: 4, fieldCode: 'period',         fieldName: '账期',       fieldType: 'DATE',        isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 2, dateFormat: 'yyyy-MM' },
    { id: 403, templateId: 4, fieldCode: 'stock_qty',      fieldName: '库存数量',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 3, decimalScale: 2, minValue: 0 },
  ],
  5: [
    { id: 501, templateId: 5, fieldCode: 'org_code',       fieldName: '销售单位',   fieldType: 'MASTER_DATA', isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 1, masterDataType: 'ORG' },
    { id: 502, templateId: 5, fieldCode: 'period',         fieldName: '销售月份',   fieldType: 'DATE',        isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 2, dateFormat: 'yyyy-MM' },
    { id: 503, templateId: 5, fieldCode: 'product_code',   fieldName: '产品编码',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 3, maxLength: 50 },
    { id: 504, templateId: 5, fieldCode: 'product_name',   fieldName: '产品名称',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 4, maxLength: 200 },
    { id: 505, templateId: 5, fieldCode: 'sales_qty',      fieldName: '销售数量',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 5, decimalScale: 0, minValue: 0 },
    { id: 506, templateId: 5, fieldCode: 'sales_amount',   fieldName: '销售金额',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 1, isGroupStd: 1, sortOrder: 6, decimalScale: 2, minValue: 0 },
    { id: 507, templateId: 5, fieldCode: 'customer_type',  fieldName: '客户类型',   fieldType: 'ENUM',        isRequired: 1, isSensitive: 0, isGroupStd: 1, sortOrder: 7, enumOptions: [{ value: 'DEALER', label: '经销商' }, { value: 'DIRECT', label: '直销' }, { value: 'FLEET', label: '集团客户' }] },
    { id: 508, templateId: 5, fieldCode: 'region',         fieldName: '销售区域',   fieldType: 'ENUM',        isRequired: 0, isSensitive: 0, isGroupStd: 1, sortOrder: 8, enumOptions: [{ value: 'EAST', label: '华东' }, { value: 'SOUTH', label: '华南' }, { value: 'NORTH', label: '华北' }, { value: 'WEST', label: '西部' }] },
    { id: 509, templateId: 5, fieldCode: 'remark',         fieldName: '备注',       fieldType: 'TEXT',        isRequired: 0, isSensitive: 0, isGroupStd: 0, sortOrder: 9, maxLength: 500 },
  ],
  6: [
    { id: 601, templateId: 6, fieldCode: 'complaint_no',    fieldName: '投诉编号',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, isGroupStd: 0, sortOrder: 1, maxLength: 50 },
    { id: 602, templateId: 6, fieldCode: 'complaint_date',  fieldName: '投诉日期',   fieldType: 'DATE',        isRequired: 1, isSensitive: 0, isGroupStd: 0, sortOrder: 2, dateFormat: 'yyyy-MM-dd' },
    { id: 603, templateId: 6, fieldCode: 'customer_name',   fieldName: '客户名称',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, isGroupStd: 0, sortOrder: 3, maxLength: 100 },
    { id: 604, templateId: 6, fieldCode: 'customer_phone',  fieldName: '联系电话',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 1, isGroupStd: 0, sortOrder: 4, maxLength: 20 },
    { id: 605, templateId: 6, fieldCode: 'product_model',   fieldName: '产品型号',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, isGroupStd: 0, sortOrder: 5, maxLength: 100 },
    { id: 606, templateId: 6, fieldCode: 'complaint_type',  fieldName: '投诉类型',   fieldType: 'ENUM',        isRequired: 1, isSensitive: 0, isGroupStd: 0, sortOrder: 6, enumOptions: [{ value: 'QUALITY', label: '质量问题' }, { value: 'SERVICE', label: '服务问题' }, { value: 'DELIVERY', label: '交付问题' }, { value: 'OTHER', label: '其他' }] },
    { id: 607, templateId: 6, fieldCode: 'complaint_desc',  fieldName: '投诉内容',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, isGroupStd: 0, sortOrder: 7, maxLength: 1000 },
    { id: 608, templateId: 6, fieldCode: 'handler',         fieldName: '处理人',     fieldType: 'TEXT',        isRequired: 0, isSensitive: 0, isGroupStd: 0, sortOrder: 8, maxLength: 50 },
    { id: 609, templateId: 6, fieldCode: 'handle_result',   fieldName: '处理结果',   fieldType: 'TEXT',        isRequired: 0, isSensitive: 0, isGroupStd: 0, sortOrder: 9, maxLength: 1000 },
    { id: 610, templateId: 6, fieldCode: 'status',          fieldName: '处理状态',   fieldType: 'ENUM',        isRequired: 1, isSensitive: 0, isGroupStd: 0, sortOrder: 10, enumOptions: [{ value: 'PENDING', label: '待处理' }, { value: 'PROCESSING', label: '处理中' }, { value: 'RESOLVED', label: '已解决' }, { value: 'CLOSED', label: '已关闭' }] },
  ],
}

// 模板版本历史
// 模板版本历史（包含完整的字段快照和基础信息快照）
export const mockTemplateVersions = {
  1: [
    {
      id: 1,
      templateId: 1,
      versionNo: 1,
      createBy: '王建国',
      createTime: '2026-09-01 10:00:00',
      changes: [
        { type: 'create', category: 'template', summary: '创建模板' }
      ],
      basicInfoSnapshot: {
        templateName: '财务数据补录模板',
        bizDomain: 'FINANCE',
        sourceSystem: 'SAP-FI',
        indicatorCategory: '损益类指标',
        collectFrequency: 'MONTH',
        fillPeriod: 2,
        approvalMode: 2,
      },
      fieldSnapshot: [
        { id: 101, fieldCode: 'org',          fieldName: '组织',       fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, sortOrder: 1 },
        { id: 102, fieldCode: 'period',       fieldName: '账期',       fieldType: 'DATE',        isRequired: 1, isSensitive: 0, sortOrder: 2 },
        { id: 103, fieldCode: 'account_code', fieldName: '科目编码',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, sortOrder: 3 },
        { id: 104, fieldCode: 'account_name', fieldName: '科目名称',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, sortOrder: 4 },
        { id: 105, fieldCode: 'debit',        fieldName: '借方金额',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 0, sortOrder: 5 },
        { id: 106, fieldCode: 'credit',       fieldName: '贷方金额',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 0, sortOrder: 6 },
      ],
      ruleSnapshot: [
        { id: 1, ruleCode: 'R001', ruleName: '借贷平衡校验', ruleType: 'BALANCE', ruleDesc: '同一账期内借方金额合计必须等于贷方金额合计' },
      ]
    },
    {
      id: 2,
      templateId: 1,
      versionNo: 2,
      createBy: '王建国',
      createTime: '2026-09-20 14:00:00',
      changes: [
        { type: 'add', category: 'field', fieldName: '币种', detail: '新增字段，类型：下拉枚举' },
        { type: 'add', category: 'rule', ruleName: '币种必填校验', detail: '新增规则' }
      ],
      basicInfoSnapshot: {
        templateName: '财务数据补录模板',
        bizDomain: 'FINANCE',
        sourceSystem: 'SAP-FI',
        indicatorCategory: '损益类指标',
        collectFrequency: 'MONTH',
        fillPeriod: 2,
        approvalMode: 2,
      },
      fieldSnapshot: [
        { id: 101, fieldCode: 'org',          fieldName: '组织',       fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, sortOrder: 1 },
        { id: 102, fieldCode: 'period',       fieldName: '账期',       fieldType: 'DATE',        isRequired: 1, isSensitive: 0, sortOrder: 2 },
        { id: 103, fieldCode: 'account_code', fieldName: '科目编码',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, sortOrder: 3 },
        { id: 104, fieldCode: 'account_name', fieldName: '科目名称',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, sortOrder: 4 },
        { id: 107, fieldCode: 'currency',     fieldName: '币种',       fieldType: 'ENUM',        isRequired: 0, isSensitive: 0, sortOrder: 5 },
        { id: 105, fieldCode: 'debit',        fieldName: '借方金额',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 0, sortOrder: 6 },
        { id: 106, fieldCode: 'credit',       fieldName: '贷方金额',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 0, sortOrder: 7 },
      ],
      ruleSnapshot: [
        { id: 1, ruleCode: 'R001', ruleName: '借贷平衡校验', ruleType: 'BALANCE', ruleDesc: '同一账期内借方金额合计必须等于贷方金额合计' },
        { id: 2, ruleCode: 'R002', ruleName: '币种必填校验', ruleType: 'FORMAT', ruleDesc: '币种字段不能为空' },
      ]
    },
    {
      id: 3,
      templateId: 1,
      versionNo: 3,
      createBy: '王建国',
      createTime: '2026-10-10 14:30:00',
      changes: [
        { type: 'modify', category: 'basic', fieldName: '填报周期', detail: '从 T-1 修改为 T-2' },
        { type: 'modify', category: 'field', fieldName: '借方金额', detail: '设置为敏感字段' },
        { type: 'modify', category: 'field', fieldName: '贷方金额', detail: '设置为敏感字段' }
      ],
      basicInfoSnapshot: {
        templateName: '财务数据补录模板',
        bizDomain: 'FINANCE',
        sourceSystem: 'SAP-FI',
        indicatorCategory: '损益类指标',
        collectFrequency: 'MONTH',
        fillPeriod: 2,
        approvalMode: 2,
      },
      fieldSnapshot: [
        { id: 101, fieldCode: 'org',          fieldName: '组织',       fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, sortOrder: 1 },
        { id: 102, fieldCode: 'period',       fieldName: '账期',       fieldType: 'DATE',        isRequired: 1, isSensitive: 0, sortOrder: 2 },
        { id: 103, fieldCode: 'account_code', fieldName: '科目编码',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, sortOrder: 3 },
        { id: 104, fieldCode: 'account_name', fieldName: '科目名称',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, sortOrder: 4 },
        { id: 107, fieldCode: 'currency',     fieldName: '币种',       fieldType: 'ENUM',        isRequired: 0, isSensitive: 0, sortOrder: 5 },
        { id: 105, fieldCode: 'debit',        fieldName: '借方金额',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 1, sortOrder: 6 },
        { id: 106, fieldCode: 'credit',       fieldName: '贷方金额',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 1, sortOrder: 7 },
      ],
      ruleSnapshot: [
        { id: 1, ruleCode: 'R001', ruleName: '借贷平衡校验', ruleType: 'BALANCE', ruleDesc: '同一账期内借方金额合计必须等于贷方金额合计' },
        { id: 2, ruleCode: 'R002', ruleName: '币种必填校验', ruleType: 'FORMAT', ruleDesc: '币种字段不能为空' },
      ]
    },
  ],
  2: [
    {
      id: 4,
      templateId: 2,
      versionNo: 1,
      createBy: '王建国',
      createTime: '2026-09-15 09:00:00',
      changes: [
        { type: 'create', category: 'template', summary: '创建模板' }
      ],
      basicInfoSnapshot: {
        templateName: '生产月度产量补录模板',
        bizDomain: 'PRODUCTION',
        sourceSystem: 'MES',
        indicatorCategory: '产量类指标',
        collectFrequency: 'MONTH',
        fillPeriod: 1,
        approvalMode: 1,
      },
      fieldSnapshot: [
        { id: 201, fieldCode: 'factory',      fieldName: '工厂代码',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, sortOrder: 1 },
        { id: 202, fieldCode: 'period',       fieldName: '生产月份',   fieldType: 'DATE',        isRequired: 1, isSensitive: 0, sortOrder: 2 },
        { id: 203, fieldCode: 'model',        fieldName: '车型代码',   fieldType: 'TEXT',        isRequired: 1, isSensitive: 0, sortOrder: 3 },
        { id: 204, fieldCode: 'plan_qty',     fieldName: '计划产量',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 0, sortOrder: 4 },
        { id: 205, fieldCode: 'actual_qty',   fieldName: '实际产量',   fieldType: 'NUMBER',      isRequired: 1, isSensitive: 0, sortOrder: 5 },
      ],
      ruleSnapshot: []
    },
  ],
}

// 下发记录
export const mockDistributions = [
  { id: 1, templateId: 1, templateName: '财务数据补录模板', templateVersion: 3, targetOrgCode: 'UNIT_CA', targetOrgName: '长安乘用车',  deadlineDate: '2026-11-30', distStatus: 1, receivedTime: '2026-09-05 11:00:00', createBy: '王建国', createTime: '2026-09-05 10:30:00' },
  { id: 2, templateId: 1, templateName: '财务数据补录模板', templateVersion: 3, targetOrgCode: 'UNIT_CS', targetOrgName: '长安商用车',  deadlineDate: '2026-11-30', distStatus: 1, receivedTime: '2026-09-05 15:00:00', createBy: '王建国', createTime: '2026-09-05 10:30:00' },
  { id: 3, templateId: 1, templateName: '财务数据补录模板', templateVersion: 3, targetOrgCode: 'UNIT_KS', targetOrgName: '长安跨越',    deadlineDate: '2026-11-30', distStatus: 0, receivedTime: null,                  createBy: '王建国', createTime: '2026-09-05 10:30:00' },
  { id: 4, templateId: 2, templateName: '生产月度产量补录模板', templateVersion: 1, targetOrgCode: 'UNIT_CA', targetOrgName: '长安乘用车', deadlineDate: '2026-11-15', distStatus: 1, receivedTime: '2026-09-16 09:30:00', createBy: '王建国', createTime: '2026-09-15 15:00:00' },
  { id: 5, templateId: 2, templateName: '生产月度产量补录模板', templateVersion: 1, targetOrgCode: 'UNIT_EV', targetOrgName: '阿维塔科技', deadlineDate: '2026-11-15', distStatus: 1, receivedTime: '2026-09-16 10:00:00', createBy: '王建国', createTime: '2026-09-15 15:00:00' },
  { id: 6, templateId: 3, templateName: '成本费用补录模板', templateVersion: 2, targetOrgCode: 'UNIT_CA', targetOrgName: '长安乘用车',  deadlineDate: '2026-11-30', distStatus: 1, receivedTime: '2026-10-02 09:00:00', createBy: '王建国', createTime: '2026-10-01 16:00:00' },
  { id: 7, templateId: 3, templateName: '成本费用补录模板', templateVersion: 2, targetOrgCode: 'UNIT_CS', targetOrgName: '长安商用车',  deadlineDate: '2026-11-30', distStatus: 1, receivedTime: '2026-10-02 10:00:00', createBy: '王建国', createTime: '2026-10-01 16:00:00' },
  { id: 8, templateId: 3, templateName: '成本费用补录模板', templateVersion: 2, targetOrgCode: 'UNIT_KS', targetOrgName: '长安跨越',    deadlineDate: '2026-11-30', distStatus: 1, receivedTime: '2026-10-02 11:00:00', createBy: '王建国', createTime: '2026-10-01 16:00:00' },
  { id: 9, templateId: 5, templateName: '财务数据补录模板  ', templateVersion: 3, targetOrgCode: 'UNIT_CA', targetOrgName: '长安乘用车', deadlineDate: '2026-11-30', distStatus: 1, receivedTime: '2026-09-06 09:00:00', createBy: '王建国', createTime: '2026-09-05 16:00:00' },
]
