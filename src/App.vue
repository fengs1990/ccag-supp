<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore, ROLES } from './stores/user.js'
import MessageCenter from './components/MessageCenter.vue'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const rolePickerVisible = ref(false)

const roleColors = {
  GROUP_ADMIN: '#722ed1',
  UNIT_ADMIN:  '#1677ff',
  REPORTER:    '#52c41a',
}

const roleTagTypes = {
  GROUP_ADMIN: 'danger',
  UNIT_ADMIN:  'primary',
  REPORTER:    'success',
}

const roleTagType = computed(() => roleTagTypes[userStore.currentRole.key] || 'info')

const menuItems = computed(() => {
  const role = userStore.currentRole.key
  const all = [
    { path: '/template/group-manage', icon: 'FolderOpened', title: '模板分组管理', roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
    { path: '/template/list', icon: 'Document',     title: '模板管理',  roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
    { path: '/document/list', icon: 'Tickets',      title: '单据管理',  roles: ['GROUP_ADMIN', 'UNIT_ADMIN', 'REPORTER'] },
    { path: '/approval/list', icon: 'CircleCheck',  title: '单据审批',  roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
    { path: '/import',        icon: 'Upload',       title: '单据导入管理', roles: ['UNIT_ADMIN', 'REPORTER'] },
    { path: '/dashboard',     icon: 'DataAnalysis', title: '质量看板',  roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
    { path: '/missing-data',  icon: 'Bell',         title: '督办管理',  roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
    { path: '/audit-log',     icon: 'Notebook',     title: '操作日志',  roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
    { path: '/system/approval-flow', icon: 'Share', title: '审批流程管理', roles: ['GROUP_ADMIN'] },
    { path: '/system/custom-rules', icon: 'Operation', title: '自定义规则配置', roles: ['GROUP_ADMIN'] },
    { path: '/system/config', icon: 'Setting', title: '系统参数配置', roles: ['GROUP_ADMIN'] },
    { path: '/template/permission', icon: 'View',   title: '跨组织模板查看申请', roles: ['GROUP_ADMIN', 'UNIT_ADMIN'] },
    { path: '/document/export-approval', icon: 'Lock', title: '敏感数据导出申请', roles: ['GROUP_ADMIN', 'UNIT_ADMIN', 'REPORTER'] },
  ]
  return all.filter(item => item.roles.includes(role))
})

function switchRole(roleKey) {
  userStore.switchRole(roleKey)
  rolePickerVisible.value = false
  const first = menuItems.value[0]
  if (first) router.push(first.path)
}

const activeMenu = computed(() => route.path)
const pageTitle  = computed(() => route.meta?.title || '')
</script>

<template>
  <div class="app-container">
    <aside class="app-sidebar">
      <div class="app-logo">
        <div class="app-logo-icon">补</div>
        <div class="app-logo-text">
          数据补录平台
          <small>长安汽车集团</small>
        </div>
      </div>

      <div class="sidebar-group-title">功能导航</div>

      <el-menu
        :default-active="activeMenu"
        router
        background-color="#001529"
        text-color="rgba(255,255,255,0.65)"
        active-text-color="#fff"
        style="flex:1"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-user" @click="rolePickerVisible = true">
        <el-avatar :size="32" :style="{ background: roleColors[userStore.currentRole.key], flexShrink: 0 }">
          {{ userStore.currentRole.label[0] }}
        </el-avatar>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">{{ userStore.currentRole.label }}</div>
          <div class="sidebar-user-org">{{ userStore.currentRole.orgName }}</div>
        </div>
        <el-icon style="color:rgba(255,255,255,0.3);margin-left:auto"><Switch /></el-icon>
      </div>
    </aside>

    <div class="app-main">
      <header class="app-header">
        <div class="app-header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>数据补录</el-breadcrumb-item>
            <el-breadcrumb-item>{{ pageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="app-header-right">
          <MessageCenter />
          <el-tag :type="roleTagType" effect="light" style="cursor:pointer" @click="rolePickerVisible = true">
            <el-icon style="margin-right:4px"><User /></el-icon>
            {{ userStore.currentRole.label }}
          </el-tag>
          <span style="font-size:13px;color:#666">{{ userStore.currentRole.orgName }}</span>
        </div>
      </header>

      <main class="app-content">
        <router-view />
      </main>
    </div>
  </div>

  <!-- 角色切换弹窗 -->
  <el-dialog v-model="rolePickerVisible" title="切换角色" width="420px">
    <div class="role-picker-list">
      <div
        v-for="(role, key) in ROLES"
        :key="key"
        class="role-picker-item"
        :class="{ active: userStore.currentRole.key === key }"
        @click="switchRole(key)"
      >
        <el-avatar :size="40" :style="{ background: roleColors[key] }">
          {{ role.label[0] }}
        </el-avatar>
        <div class="role-picker-info">
          <div class="role-picker-name">{{ role.label }}</div>
          <div class="role-picker-org">{{ role.orgName }}</div>
        </div>
        <el-icon v-if="userStore.currentRole.key === key" style="color:#1677ff;margin-left:auto"><Select /></el-icon>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.sidebar-user {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  border-top: 1px solid rgba(255,255,255,0.08);
  transition: background 0.2s;
}
.sidebar-user:hover { background: rgba(255,255,255,0.06); }
.sidebar-user-info { min-width: 0; }
.sidebar-user-name { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500; }
.sidebar-user-org  { font-size: 11px; color: rgba(255,255,255,0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.role-picker-list { display: flex; flex-direction: column; gap: 8px; }
.role-picker-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 8px;
  border: 1.5px solid #f0f0f0; cursor: pointer; transition: all 0.2s;
}
.role-picker-item:hover, .role-picker-item.active { border-color: #1677ff; background: #f0f5ff; }
.role-picker-name { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.role-picker-org  { font-size: 12px; color: #888; margin-top: 2px; }
</style>
