import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const ROLES = {
  GROUP_ADMIN: { key: 'GROUP_ADMIN', label: '集团管理员', orgCode: 'GROUP', orgName: '长安汽车集团', userId: 'u001' },
  UNIT_ADMIN:  { key: 'UNIT_ADMIN',  label: '单位管理员', orgCode: 'UNIT_CA', orgName: '长安乘用车', userId: 'u002' },
  REPORTER:    { key: 'REPORTER',    label: '填报人', orgCode: 'UNIT_CA', orgName: '长安乘用车', userId: 'u010' },
}

export const useUserStore = defineStore('user', () => {
  const currentRole = ref(ROLES.GROUP_ADMIN)

  function switchRole(roleKey) {
    currentRole.value = ROLES[roleKey]
  }

  const isGroupAdmin = computed(() => currentRole.value.key === 'GROUP_ADMIN')
  const isUnitAdmin  = computed(() => currentRole.value.key === 'UNIT_ADMIN')
  const isReporter   = computed(() => currentRole.value.key === 'REPORTER')

  const canManageTemplate = computed(() => isGroupAdmin.value || isUnitAdmin.value)
  const canDistribute     = computed(() => isGroupAdmin.value)
  const canFill           = computed(() => isReporter.value)
  const canApprove        = computed(() => isUnitAdmin.value)
  const canViewDashboard  = computed(() => isGroupAdmin.value || isUnitAdmin.value)

  const userId = computed(() => currentRole.value.userId)

  return {
    currentRole,
    switchRole,
    userId,
    isGroupAdmin, isUnitAdmin, isReporter,
    canManageTemplate, canDistribute, canFill, canApprove, canViewDashboard,
  }
})
