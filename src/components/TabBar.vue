<script setup lang="ts">
import { computed } from 'vue'
import { useTabsStore } from '@/stores/tabs'

const tabsStore = useTabsStore()

const tabs = computed(() => tabsStore.tabs)
const activeTabId = computed(() => tabsStore.activeTabId)

function getMethodClass(method: string): string {
  const classes: Record<string, string> = {
    GET: 'text-emerald-600 dark:text-emerald-400',
    POST: 'text-blue-600 dark:text-blue-400',
    PUT: 'text-amber-600 dark:text-amber-400',
    PATCH: 'text-orange-600 dark:text-orange-400',
    DELETE: 'text-red-600 dark:text-red-400',
    OPTIONS: 'text-purple-600 dark:text-purple-400'
  }
  return classes[method] || 'text-emerald-600'
}

function handleMiddleClick(e: MouseEvent, tabId: string) {
  if (e.button === 1) {
    e.preventDefault()
    tabsStore.closeTab(tabId)
  }
}
</script>

<template>
  <div class="h-9 bg-surface-100 dark:bg-surface-900 border-b flex items-center">
    <div class="flex-1 flex items-center overflow-x-auto scrollbar-thin">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        @click="tabsStore.setActiveTab(tab.id)"
        @mousedown="handleMiddleClick($event, tab.id)"
        class="group flex items-center gap-1.5 h-full px-3 border-r cursor-pointer transition-colors min-w-0 max-w-48"
        :class="activeTabId === tab.id 
          ? 'bg-white dark:bg-surface-950 text-surface-900 dark:text-surface-100' 
          : 'text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-800'"
      >
        <span :class="['text-xs font-bold uppercase', getMethodClass(tab.request.method)]">
          {{ tab.request.method.slice(0, 3) }}
        </span>
        <span class="text-sm truncate flex-1">
          {{ tab.request.name || tab.request.url || 'New Request' }}
        </span>
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
  </div>
</template>
