<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useTabsStore } from '@/stores/tabs'
import type { Collection, CollectionItem } from '@/types'

const props = defineProps<{
  collection: Collection
}>()

const workspaceStore = useWorkspaceStore()
const tabsStore = useTabsStore()

const isExpanded = ref(true)
const expandedFolders = reactive<Record<string, boolean>>({})

// Context menu state
const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  type: 'collection' as 'collection' | 'folder' | 'request',
  targetId: '',
  parentPath: [] as string[]
})

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

function toggleFolder(folderId: string) {
  expandedFolders[folderId] = !expandedFolders[folderId]
}

function isFolderExpanded(folderId: string): boolean {
  return expandedFolders[folderId] ?? false
}

function openRequest(item: CollectionItem) {
  if (item.type === 'request' && item.request) {
    tabsStore.openRequest(item.request)
  }
}

function showCollectionMenu(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.type = 'collection'
  contextMenu.targetId = props.collection.id
  contextMenu.parentPath = []
  contextMenu.show = true
  setupMenuClose()
}

function showFolderMenu(e: MouseEvent, folderId: string, parentPath: string[]) {
  e.preventDefault()
  e.stopPropagation()
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.type = 'folder'
  contextMenu.targetId = folderId
  contextMenu.parentPath = parentPath
  contextMenu.show = true
  setupMenuClose()
}

function showRequestMenu(e: MouseEvent, requestId: string, parentPath: string[]) {
  e.preventDefault()
  e.stopPropagation()
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.type = 'request'
  contextMenu.targetId = requestId
  contextMenu.parentPath = parentPath
  contextMenu.show = true
  setupMenuClose()
}

function setupMenuClose() {
  const closeMenu = () => {
    contextMenu.show = false
    window.removeEventListener('click', closeMenu)
  }
  setTimeout(() => window.addEventListener('click', closeMenu), 0)
}

function addNewRequest(toFolderId?: string, parentPath: string[] = []) {
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
  if (toFolderId) {
    workspaceStore.addRequestToFolder(props.collection.id, toFolderId, parentPath, newRequest)
  } else {
    workspaceStore.addRequestToCollection(props.collection.id, newRequest)
  }
  contextMenu.show = false
}

function addNewFolder(toFolderId?: string, parentPath: string[] = []) {
  if (toFolderId) {
    workspaceStore.createSubFolder(props.collection.id, toFolderId, parentPath, 'New Folder')
  } else {
    workspaceStore.createFolder(props.collection.id, 'New Folder')
  }
  contextMenu.show = false
}

function duplicateRequest() {
  workspaceStore.duplicateItem(props.collection.id, contextMenu.targetId, contextMenu.parentPath)
  contextMenu.show = false
}

function renameItem() {
  const newName = prompt('Enter new name:')
  if (newName) {
    workspaceStore.renameItem(props.collection.id, contextMenu.targetId, contextMenu.parentPath, newName)
  }
  contextMenu.show = false
}

