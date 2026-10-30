// 组织机构
export const orgs = [
  { orgCode: 'GROUP',           orgName: '中国长安' },
  { orgCode: 'UNIT_CHANGAN',    orgName: '长安汽车' },
  { orgCode: 'UNIT_CHENZHI',    orgName: '辰致集团' },
  { orgCode: 'UNIT_FINANCE',    orgName: '财务公司' },
  { orgCode: 'UNIT_CAFC',       orgName: '长安汽车金融' },
  { orgCode: 'UNIT_WANYOU',     orgName: '万友汽车' },
  { orgCode: 'UNIT_MINSHENG',   orgName: '长安民生物流' },
]

// 组织下的人员列表（用于模板下发时选择接收人）
export const orgUsers = {
  'UNIT_CHANGAN': [
    { userId: 'u101', userName: '张三', userAccount: 'zhangsan', position: '财务经理' },
    { userId: 'u102', userName: '李四', userAccount: 'lisi', position: '数据专员' },
    { userId: 'u103', userName: '王五', userAccount: 'wangwu', position: '财务主管' },
  ],
  'UNIT_CHENZHI': [
    { userId: 'u201', userName: '赵六', userAccount: 'zhaoliu', position: '财务经理' },
    { userId: 'u202', userName: '孙七', userAccount: 'sunqi', position: '数据专员' },
  ],
  'UNIT_FINANCE': [
    { userId: 'u301', userName: '周八', userAccount: 'zhouba', position: '财务总监' },
    { userId: 'u302', userName: '吴九', userAccount: 'wujiu', position: '会计主管' },
    { userId: 'u303', userName: '郑十', userAccount: 'zhengshi', position: '数据专员' },
  ],
  'UNIT_CAFC': [
    { userId: 'u401', userName: '冯一', userAccount: 'fengyi', position: '财务经理' },
    { userId: 'u402', userName: '陈二', userAccount: 'chener', position: '数据专员' },
  ],
  'UNIT_WANYOU': [
    { userId: 'u501', userName: '褚三', userAccount: 'chusan', position: '财务负责人' },
    { userId: 'u502', userName: '卫四', userAccount: 'weisi', position: '数据录入员' },
  ],
  'UNIT_MINSHENG': [
    { userId: 'u601', userName: '蒋五', userAccount: 'jiangwu', position: '财务主管' },
    { userId: 'u602', userName: '沈六', userAccount: 'shenliu', position: '数据专员' },
    { userId: 'u603', userName: '韩七', userAccount: 'hanqi', position: '会计' },
  ],
}

// 业务域
export const bizDomains = [
  { value: 'FINANCE',     label: '财务域' },
  { value: 'PRODUCTION',  label: '生产域' },
  { value: 'SALES',       label: '销售域' },
  { value: 'SUPPLY',      label: '供应链域' },
]

// 用户列表
export const users = {
  GROUP_ADMIN: { userId: 'u001', userName: '王建国', role: 'GROUP_ADMIN', orgCode: 'GROUP' },
  UNIT_ADMIN:  { userId: 'u002', userName: '李明华', role: 'UNIT_ADMIN',  orgCode: 'UNIT_CA' },
  REPORTER:    { userId: 'u003', userName: '张小红', role: 'REPORTER',    orgCode: 'UNIT_CA' },
}

// 主数据分类及其下参考数据项（用于字段配置中主数据下拉的级联选择）
export const masterDataCategories = [
  {
    value: 'ORG',
    label: '组织机构',
    children: [
      { value: 'ORG_COMPANY',  label: '法人公司' },
      { value: 'ORG_DEPT',     label: '部门' },
      { value: 'ORG_COST_CTR', label: '成本中心' },
      { value: 'ORG_PROFIT_CTR',label: '利润中心' },
    ],
  },
  {
    value: 'MATERIAL',
    label: '物料主数据',
    children: [
      { value: 'MAT_RAW',      label: '原材料' },
      { value: 'MAT_SEMI',     label: '半成品' },
      { value: 'MAT_FINISHED', label: '成品/整车' },
      { value: 'MAT_SPARE',    label: '备品备件' },
    ],
  },
  {
    value: 'VEHICLE',
    label: '车型主数据',
    children: [
      { value: 'VEH_MODEL',    label: '车型' },
      { value: 'VEH_SERIES',   label: '车系' },
      { value: 'VEH_PLATFORM', label: '平台' },
    ],
  },
  {
    value: 'CUSTOMER',
    label: '客户主数据',
    children: [
      { value: 'CUS_DEALER',   label: '经销商' },
      { value: 'CUS_FLEET',    label: '大客户/集团客户' },
      { value: 'CUS_EXPORT',   label: '出口客户' },
    ],
  },
  {
    value: 'VENDOR',
    label: '供应商主数据',
    children: [
      { value: 'VEN_DIRECT',   label: '直接材料供应商' },
      { value: 'VEN_INDIRECT', label: '间接材料供应商' },
      { value: 'VEN_SERVICE',  label: '服务类供应商' },
    ],
  },
  {
    value: 'FINANCE',
    label: '财务主数据',
    children: [
      { value: 'FIN_ACCOUNT',  label: '科目' },
      { value: 'FIN_CURRENCY', label: '币种' },
      { value: 'FIN_PERIOD',   label: '会计期间' },
      { value: 'FIN_PLANT',    label: '工厂/生产基地' },
    ],
  },
  {
    value: 'HR',
    label: '人力资源主数据',
    children: [
      { value: 'HR_EMPLOYEE',  label: '员工' },
      { value: 'HR_POSITION',  label: '岗位' },
      { value: 'HR_JOB_GRADE', label: '职级' },
    ],
  },
]

