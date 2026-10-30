<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { mockMessages, MESSAGE_TYPES, MESSAGE_PRIORITY } from '../mock/message.js'

const router = useRouter()

const messages = ref([...mockMessages])
const drawerVisible = ref(false)
const filterForm = ref({
  type: '',
  read: '', // unread/read
})
const activeFilter = ref({ ...filterForm.value })

// 未读消息数量
const unreadCount = computed(() => {
  return messages.value.filter(m => m.isRead === 0).length
})

// 筛选后的消息
const filteredMessages = computed(() => {
  let list = messages.value
  if (activeFilter.value.type) {
    list = list.filter(m => m.type === activeFilter.value.type)
  }
  if (activeFilter.value.read === 'unread') {
    list = list.filter(m => m.isRead === 0)
  } else if (activeFilter.value.read === 'read') {
    list = list.filter(m => m.isRead === 1)
  }
  return list.sort((a, b) => new Date(b.sendTime) - new Date(a.sendTime))
})

function doSearch() {
  activeFilter.value = { ...filterForm.value }
}

// 最近5条消息
const recentMessages = computed(() => {
  return messages.value
    .sort((a, b) => new Date(b.sendTime) - new Date(a.sendTime))
    .slice(0, 5)
})

function openDrawer() {
  drawerVisible.value = true
}

function markAsRead(msg) {
  if (msg.isRead === 0) {
    msg.isRead = 1
    msg.readTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
}

function markAllAsRead() {
  messages.value.forEach(m => {
    if (m.isRead === 0) {
      m.isRead = 1
      m.readTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    }
  })
  ElMessage.success('已全部标记为已读')
}

function handleMessageClick(msg) {
  markAsRead(msg)

  // 根据关联类型跳转
  if (msg.relatedType === 'TEMPLATE' && msg.relatedId) {
    router.push({ path: '/template/list' })
  } else if (msg.relatedType === 'DOCUMENT' && msg.relatedId) {
    router.push({ path: `/document/detail/${msg.relatedId}` })
  } else if (msg.relatedType === 'MISSING_DATA') {
    router.push({ path: '/missing-data' })
  }

  drawerVisible.value = false
}

function getMessageIcon(type) {
  return MESSAGE_TYPES[type]?.icon || 'Message'
}

function getMessageColor(type) {
  return MESSAGE_TYPES[type]?.color || '#999'
}

function getPriorityType(priority) {
  return MESSAGE_PRIORITY[priority]?.type || 'info'
}
</script>

<template>
  <div class="message-center">
    <!-- 消息铃铛图标 -->
    <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
      <el-button :icon="'Bell'" circle @click="openDrawer" />
    </el-badge>

    <!-- 消息抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="站内消息"
      size="600px"
      :close-on-click-modal="false"
    >
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
          <span style="font-weight:600;font-size:16px">站内消息</span>
          <el-button
            v-if="unreadCount > 0"
            link
            type="primary"
            size="small"
            @click="markAllAsRead"
          >
            全部已读
          </el-button>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div style="margin-bottom:16px">
        <el-form inline size="small">
          <el-form-item label="类型">
            <el-select v-model="filterForm.type" placeholder="全部" clearable style="width:160px">
              <el-option
                v-for="(config, key) in MESSAGE_TYPES"
                :key="key"
                :label="config.label"
                :value="key"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filterForm.read" placeholder="全部" clearable style="width:100px">
              <el-option label="未读" value="unread" />
              <el-option label="已读" value="read" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" :icon="'Search'" @click="doSearch">查询</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 消息列表 -->
      <div class="message-list">
        <div
          v-for="msg in filteredMessages"
          :key="msg.id"
          class="message-item"
          :class="{ unread: msg.isRead === 0 }"
          @click="handleMessageClick(msg)"
        >
          <div class="message-header">
            <div style="display:flex;align-items:center;gap:8px">
              <el-icon :color="getMessageColor(msg.type)" :size="18">
                <component :is="getMessageIcon(msg.type)" />
              </el-icon>
              <span class="message-title">{{ msg.title }}</span>
            </div>
            <el-tag
              v-if="MESSAGE_PRIORITY[msg.priority]"
              :type="getPriorityType(msg.priority)"
              size="small"
              effect="plain"
            >
              {{ MESSAGE_PRIORITY[msg.priority].label }}
            </el-tag>
          </div>
          <div class="message-content">{{ msg.content }}</div>
          <div class="message-footer">
            <span class="message-sender">{{ msg.sender }}</span>
            <span class="message-time">{{ msg.sendTime }}</span>
          </div>
          <div v-if="msg.isRead === 0" class="unread-indicator" />
        </div>

        <el-empty
          v-if="filteredMessages.length === 0"
          description="暂无消息"
          :image-size="80"
        />
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.message-center {
  display: inline-block;
}

.message-list {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.message-item {
  position: relative;
  padding: 16px;
  margin-bottom: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.message-item:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.message-item.unread {
  background: #fff;
  border: 1px solid #1677ff;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.message-content {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
}

.message-sender {
  font-weight: 500;
}

.unread-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  background: #ff4d4f;
  border-radius: 50%;
}
</style>
