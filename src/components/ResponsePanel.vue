<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTabsStore } from '@/stores/tabs'

const tabsStore = useTabsStore()

const activeTab = computed(() => tabsStore.activeTab)
const response = computed(() => activeTab.value?.response)
const isLoading = computed(() => activeTab.value?.isLoading ?? false)

const activeView = ref<'pretty' | 'raw' | 'preview' | 'headers'>('pretty')

const formattedBody = computed(() => {
  if (!response.value?.body) return ''
  
  const contentType = response.value.headers['content-type'] || ''
  
  if (contentType.includes('application/json') || response.value.body.trim().startsWith('{') || response.value.body.trim().startsWith('[')) {
    try {
      return JSON.stringify(JSON.parse(response.value.body), null, 2)
    } catch {
      return response.value.body
    }
  }
  
  return response.value.body
})

const statusClass = computed(() => {
  if (!response.value) return ''
  const status = response.value.status
  if (status >= 200 && status < 300) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
  if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
  if (status >= 400 && status < 500) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
  if (status >= 500) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
  return 'text-surface-600 dark:text-surface-400'
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function copyBody() {
  if (response.value?.body) {
    navigator.clipboard.writeText(response.value.body)
  }
}

const headersList = computed(() => {
  if (!response.value?.headers) return []
  return Object.entries(response.value.headers).map(([key, value]) => ({ key, value }))
})
</script>

<template>
  <div class="h-full flex flex-col">
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <svg class="w-8 h-8 animate-spin text-diamond-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-surface-500">Sending request...</p>
      </div>
    </div>
    
    <div v-else-if="!response" class="flex-1 flex items-center justify-center text-surface-400">
      <div class="text-center">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>Hit <kbd class="px-1.5 py-0.5 text-xs rounded bg-surface-200 dark:bg-surface-700">Send</kbd> to get a response</p>
        <p class="text-xs mt-1">Or press <kbd class="px-1.5 py-0.5 text-xs rounded bg-surface-200 dark:bg-surface-700">Ctrl+Enter</kbd></p>
      </div>
    </div>
    
    <template v-else>
      <div class="flex items-center justify-between p-2 border-b bg-surface-50 dark:bg-surface-900">
        <div class="flex items-center gap-4">
          <span :class="['px-2 py-0.5 rounded text-sm font-medium', statusClass]">
            {{ response.status }} {{ response.statusText }}
          </span>
          <span class="text-xs text-surface-500">
            {{ formatDuration(response.timing.total) }}
          </span>
          <span class="text-xs text-surface-500">
            {{ formatSize(response.bodySize) }}
          </span>
        </div>
        <button
          @click="copyBody"
          class="p-1.5 rounded hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500"
          title="Copy response body"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        </button>
      </div>
      
      <div class="flex border-b">
        <button
          v-for="view in ['pretty', 'raw', 'preview', 'headers'] as const"
          :key="view"
          @click="activeView = view"
          class="tab capitalize"
          :class="{ 'tab-active': activeView === view }"
        >
          {{ view }}
          <span v-if="view === 'headers'" class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-surface-200 dark:bg-surface-700">
            {{ headersList.length }}
          </span>
        </button>
      </div>
      
      <div class="flex-1 overflow-auto">
        <pre
          v-if="activeView === 'pretty'"
          class="p-3 text-sm font-mono whitespace-pre-wrap break-words text-surface-700 dark:text-surface-300"
        >{{ formattedBody }}</pre>
        
        <pre
          v-else-if="activeView === 'raw'"
          class="p-3 text-sm font-mono whitespace-pre-wrap break-words text-surface-700 dark:text-surface-300"
        >{{ response.body }}</pre>
        
        <iframe
          v-else-if="activeView === 'preview'"
          :srcdoc="response.body"
          class="w-full h-full bg-white"
          sandbox="allow-same-origin"
        />
        
        <div v-else-if="activeView === 'headers'" class="p-3">
          <div
            v-for="header in headersList"
            :key="header.key"
            class="flex gap-4 py-2 border-b last:border-0 dark:border-surface-700"
          >
            <span class="font-medium text-sm text-surface-600 dark:text-surface-400 w-48 truncate">
              {{ header.key }}
            </span>
            <span class="text-sm font-mono text-surface-700 dark:text-surface-300 flex-1 break-all">
              {{ header.value }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
