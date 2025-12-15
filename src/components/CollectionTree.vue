<script setup lang="ts">
import { ref } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useTabsStore } from '@/stores/tabs'
import type { Collection, CollectionItem } from '@/types'

const props = defineProps<{
  collection: Collection
}>()

const workspaceStore = useWorkspaceStore()
const tabsStore = useTabsStore()

const isExpanded = ref(true)
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

function openRequest(item: CollectionItem) {
  if (item.type === 'request' && item.request) {
    tabsStore.openRequest(item.request)
  }
}

function showMenu(e: MouseEvent) {
  e.preventDefault()
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  showContextMenu.value = true
  
  const closeMenu = () => {
    showContextMenu.value = false
    window.removeEventListener('click', closeMenu)
  }
  setTimeout(() => window.addEventListener('click', closeMenu), 0)
}

function addNewRequest() {
  const newRequest = {
    id: '',
    name: 'New Request',
    method: 'GET' as const,
    url: '',
    params: [],
    headers: [],
    cookies: [],
    body: { type: 'none' as const },
    auth: { type: 'none' as const }
  }
  workspaceStore.addRequestToCollection(props.collection.id, newRequest)
}

function addNewFolder() {
  workspaceStore.createFolder(props.collection.id, 'New Folder')
}

function deleteCollection() {
  if (confirm(`Delete collection "${props.collection.name}"?`)) {
    workspaceStore.deleteCollection(props.collection.id)
  }
}

function getMethodClass(method: string): string {
  const classes: Record<string, string> = {
    GET: 'method-get',
    POST: 'method-post',
    PUT: 'method-put',
    PATCH: 'method-patch',
    DELETE: 'method-delete',
    OPTIONS: 'method-options'
  }
  return classes[method] || 'method-get'
}
</script>

<template>
  <div class="mb-1">
    <div
      class="flex items-center gap-1 p-1.5 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer group"
      @click="toggleExpand"
      @contextmenu="showMenu"
    >
      <svg 
        class="w-3 h-3 text-surface-400 transition-transform"
        :class="isExpanded ? 'rotate-90' : ''"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <span class="flex-1 text-sm truncate text-surface-700 dark:text-surface-300">
        {{ collection.name }}
      </span>
      <span class="text-xs text-surface-400">{{ collection.items.length }}</span>
    </div>
    
    <div v-if="isExpanded" class="ml-4 border-l border-surface-200 dark:border-surface-700">
      <div v-if="collection.items.length === 0" class="py-2 pl-3 text-xs text-surface-400">
        Empty collection
      </div>
      
      <template v-for="item in collection.items" :key="item.id">
        <div
          v-if="item.type === 'request'"
          class="flex items-center gap-2 p-1.5 pl-3 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer"
          @click="openRequest(item)"
        >
          <span :class="['method-badge text-[10px]', getMethodClass(item.request?.method || 'GET')]">
            {{ (item.request?.method || 'GET').slice(0, 3) }}
          </span>
          <span class="text-sm truncate text-surface-700 dark:text-surface-300">
            {{ item.name }}
          </span>
        </div>
        
        <div v-else-if="item.type === 'folder'" class="pl-2">
          <div class="flex items-center gap-1 p-1.5 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer">
            <svg class="w-3 h-3 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <svg class="w-4 h-4 text-surface-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span class="text-sm truncate text-surface-600 dark:text-surface-400">
              {{ item.name }}
            </span>
          </div>
        </div>
      </template>
    </div>
    
    <Teleport to="body">
      <div
        v-if="showContextMenu"
        class="fixed bg-white dark:bg-surface-800 rounded-lg shadow-lg border dark:border-surface-700 py-1 min-w-40 z-50"
        :style="{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }"
      >
        <button
          @click="addNewRequest"
          class="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Request
        </button>
        <button
          @click="addNewFolder"
          class="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          New Folder
        </button>
        <div class="border-t dark:border-surface-700 my-1"></div>
        <button
          @click="deleteCollection"
          class="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Collection
        </button>
      </div>
    </Teleport>
  </div>
</template>
