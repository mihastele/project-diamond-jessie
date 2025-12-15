<script setup lang="ts">
import { useTabsStore } from '@/stores/tabs'
import { useWorkspaceStore } from '@/stores/workspace'

const tabsStore = useTabsStore()
const workspaceStore = useWorkspaceStore()

function createNewRequest() {
  tabsStore.createTab()
}

function openCollection() {
  const name = prompt('Collection name:')
  if (name) {
    workspaceStore.createCollection(name)
  }
}
</script>

<template>
  <div class="flex-1 flex items-center justify-center bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-950 dark:to-surface-900">
    <div class="text-center max-w-lg px-8">
      <div class="mb-8">
        <img src="/diamond.svg" alt="Diamond" class="w-20 h-20 mx-auto mb-4" />
        <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-100 mb-2">
          Welcome to Diamond
        </h1>
        <p class="text-surface-600 dark:text-surface-400">
          A modern, open-source API client designed for developers who value simplicity and performance.
        </p>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-8">
        <button
          @click="createNewRequest"
          class="p-4 rounded-xl border-2 border-dashed hover:border-diamond-500 hover:bg-diamond-50 dark:hover:bg-diamond-900/20 transition-all group"
        >
          <svg class="w-8 h-8 mx-auto mb-2 text-surface-400 group-hover:text-diamond-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-sm font-medium text-surface-700 dark:text-surface-300">New Request</span>
          <p class="text-xs text-surface-500 mt-1">Start with a blank request</p>
        </button>
        
        <button
          @click="openCollection"
          class="p-4 rounded-xl border-2 border-dashed hover:border-diamond-500 hover:bg-diamond-50 dark:hover:bg-diamond-900/20 transition-all group"
        >
          <svg class="w-8 h-8 mx-auto mb-2 text-surface-400 group-hover:text-diamond-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span class="text-sm font-medium text-surface-700 dark:text-surface-300">New Collection</span>
          <p class="text-xs text-surface-500 mt-1">Organize your requests</p>
        </button>
      </div>
      
      <div class="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
        <h3 class="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">Keyboard Shortcuts</h3>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="flex justify-between">
            <span class="text-surface-500">New tab</span>
            <kbd class="px-1.5 py-0.5 text-xs rounded bg-surface-100 dark:bg-surface-700">Ctrl+T</kbd>
          </div>
          <div class="flex justify-between">
            <span class="text-surface-500">Send request</span>
            <kbd class="px-1.5 py-0.5 text-xs rounded bg-surface-100 dark:bg-surface-700">Ctrl+Enter</kbd>
          </div>
          <div class="flex justify-between">
            <span class="text-surface-500">Close tab</span>
            <kbd class="px-1.5 py-0.5 text-xs rounded bg-surface-100 dark:bg-surface-700">Ctrl+W</kbd>
          </div>
          <div class="flex justify-between">
            <span class="text-surface-500">Command palette</span>
            <kbd class="px-1.5 py-0.5 text-xs rounded bg-surface-100 dark:bg-surface-700">Ctrl+Shift+P</kbd>
          </div>
          <div class="flex justify-between">
            <span class="text-surface-500">Toggle sidebar</span>
            <kbd class="px-1.5 py-0.5 text-xs rounded bg-surface-100 dark:bg-surface-700">Ctrl+B</kbd>
          </div>
          <div class="flex justify-between">
            <span class="text-surface-500">Focus URL</span>
            <kbd class="px-1.5 py-0.5 text-xs rounded bg-surface-100 dark:bg-surface-700">Ctrl+L</kbd>
          </div>
        </div>
      </div>
      
      <p class="mt-6 text-xs text-surface-400">
        Diamond v0.1.0 • Built with Tauri + Vue
      </p>
    </div>
  </div>
</template>
