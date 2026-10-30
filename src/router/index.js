import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const routes = [
  { path: '/', redirect: '/template/list' },
  {
    path: '/template/group-manage',
    name: 'TemplateGroupManage',
    component: () => import('../views/template/TemplateGroupManage.vue'),
    meta: { title: '模板分组管理', roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
  },
  {
    path: '/template/list',
    name: 'TemplateList',
    component: () => import('../views/template/TemplateList.vue'),
    meta: { title: '模板管理', roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
  },
  {
    path: '/template/edit/:id',
    name: 'TemplateEdit',
    component: () => import('../views/template/TemplateEdit.vue'),
    meta: { title: '模板配置', roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
  },
  {
    path: '/template/fill-status/:id',
    name: 'TemplateFillStatus',
    component: () => import('../views/template/TemplateFillStatus.vue'),
    meta: { title: '填报情况监控', roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
  },
  {
    path: '/template/permission',
    name: 'TemplatePermission',
    component: () => import('../views/template/TemplatePermission.vue'),
    meta: { title: '跨组织模板查看申请', roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
  },
  {
    path: '/document/export-approval',
    name: 'ExportApproval',
    component: () => import('../views/document/ExportApproval.vue'),
    meta: { title: '敏感数据导出审批', roles: ['GROUP_ADMIN', 'UNIT_ADMIN', 'REPORTER'] },
  },
  {
    path: '/document/list',
    name: 'DocumentList',
    component: () => import('../views/document/DocumentList.vue'),
    meta: { title: '我的单据', roles: ['GROUP_ADMIN', 'UNIT_ADMIN', 'REPORTER'] },
  },
  {
    path: '/document/create',
    name: 'DocumentCreate',
    component: () => import('../views/document/DocumentCreate.vue'),
    meta: { title: '新建单据', roles: ['UNIT_ADMIN'] },
  },
  {
    path: '/document/create/:id',
    name: 'DocumentCreateEdit',
    component: () => import('../views/document/DocumentCreate.vue'),
    meta: { title: '编辑单据', roles: ['UNIT_ADMIN'] },
  },
  {
    path: '/document/edit/:id',
    name: 'DocumentEdit',
    component: () => import('../views/document/DocumentEdit.vue'),
    meta: { title: '录入单据', roles: ['UNIT_ADMIN', 'REPORTER'] },
  },
  {
    path: '/document/detail/:id',
    name: 'DocumentDetail',
    component: () => import('../views/document/DocumentDetail.vue'),
    meta: { title: '单据详情', roles: ['GROUP_ADMIN', 'UNIT_ADMIN', 'REPORTER'] },
  },
  {
    path: '/approval/list',
    name: 'ApprovalList',
    component: () => import('../views/approval/ApprovalList.vue'),
    meta: { title: '单据审批', roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
  },
  {
    path: '/import',
    name: 'ImportTask',
    component: () => import('../views/import/ImportTask.vue'),
    meta: { title: '单据导入管理', roles: ['UNIT_ADMIN', 'REPORTER'] },
  },
  {
    path: '/dashboard',
    name: 'QualityDashboard',
    component: () => import('../views/dashboard/QualityDashboard.vue'),
    meta: { title: '质量看板', roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
  },
  {
    path: '/missing-data',
    name: 'MissingDataMonitor',
    component: () => import('../views/dashboard/MissingDataMonitor.vue'),
    meta: { title: '督办管理', roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
  },
  {
    path: '/audit-log',
    name: 'AuditLog',
    component: () => import('../views/system/AuditLog.vue'),
    meta: { title: '操作日志', roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
  },
  {
    path: '/system/custom-rules',
    name: 'CustomRuleConfig',
    component: () => import('../views/system/CustomRuleConfig.vue'),
    meta: { title: '自定义规则配置', roles: ['GROUP_ADMIN'] },
  },
  {
    path: '/system/approval-flow',
    name: 'ApprovalFlow',
    component: () => import('../views/system/ApprovalFlow.vue'),
    meta: { title: '审批流程管理', roles: ['GROUP_ADMIN'] },
  },
  {
    path: '/system/config',
    name: 'SystemConfig',
    component: () => import('../views/system/SystemConfig.vue'),
    meta: { title: '系统参数配置', roles: ['GROUP_ADMIN'] },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  const allowed = to.meta.roles
  if (allowed && !allowed.includes(userStore.currentRole.key)) {
    // 重定向到该角色有权限的第一个路由
    const first = routes.find(r => !r.meta?.roles || r.meta.roles.includes(userStore.currentRole.key))
    return first ? { name: first.name } : false
  }
})

export default router
