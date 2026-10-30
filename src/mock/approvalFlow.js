// 审批流程模板数据

export const mockApprovalFlows = [
  {
    id: 1,
    flowCode: 'FLOW_001',
    flowName: '标准两级审批',
    status: 1,
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '单位管理员审批',
        nodeType: 'ROLE',
        nodeOrder: 1,
        assignType: 'ROLE',
        assignValue: 'UNIT_ADMIN',
        timeoutHours: 24,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP', 'SMS'],
      },
      {
        nodeId: 'node_2',
        nodeName: '集团审核员审批',
        nodeType: 'ROLE',
        nodeOrder: 2,
        assignType: 'ROLE',
        assignValue: 'REVIEWER',
        timeoutHours: 48,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP'],
      }
    ],
    remark: '标准两级审批流程，适用于大部分场景',
    createBy: '系统管理员',
    createTime: '2026-09-01 10:00:00',
    updateTime: '2026-09-01 10:00:00',
  },
  {
    id: 2,
    flowCode: 'FLOW_002',
    flowName: '单级快速审批',
    status: 1,
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '单位管理员审批',
        nodeType: 'ROLE',
        nodeOrder: 1,
        assignType: 'ROLE',
        assignValue: 'UNIT_ADMIN',
        timeoutHours: 24,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP'],
      }
    ],
    remark: '单级审批流程，适用于简单场景',
    createBy: '系统管理员',
    createTime: '2026-09-05 14:00:00',
    updateTime: '2026-09-05 14:00:00',
  },
  {
    id: 3,
    flowCode: 'FLOW_003',
    flowName: '三级严格审批',
    status: 0,
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '单位管理员审批',
        nodeType: 'ROLE',
        nodeOrder: 1,
        assignType: 'ROLE',
        assignValue: 'UNIT_ADMIN',
        timeoutHours: 24,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP', 'SMS'],
      },
      {
        nodeId: 'node_2',
        nodeName: '集团审核员审批',
        nodeType: 'ROLE',
        nodeOrder: 2,
        assignType: 'ROLE',
        assignValue: 'REVIEWER',
        timeoutHours: 48,
        autoPass: false,
        timeoutAction: 'AUTO_PASS',
        reminderTypes: ['IN_APP'],
      },
      {
        nodeId: 'node_3',
        nodeName: '集团管理员终审',
        nodeType: 'ROLE',
        nodeOrder: 3,
        assignType: 'ROLE',
        assignValue: 'GROUP_ADMIN',
        timeoutHours: 72,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP', 'SMS'],
      }
    ],
    remark: '三级审批流程，适用于重要数据（草稿）',
    createBy: '系统管理员',
    createTime: '2026-09-10 09:00:00',
    updateTime: '2026-09-10 09:00:00',
  },
  {
    id: 4,
    flowCode: 'FLOW_004',
    flowName: '混合审批流程',
    status: 1,
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '部门负责人审批',
        nodeType: 'MANUAL_SELECT',
        nodeOrder: 1,
        assignType: 'MANUAL_SELECT',
        assignValue: '',
        timeoutHours: 24,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP', 'SMS'],
      },
      {
        nodeId: 'node_2',
        nodeName: '单位管理员审批',
        nodeType: 'ROLE',
        nodeOrder: 2,
        assignType: 'ROLE',
        assignValue: 'UNIT_ADMIN',
        timeoutHours: 48,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP'],
      }
    ],
    remark: '混合审批流程，第一级手动指定部门负责人，第二级自动分配单位管理员',
    createBy: '系统管理员',
    createTime: '2026-10-22 10:00:00',
    updateTime: '2026-10-22 10:00:00',
  },
  {
    id: 5,
    flowCode: 'FLOW_005',
    flowName: '角色审批流程',
    status: 1,
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '单位管理员审批',
        nodeType: 'ROLE',
        nodeOrder: 1,
        assignType: 'ROLE',
        assignValue: 'UNIT_ADMIN',
        timeoutHours: 24,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP'],
      },
      {
        nodeId: 'node_2',
        nodeName: '集团审核员审批',
        nodeType: 'ROLE',
        nodeOrder: 2,
        assignType: 'ROLE',
        assignValue: 'REVIEWER',
        timeoutHours: 48,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP'],
      }
    ],
    remark: '纯角色审批流程，所有节点都是指定角色类型',
    createBy: '系统管理员',
    createTime: '2026-10-22 11:00:00',
    updateTime: '2026-10-22 11:00:00',
  },
  {
    id: 6,
    flowCode: 'FLOW_006',
    flowName: '固定人员审批流程',
    status: 1,
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '财务总监审批',
        nodeType: 'FIXED_USER',
        nodeOrder: 1,
        assignType: 'FIXED_USER',
        assignValue: 'user001',
        timeoutHours: 24,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP', 'SMS'],
      },
      {
        nodeId: 'node_2',
        nodeName: '质量负责人审批',
        nodeType: 'FIXED_USER',
        nodeOrder: 2,
        assignType: 'FIXED_USER',
        assignValue: 'user003',
        timeoutHours: 48,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP'],
      }
    ],
    remark: '固定人员审批流程，所有节点都是固定审批人',
    createBy: '系统管理员',
    createTime: '2026-10-22 11:30:00',
    updateTime: '2026-10-22 11:30:00',
  },
  {
    id: 7,
    flowCode: 'FLOW_007',
    flowName: '手动指定审批流程',
    status: 1,
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '项目负责人审批',
        nodeType: 'MANUAL_SELECT',
        nodeOrder: 1,
        assignType: 'MANUAL_SELECT',
        assignValue: '',
        timeoutHours: 24,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP'],
      },
      {
        nodeId: 'node_2',
        nodeName: '部门主管审批',
        nodeType: 'MANUAL_SELECT',
        nodeOrder: 2,
        assignType: 'MANUAL_SELECT',
        assignValue: '',
        timeoutHours: 48,
        autoPass: false,
        timeoutAction: 'NOTIFY',
        reminderTypes: ['IN_APP'],
      }
    ],
    remark: '手动指定审批流程，所有节点都需要创建单据时指定审批人',
    createBy: '系统管理员',
    createTime: '2026-10-22 12:00:00',
    updateTime: '2026-10-22 12:00:00',
  },
]

