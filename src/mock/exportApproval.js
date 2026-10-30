// 敏感数据导出审批相关数据

// 审批状态
export const EXPORT_APPROVAL_STATUS = {
  PENDING: { label: '待审批', type: 'primary' },
  APPROVED: { label: '已通过', type: 'success' },
  REJECTED: { label: '已驳回', type: 'danger' },
  CANCELLED: { label: '已撤销', type: 'info' },
  EXPIRED: { label: '已过期', type: 'info' },
}

// 导出审批申请记录
export const mockExportApprovals = [
  {
    id: 1,
    docId: 1001,
    docNo: 'DOC-2026-001001',
    docName: '【角色审批】2026年9月财务数据补录',
    templateId: 1,
    templateName: '【角色审批】财务数据补录',
    templateOrgCode: 'UNIT_CHANGAN',
    templateOrgName: '长安汽车',
    templateOwnerName: '李明华',
    applicantOrgCode: 'UNIT_CHANGAN',
    applicantOrgName: '长安汽车',
    applicantUserId: 'u010',
    applicantUserName: '王芳',
    exportReason: '需要导出9月财务数据用于年度审计，包含敏感字段：银行账号、纳税人识别号',
    sensitiveFields: ['bank_account', 'tax_id'], // 敏感字段编码
    sensitiveFieldNames: ['银行账号', '纳税人识别号'], // 敏感字段名称
    exportFormat: 'EXCEL', // EXCEL, CSV
    exportRowCount: 120,
    status: 'APPROVED',
    applyTime: '2026-10-20 09:00:00',
    approveTime: '2026-10-20 10:30:00',
    approverUserId: 'u002',
    approverUserName: '李明华',
    approveComment: '审计需要，同意导出。请妥善保管导出文件，不得外传',
    expiryTime: '2026-10-21 10:30:00', // 审批有效期（24小时）
    exportTime: '2026-10-20 11:00:00', // 实际导出时间
    exportByUserId: 'u010',
    exportByUserName: '王芳',
  },
  {
    id: 2,
    docId: 1002,
    docNo: 'DOC-2026-001002',
    docName: '【固定审批】2026年8月重要财务数据补录',
    templateId: 2,
    templateName: '【固定审批】重要财务数据补录',
    templateOrgCode: 'UNIT_FINANCE',
    templateOrgName: '财务公司',
    templateOwnerName: '赵刚',
    applicantOrgCode: 'UNIT_FINANCE',
    applicantOrgName: '财务公司',
    applicantUserId: 'u011',
    applicantUserName: '李强',
    exportReason: '导出8月重要财务数据用于内部分析',
    sensitiveFields: ['salary', 'bonus', 'social_security'],
    sensitiveFieldNames: ['工资', '奖金', '社保缴费'],
    exportFormat: 'EXCEL',
    exportRowCount: 50,
    status: 'PENDING',
    applyTime: '2026-10-21 14:00:00',
    approveTime: null,
    approverUserId: null,
    approverUserName: null,
    approveComment: null,
    expiryTime: null,
    exportTime: null,
    exportByUserId: null,
    exportByUserName: null,
  },
  {
    id: 3,
    docId: 1003,
    docNo: 'DOC-2026-001003',
    docName: '【手动指定】2026年7月项目数据补录',
    templateId: 3,
    templateName: '【手动指定】项目数据补录',
    templateOrgCode: 'UNIT_CHANGAN',
    templateOrgName: '长安汽车',
    templateOwnerName: '张伟',
    applicantOrgCode: 'UNIT_CHANGAN',
    applicantOrgName: '长安汽车',
    applicantUserId: 'u012',
    applicantUserName: '赵敏',
    exportReason: '需要导出项目数据用于部门汇报',
    sensitiveFields: ['project_budget', 'cost_detail'],
    sensitiveFieldNames: ['项目预算', '成本明细'],
    exportFormat: 'CSV',
    exportRowCount: 80,
    status: 'REJECTED',
    applyTime: '2026-10-19 16:00:00',
    approveTime: '2026-10-20 09:00:00',
    approverUserId: 'u003',
    approverUserName: '张伟',
    approveComment: '部门汇报不需要导出明细数据，建议使用汇总报表',
    expiryTime: null,
    exportTime: null,
    exportByUserId: null,
    exportByUserName: null,
  },
  {
    id: 4,
    docId: 1001,
    docNo: 'DOC-2026-001001',
    docName: '【角色审批】2026年9月财务数据补录',
    templateId: 1,
    templateName: '【角色审批】财务数据补录',
    templateOrgCode: 'UNIT_CHANGAN',
    templateOrgName: '长安汽车',
    templateOwnerName: '李明华',
    applicantOrgCode: 'UNIT_CHANGAN',
    applicantOrgName: '长安汽车',
    applicantUserId: 'u010',
    applicantUserName: '王芳',
    exportReason: '导出数据用于对账',
    sensitiveFields: ['bank_account'],
    sensitiveFieldNames: ['银行账号'],
    exportFormat: 'EXCEL',
    exportRowCount: 120,
    status: 'EXPIRED',
    applyTime: '2026-10-18 10:00:00',
    approveTime: '2026-10-18 11:00:00',
    approverUserId: 'u002',
    approverUserName: '李明华',
    approveComment: '同意导出',
    expiryTime: '2026-10-19 11:00:00', // 已过期
    exportTime: null,
    exportByUserId: null,
    exportByUserName: null,
  },
  {
    id: 5,
    docId: 1005,
    docNo: 'DOC-2026-001005',
    docName: '生产月报数据补录',
    templateId: 5,
    templateName: '生产月报数据补录',
    templateOrgCode: 'UNIT_CHANGAN',
    templateOrgName: '长安汽车',
    templateOwnerName: '孙强',
    applicantOrgCode: 'UNIT_CHENZHI',
    applicantOrgName: '辰致集团',
    applicantUserId: 'u010',
    applicantUserName: '王芳',
    exportReason: '需要导出生产月报数据用于集团年度经营分析，包含敏感的销售金额字段',
    sensitiveFields: ['sales_amount'],
    sensitiveFieldNames: ['销售金额'],
    exportFormat: 'EXCEL',
    exportRowCount: 85,
    status: 'PENDING',
    applyTime: '2026-10-22 09:30:00',
    approveTime: null,
    approverUserId: null,
    approverUserName: null,
    approveComment: null,
    expiryTime: null,
    exportTime: null,
    exportByUserId: null,
    exportByUserName: null,
  },
  {
    id: 6,
    docId: 1005,
    docNo: 'DOC-2026-001005',
    docName: '生产月报数据补录',
    templateId: 5,
    templateName: '生产月报数据补录',
    templateOrgCode: 'UNIT_CHANGAN',
    templateOrgName: '长安汽车',
    templateOwnerName: '孙强',
    applicantOrgCode: 'UNIT_CA',
    applicantOrgName: '长安乘用车',
    applicantUserId: 'u002',
    applicantUserName: '单位管理员',
    exportReason: '需要导出长安汽车的生产月报数据用于内部分析和对比，数据包含敏感的销售金额字段',
    sensitiveFields: ['sales_amount'],
    sensitiveFieldNames: ['销售金额'],
    exportFormat: 'CSV',
    exportRowCount: 85,
    status: 'PENDING',
    applyTime: '2026-10-22 10:15:00',
    approveTime: null,
    approverUserId: null,
    approverUserName: null,
    approveComment: null,
    expiryTime: null,
    exportTime: null,
    exportByUserId: null,
    exportByUserName: null,
  },
]

// 获取我的申请记录
export function getMyExportApprovals(userId) {
  return mockExportApprovals.filter(a => a.applicantUserId === userId)
}

// 获取单据审批的申请
export function getPendingExportApprovals(userId) {
  // 简化处理：返回所有待审批的
  return mockExportApprovals.filter(a => a.status === 'PENDING')
}

// 检查审批是否有效（未过期且已通过）
export function isExportApprovalValid(approval) {
  if (approval.status !== 'APPROVED') return false
  if (!approval.expiryTime) return false
  return new Date(approval.expiryTime) > new Date()
}

// 检查单据是否有敏感字段
export function hasClassifiedFields(templateId, fieldCodes) {
  // 这里应该从模板配置中读取，简化处理
  // 实际应该检查 mockTemplateFields 中 isSensitive 标记
  return fieldCodes && fieldCodes.length > 0
}
