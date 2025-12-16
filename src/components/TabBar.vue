<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTabsStore } from '@/stores/tabs'
import ContextMenu, { type MenuItem } from './ContextMenu.vue'

const tabsStore = useTabsStore()

const emit = defineEmits<{
  'open-collection-picker': []
}>()

const tabs = computed(() => tabsStore.tabs)
const activeTabId = computed(() => tabsStore.activeTabId)

// Context menu state
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuTabId = ref<string | null>(null)
const isRenaming = ref(false)
const renamingTabId = ref<string | null>(null)
const renameInput = ref('')

const contextMenuItems = computed<MenuItem[]>(() => [
  { id: 'rename', label: 'Rename', shortcut: 'F2' },
  { id: 'duplicate', label: 'Duplicate Tab' },
  { id: 'separator1', label: '', separator: true },
  { id: 'add-to-collection', label: 'Add to Collection...' },
  { id: 'save', label: 'Save Request', shortcut: 'Ctrl+S' },
  { id: 'separator2', label: '', separator: true },
  { id: 'close-others', label: 'Close Other Tabs' },
  { id: 'close-all', label: 'Close All Tabs' },
  { id: 'separator3', label: '', separator: true },
  { id: 'close', label: 'Close Tab', shortcut: 'Ctrl+W', danger: true }
])

function getMethodClass(method: string): string {
  const classes: Record<string, string> = {
    GET: 'text-emerald-600 dark:text-emerald-400',
    POST: 'text-blue-600 dark:text-blue-400',
    PUT: 'text-amber-600 dark:text-amber-400',
    PATCH: 'text-orange-600 dark:text-orange-400',
    DELETE: 'text-red-600 dark:text-red-400',
    OPTIONS: 'text-purple-600 dark:text-purple-400',
    GQL: 'text-pink-600 dark:text-pink-400',
    WS: 'text-indigo-600 dark:text-indigo-400'
  }
  return classes[method] || 'text-emerald-600'
}

function handleMiddleClick(e: MouseEvent, tabId: string) {
  if (e.button === 1) {
    e.preventDefault()
    tabsStore.closeTab(tabId)
  }
}

function handleContextMenu(e: MouseEvent, tabId: string) {
  e.preventDefault()
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  contextMenuTabId.value = tabId
  showContextMenu.value = true
}

function handleContextMenuSelect(actionId: string) {
  if (!contextMenuTabId.value) return
  
  const tabId = contextMenuTabId.value
  
  switch (actionId) {
    case 'rename':
      startRename(tabId)
      break
    case 'duplicate':
      tabsStore.duplicateTab(tabId)
      break
    case 'add-to-collection':
      addToCollection(tabId)
      break
    case 'save':
      saveRequest(tabId)
      break
    case 'close-others':
      tabsStore.closeOtherTabs(tabId)
      break
    case 'close-all':
      tabsStore.closeAllTabs()
      break
    case 'close':
      tabsStore.closeTab(tabId)
      break
  }
}

function startRename(tabId: string) {
  const tab = tabs.value.find(t => t.id === tabId)
  if (tab) {
    renamingTabId.value = tabId
    renameInput.value = tab.request.name || 'New Request'
    isRenaming.value = true
  }
}

function finishRename() {
  if (renamingTabId.value && renameInput.value.trim()) {
    tabsStore.updateRequest(renamingTabId.value, { name: renameInput.value.trim() })
  }
  isRenaming.value = false
  renamingTabId.value = null
  renameInput.value = ''
}

function cancelRename() {
  isRenaming.value = false
  renamingTabId.value = null
  renameInput.value = ''
}

function addToCollection(tabId: string) {
  // First activate the tab so the collection picker saves the right request
  tabsStore.setActiveTab(tabId)
  // Open the collection picker modal
  emit('open-collection-picker')
}

function saveRequest(tabId: string) {
  // First activate the tab so the collection picker saves the right request
  tabsStore.setActiveTab(tabId)
  // Open the collection picker modal
  emit('open-collection-picker')
}

function getTabDisplayMethod(tab: typeof tabs.value[0]): string {
  if (tab.requestType === 'graphql') return 'GQL'
  if (tab.requestType === 'websocket') return 'WS'
  return tab.request.method.slice(0, 3)
}
</script>

<template>
  <div class="h-9 bg-surface-100 dark:bg-surface-900 border-b flex items-center" @contextmenu.prevent>
    <div class="flex-1 flex items-center overflow-x-auto scrollbar-thin">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        @click="tabsStore.setActiveTab(tab.id)"
        @mousedown="handleMiddleClick($event, tab.id)"
        @contextmenu.prevent="handleContextMenu($event, tab.id)"
        @dblclick="startRename(tab.id)"
        class="group flex items-center gap-1.5 h-full px-3 border-r cursor-pointer transition-colors min-w-0 max-w-48"
        :class="activeTabId === tab.id 
          ? 'bg-white dark:bg-surface-950 text-surface-900 dark:text-surface-100' 
          : 'text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-800'"
      >
        <span :class="['text-xs font-bold uppercase', getMethodClass(getTabDisplayMethod(tab))]">
          {{ getTabDisplayMethod(tab) }}
        </span>
        <template v-if="isRenaming && renamingTabId === tab.id">
          <input
            v-model="renameInput"
            @blur="finishRename"
            @keydown.enter="finishRename"
            @keydown.escape="cancelRename"
            @click.stop
            class="text-sm flex-1 bg-transparent border-b border-diamond-500 outline-none px-0.5"
            ref="renameInputRef"
            autofocus
          />
        </template>
        <template v-else>
          <span class="text-sm truncate flex-1">
            {{ tab.request.name || tab.request.url || 'New Request' }}
          </span>
        </template>
        <span v-if="tab.isDirty" class="w-1.5 h-1.5 rounded-full bg-diamond-500" title="Unsaved changes" />
        <button
          @click.stop="tabsStore.closeTab(tab.id)"
          class="p-0.5 rounded hover:bg-surface-300 dark:hover:bg-surface-700 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    
    <button
      @click="tabsStore.createTab()"
      class="h-full px-3 hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
      title="New tab (Ctrl+T)"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>
    
    <!-- Context Menu -->
    <ContextMenu
      v-if="showContextMenu"
      :items="contextMenuItems"
      :x="contextMenuX"
      :y="contextMenuY"
      @select="handleContextMenuSelect"
      @close="showContextMenu = false"
    />
  </div>
</template>