function deleteItem() {
  const itemType = contextMenu.type === 'collection' ? 'collection' : contextMenu.type
  if (confirm(`Delete this ${itemType}?`)) {
    if (contextMenu.type === 'collection') {
      workspaceStore.deleteCollection(props.collection.id)
    } else {
      workspaceStore.deleteItem(props.collection.id, contextMenu.targetId, contextMenu.parentPath)
    }
  }
  contextMenu.show = false
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
    <!-- Collection Header -->
    <div
      class="flex items-center gap-1 p-1.5 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer group"
      @click="toggleExpand"
      @contextmenu="showCollectionMenu"
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
    
    <!-- Collection Items -->
    <div v-if="isExpanded" class="ml-4 border-l border-surface-200 dark:border-surface-700">
      <div v-if="collection.items.length === 0" class="py-2 pl-3 text-xs text-surface-400">
        Empty collection
      </div>
      
      <template v-for="item in collection.items" :key="item.id">
        <!-- Request Item -->
        <div
          v-if="item.type === 'request'"
          class="flex items-center gap-2 p-1.5 pl-3 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer"
          @click="openRequest(item)"
          @contextmenu="showRequestMenu($event, item.id, [])"
        >
          <span :class="['method-badge text-[10px]', getMethodClass(item.request?.method || 'GET')]">
            {{ (item.request?.method || 'GET').slice(0, 3) }}
          </span>
          <span class="text-sm truncate text-surface-700 dark:text-surface-300">
            {{ item.name }}
          </span>
        </div>
        
        <!-- Folder Item -->
        <div v-else-if="item.type === 'folder'" class="pl-2">
          <div 
            class="flex items-center gap-1 p-1.5 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer"
            @click="toggleFolder(item.id)"
            @contextmenu="showFolderMenu($event, item.id, [])"
          >
            <svg 
              class="w-3 h-3 text-surface-400 transition-transform"
              :class="isFolderExpanded(item.id) ? 'rotate-90' : ''"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <svg class="w-4 h-4 text-surface-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span class="text-sm truncate text-surface-600 dark:text-surface-400">
              {{ item.name }}
            </span>
            <span class="text-xs text-surface-400">{{ item.children?.length || 0 }}</span>
          </div>
          
          <!-- Folder Children (Recursive) -->
          <div v-if="isFolderExpanded(item.id)" class="ml-4 border-l border-surface-200 dark:border-surface-700">
            <template v-for="child in item.children" :key="child.id">
              <!-- Nested Request -->
              <div
                v-if="child.type === 'request'"
                class="flex items-center gap-2 p-1.5 pl-3 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer"
                @click="openRequest(child)"
                @contextmenu="showRequestMenu($event, child.id, [item.id])"
              >
                <span :class="['method-badge text-[10px]', getMethodClass(child.request?.method || 'GET')]">
                  {{ (child.request?.method || 'GET').slice(0, 3) }}
                </span>
                <span class="text-sm truncate text-surface-700 dark:text-surface-300">
                  {{ child.name }}
                </span>
              </div>
              
              <!-- Nested Folder (2nd level) -->
              <div v-else-if="child.type === 'folder'" class="pl-2">
                <div 
                  class="flex items-center gap-1 p-1.5 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer"
                  @click="toggleFolder(child.id)"
                  @contextmenu="showFolderMenu($event, child.id, [item.id])"
                >
                  <svg 
                    class="w-3 h-3 text-surface-400 transition-transform"
                    :class="isFolderExpanded(child.id) ? 'rotate-90' : ''"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <svg class="w-4 h-4 text-surface-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span class="text-sm truncate text-surface-600 dark:text-surface-400">
                    {{ child.name }}
                  </span>
                </div>
                
                <!-- 3rd level children -->
                <div v-if="isFolderExpanded(child.id)" class="ml-4 border-l border-surface-200 dark:border-surface-700">
                  <template v-for="grandchild in child.children" :key="grandchild.id">
                    <div
                      v-if="grandchild.type === 'request'"
                      class="flex items-center gap-2 p-1.5 pl-3 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer"
                      @click="openRequest(grandchild)"
                      @contextmenu="showRequestMenu($event, grandchild.id, [item.id, child.id])"
                    >
                      <span :class="['method-badge text-[10px]', getMethodClass(grandchild.request?.method || 'GET')]">
                        {{ (grandchild.request?.method || 'GET').slice(0, 3) }}
                      </span>
                      <span class="text-sm truncate text-surface-700 dark:text-surface-300">
                        {{ grandchild.name }}
                      </span>
                    </div>
                  </template>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
    
    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu.show"
        class="fixed bg-white dark:bg-surface-800 rounded-lg shadow-lg border dark:border-surface-700 py-1 min-w-44 z-50"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      >
        <!-- Collection menu -->
        <template v-if="contextMenu.type === 'collection'">
          <button
            @click="addNewRequest()"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Request
          </button>
          <button
            @click="addNewFolder()"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            New Folder
          </button>
          <div class="border-t dark:border-surface-700 my-1"></div>
          <button
            @click="renameItem"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Rename
          </button>
          <button
            @click="deleteItem"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Collection
          </button>
        </template>
        
        <!-- Folder menu -->
        <template v-else-if="contextMenu.type === 'folder'">
          <button
            @click="addNewRequest(contextMenu.targetId, contextMenu.parentPath)"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Request
          </button>
          <button
            @click="addNewFolder(contextMenu.targetId, contextMenu.parentPath)"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            New Sub-Folder
          </button>
          <div class="border-t dark:border-surface-700 my-1"></div>
          <button
            @click="renameItem"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Rename
          </button>
          <button
            @click="duplicateRequest"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Duplicate
          </button>
          <button
            @click="deleteItem"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Folder
          </button>
        </template>
        
        <!-- Request menu -->
        <template v-else-if="contextMenu.type === 'request'">
          <button
            @click="duplicateRequest"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Duplicate
          </button>
          <button
            @click="renameItem"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Rename
          </button>
          <div class="border-t dark:border-surface-700 my-1"></div>
          <button
            @click="deleteItem"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Request
          </button>
        </template>
      </div>
    </Teleport>
  </div>
</template>
