<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useWorkspaceStore } from '@/stores/workspace'
import { useTabsStore } from '@/stores/tabs'
import Sidebar from '@/components/Sidebar.vue'
import TabBar from '@/components/TabBar.vue'
import RequestPanel from '@/components/RequestPanel.vue'
import ResponsePanel from '@/components/ResponsePanel.vue'
import CommandPalette from '@/components/CommandPalette.vue'
import WelcomeScreen from '@/components/WelcomeScreen.vue'

const settingsStore = useSettingsStore()
const workspaceStore = useWorkspaceStore()
const tabsStore = useTabsStore()

const showCommandPalette = ref(false)
const sidebarCollapsed = ref(false)
const splitPosition = ref(50)

onMounted(() => {
  settingsStore.init()
  
  if (workspaceStore.workspaces.length === 0) {
    workspaceStore.createWorkspace('Default Workspace', 'Your first workspace')
  }
  
  setupKeyboardShortcuts()
})

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const mod = isMac ? e.metaKey : e.ctrlKey
    
    if (mod && e.shiftKey && e.key === 'P') {
      e.preventDefault()
      showCommandPalette.value = true
    }
    
    if (mod && e.key === 't') {
      e.preventDefault()
      tabsStore.createTab()
    }
    
    if (mod && e.key === 'w') {
      e.preventDefault()
      if (tabsStore.activeTabId) {
        tabsStore.closeTab(tabsStore.activeTabId)
      }
    }
    
    if (mod && e.key === 'b') {
      e.preventDefault()
      sidebarCollapsed.value = !sidebarCollapsed.value
    }
    
    if (e.key === 'Escape') {
      showCommandPalette.value = false
    }
  })
}

function handleSplitDrag(e: MouseEvent) {
  const container = document.getElementById('main-panels')
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  const position = ((e.clientY - rect.top) / rect.height) * 100
  splitPosition.value = Math.max(20, Math.min(80, position))
}
</script>

<template>
  <div class="h-screen flex flex-col bg-surface-50 dark:bg-surface-950 overflow-hidden">
    <header class="h-10 flex items-center justify-between px-4 border-b bg-surface-100 dark:bg-surface-900 drag">
      <div class="flex items-center gap-2 no-drag">
        <img src="/diamond.svg" alt="Diamond" class="w-5 h-5" />
        <span class="font-semibold text-diamond-600 dark:text-diamond-400">Diamond</span>
      </div>
      <div class="flex items-center gap-2 no-drag">
        <button
          @click="settingsStore.toggleTheme"
          class="p-1.5 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400"
          :title="`Theme: ${settingsStore.settings.theme}`"
        >
          <svg v-if="settingsStore.isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
      </div>
    </header>
    
    <div class="flex-1 flex overflow-hidden">
      <Sidebar 
        :collapsed="sidebarCollapsed" 
        @toggle="sidebarCollapsed = !sidebarCollapsed"
      />
      
      <main class="flex-1 flex flex-col overflow-hidden">
        <TabBar />
        
        <div v-if="tabsStore.activeTab" id="main-panels" class="flex-1 flex flex-col overflow-hidden">
          <div 
            class="overflow-auto border-b"
            :style="{ height: `${splitPosition}%` }"
          >
            <RequestPanel />
          </div>
          
          <div 
            class="h-1 bg-surface-200 dark:bg-surface-700 cursor-row-resize hover:bg-diamond-500 transition-colors flex-shrink-0"
            @mousedown="(e) => {
              const onMove = (ev: MouseEvent) => handleSplitDrag(ev)
              const onUp = () => {
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
              }
              window.addEventListener('mousemove', onMove)
              window.addEventListener('mouseup', onUp)
            }"
          />
          
          <div 
            class="overflow-auto"
            :style="{ height: `${100 - splitPosition}%` }"
          >
            <ResponsePanel />
          </div>
        </div>
        
        <WelcomeScreen v-else />
      </main>
    </div>
    
    <CommandPalette 
      v-if="showCommandPalette" 
      @close="showCommandPalette = false" 
    />
  </div>
</template>