// 角色映射
export const ROLES = {
  GROUP_ADMIN: '集团管理员',
  UNIT_ADMIN: '单位管理员',
  REVIEWER: '审核员',
  REPORTER: '填报人',
}

// 节点类型
export const NODE_TYPES = {
  ROLE: '指定角色',
  FIXED_USER: '固定审批人',
  MANUAL_SELECT: '指定具体审批人',
}

// 超时策略
export const TIMEOUT_ACTION_OPTIONS = {
  NOTIFY: '仅提醒',
  AUTO_PASS: '自动通过',
  AUTO_REJECT: '自动驳回',
}

// 审批人提醒方式
export const REMINDER_TYPES = {
  IN_APP: '站内提醒',
  SMS: '短信提醒',
}

// 流程状态
export const FLOW_STATUS = {
  0: { label: '草稿', type: 'info' },
  1: { label: '已启用', type: 'success' },
  2: { label: '已停用', type: 'danger' },
}

// 审批实例状态
export const APPROVAL_STATUS = {
  PENDING: { label: '待审批', type: 'warning', color: '#fa8c16' },
  APPROVED: { label: '已通过', type: 'success', color: '#52c41a' },
  REJECTED: { label: '已驳回', type: 'danger', color: '#ff4d4f' },
  TIMEOUT: { label: '已超时', type: 'info', color: '#999' },
  WAITING: { label: '等待中', type: 'info', color: '#d9d9d9' },
}
