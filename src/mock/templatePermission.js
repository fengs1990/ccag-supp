// 模板查看权限申请相关数据

// 申请状态
export const PERMISSION_STATUS = {
  PENDING: { label: '待审批', type: 'primary' },
  APPROVED: { label: '已通过', type: 'success' },
  REJECTED: { label: '已驳回', type: 'danger' },
  CANCELLED: { label: '已撤销', type: 'info' },
  EXPIRED: { label: '已过期', type: 'info' },
}

// 模板查看权限申请记录
export const mockPermissionApplications = [
  {
    id: 1,
    templateId: 1,
    templateCode: 'TPL-ROLE-001',
    templateName: '【角色审批】财务数据补录',
    templateOrgCode: 'UNIT_CHANGAN',
    templateOrgName: '长安汽车',
    templateOwnerName: '李明华',
    applicantOrgCode: 'UNIT_CHENZHI',
    applicantOrgName: '辰致集团',
    applicantUserId: 'u010',
    applicantUserName: '王芳',
    applyReason: '需要查看长安汽车的财务数据补录模板字段配置和校验规则，用于本单位模板设计参考',
    status: 'APPROVED',
    applyTime: '2026-10-15 10:00:00',
    approveTime: '2026-10-15 14:30:00',
    approverUserId: 'u002',
    approverUserName: '李明华',
    approveComment: '同意查看，请注意仅可查看不可修改',
    validDays: 30, // 有效期天数
    expiryTime: '2026-11-14 14:30:00', // 过期时间
    viewCount: 5, // 查看次数
    lastViewTime: '2026-10-18 09:30:00',
  },
  {
    id: 2,
    templateId: 3,
    templateCode: 'TPL-MANUAL-001',
    templateName: '【手动指定】项目数据补录',
    templateOrgCode: 'UNIT_CHANGAN',
    templateOrgName: '长安汽车',
    templateOwnerName: '张伟',
    applicantOrgCode: 'UNIT_FINANCE',
    applicantOrgName: '财务公司',
    applicantUserId: 'u011',
    applicantUserName: '李强',
    applyReason: '需要参考长安汽车的项目数据补录模板，学习生产域数据采集规范',
    status: 'PENDING',
    applyTime: '2026-10-20 11:20:00',
    approveTime: null,
    approverUserId: null,
    approverUserName: null,
    approveComment: null,
    validDays: null,
    expiryTime: null,
    viewCount: 0,
    lastViewTime: null,
  },
  {
    id: 3,
    templateId: 2,
    templateCode: 'TPL-FIXED-001',
    templateName: '【固定审批】重要财务数据补录',
    templateOrgCode: 'UNIT_FINANCE',
    templateOrgName: '财务公司',
    templateOwnerName: '赵刚',
    applicantOrgCode: 'UNIT_CAFC',
    applicantOrgName: '长安汽车金融',
    applicantUserId: 'u010',
    applicantUserName: '王丽',
    applyReason: '需要参考财务公司的重要财务数据采集口径，对比两个单位的数据标准',
    status: 'REJECTED',
    applyTime: '2026-10-18 15:00:00',
    approveTime: '2026-10-19 09:00:00',
    approverUserId: 'u015',
    approverUserName: '赵刚',
    approveComment: '该模板涉及本单位敏感财务指标，暂不对外开放查看权限',
    validDays: null,
    expiryTime: null,
    viewCount: 0,
    lastViewTime: null,
  },
  {
    id: 4,
    templateId: 4,
    templateCode: 'TPL-MIX-001',
    templateName: '【混合审批】供应链数据补录',
    templateOrgCode: 'UNIT_MINSHENG',
    templateOrgName: '长安民生物流',
    templateOwnerName: '刘芳',
    applicantOrgCode: 'UNIT_WANYOU',
    applicantOrgName: '万友汽车',
    applicantUserId: 'u012',
    applicantUserName: '赵敏',
    applyReason: '需要了解长安民生物流的供应链数据采集的字段定义和业务规则，用于供应商数据对接',
    status: 'APPROVED',
    applyTime: '2026-10-16 14:00:00',
    approveTime: '2026-10-17 10:00:00',
    approverUserId: 'u005',
    approverUserName: '刘芳',
    approveComment: '同意查看，有问题随时沟通。建议重点关注供应商编码和物料分类字段',
    validDays: 60, // 有效期60天
    expiryTime: '2026-12-16 10:00:00',
    viewCount: 3,
    lastViewTime: '2026-10-19 16:00:00',
  },
  {
    id: 5,
    templateId: 5,
    templateCode: 'TPL-PROD-001',
    templateName: '生产月报数据补录',
    templateOrgCode: 'UNIT_CHANGAN',
    templateOrgName: '长安汽车',
    templateOwnerName: '孙强',
    applicantOrgCode: 'UNIT_CHENZHI',
    applicantOrgName: '辰致集团',
    applicantUserId: 'u010',
    applicantUserName: '王芳',
    applyReason: '长安汽车的生产月报模板设计得很完善，希望学习借鉴其字段设计和校验规则',
    status: 'EXPIRED', // 已过期
    applyTime: '2026-10-14 09:00:00',
    approveTime: '2026-10-14 16:00:00',
    approverUserId: 'u020',
    approverUserName: '孙强',
    approveComment: '欢迎参考，我们这个模板经过多次迭代优化，字段设计比较成熟',
    validDays: 7, // 仅7天有效期
    expiryTime: '2026-10-21 16:00:00', // 已过期
    viewCount: 8,
    lastViewTime: '2026-10-20 11:00:00',
  },
]

// 我的申请记录（当前登录用户）
export function getMyApplications(userId) {
  return mockPermissionApplications.filter(a => a.applicantUserId === userId)
}

// 单据审批的申请（我是模板负责人）
export function getPendingApprovals(userId) {
  // 根据userId查找其负责的模板，然后找到这些模板的待审批申请
  // 这里简化处理，返回所有待审批的
  return mockPermissionApplications.filter(a => a.status === 'PENDING')
}

// 检查用户是否有模板查看权限
export function hasTemplateViewPermission(userId, templateId) {
  const approval = mockPermissionApplications.find(
    a => a.applicantUserId === userId &&
         a.templateId === templateId &&
         a.status === 'APPROVED'
  )
  if (!approval) return false

  // 检查是否过期
  if (approval.expiryTime) {
    const now = new Date()
    const expiryDate = new Date(approval.expiryTime)
    if (now > expiryDate) {
      // 自动更新状态为已过期
      approval.status = 'EXPIRED'
      return false
    }
  }

  return true
}

// 检查权限是否即将过期（7天内）
export function isPermissionExpiringSoon(approval) {
  if (!approval.expiryTime || approval.status !== 'APPROVED') return false

  const now = new Date()
  const expiryDate = new Date(approval.expiryTime)
  const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))

  return daysRemaining > 0 && daysRemaining <= 7
}

// 获取剩余天数
export function getRemainingDays(expiryTime) {
  if (!expiryTime) return null

  const now = new Date()
  const expiryDate = new Date(expiryTime)
  const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))

  return daysRemaining > 0 ? daysRemaining : 0
}
