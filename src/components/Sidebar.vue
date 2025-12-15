<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useTabsStore } from '@/stores/tabs'
import type { Collection, CollectionItem, HistoryEntry } from '@/types'
import CollectionTree from './CollectionTree.vue'
import EnvironmentSelector from './EnvironmentSelector.vue'

defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const workspaceStore = useWorkspaceStore()
const tabsStore = useTabsStore()

const activeSection = ref<'collections' | 'history' | 'environments'>('collections')
const showNewCollectionModal = ref(false)
const newCollectionName = ref('')

const collections = computed(() => workspaceStore.activeWorkspace?.collections ?? [])
const history = computed(() => workspaceStore.activeWorkspace?.history ?? [])
const environments = computed(() => workspaceStore.activeWorkspace?.environments ?? [])

function createCollection() {
  if (newCollectionName.value.trim()) {
    workspaceStore.createCollection(newCollectionName.value.trim())
    newCollectionName.value = ''
    showNewCollectionModal.value = false
  }
}

function openHistoryItem(entry: HistoryEntry) {
  tabsStore.createTab(entry.request)
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  
  return date.toLocaleDateString()
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
  <aside 
    class="bg-surface-100 dark:bg-surface-900 border-r flex flex-col transition-all duration-200"
    :class="collapsed ? 'w-12' : 'w-72'"
  >
    <div v-if="!collapsed" class="flex border-b">
      <button
        v-for="section in ['collections', 'history', 'environments']"
        :key="section"
        @click="activeSection = section as typeof activeSection"
        class="flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors"
        :class="activeSection === section 
          ? 'text-diamond-600 dark:text-diamond-400 border-b-2 border-diamond-600 dark:border-diamond-400' 
          : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'"
      >
        {{ section }}
      </button>
    </div>
    
    <div v-if="collapsed" class="flex flex-col items-center py-2 gap-2">
      <button
        @click="emit('toggle')"
        class="p-2 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400"
        title="Expand sidebar"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>
    </div>
    
    <div v-else class="flex-1 overflow-auto">
      <div v-if="activeSection === 'collections'" class="p-2">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-surface-500 uppercase tracking-wider">Collections</span>
          <button
            @click="showNewCollectionModal = true"
            class="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
            title="New Collection"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <div v-if="collections.length === 0" class="text-center py-8 text-surface-400 text-sm">
          <p>No collections yet</p>
          <button
            @click="showNewCollectionModal = true"
            class="mt-2 text-diamond-600 dark:text-diamond-400 hover:underline"
          >
            Create your first collection
          </button>
        </div>
        
        <CollectionTree
          v-for="collection in collections"
          :key="collection.id"
          :collection="collection"
        />
      </div>
      
      <div v-else-if="activeSection === 'history'" class="p-2">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-surface-500 uppercase tracking-wider">History</span>
          <button
            v-if="history.length > 0"
            @click="workspaceStore.clearHistory()"
            class="text-xs text-surface-500 hover:text-red-500"
          >
            Clear
          </button>
        </div>
        
        <div v-if="history.length === 0" class="text-center py-8 text-surface-400 text-sm">
          <p>No history yet</p>
          <p class="text-xs mt-1">Requests will appear here</p>
        </div>
        
        <div
          v-for="entry in history"
          :key="entry.id"
          @click="openHistoryItem(entry)"
          class="flex items-center gap-2 p-2 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer group"
        >
          <span :class="['method-badge', getMethodClass(entry.request.method)]">
            {{ entry.request.method.slice(0, 3) }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm truncate text-surface-700 dark:text-surface-300">
              {{ entry.request.url || 'Untitled' }}
            </p>
            <p class="text-xs text-surface-400">
              {{ formatDate(entry.timestamp) }}
              <span v-if="entry.response" :class="entry.response.status < 400 ? 'text-emerald-500' : 'text-red-500'">
                · {{ entry.response.status }}
              </span>
            </p>
          </div>
        </div>
      </div>
      
      <div v-else-if="activeSection === 'environments'" class="p-2">
        <EnvironmentSelector />
      </div>
    </div>
    
    <div v-if="!collapsed" class="p-2 border-t">
      <button
        @click="emit('toggle')"
        class="w-full flex items-center justify-center gap-2 p-2 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-500 text-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
        Collapse
      </button>
    </div>
    
    <Teleport to="body">
      <div v-if="showNewCollectionModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showNewCollectionModal = false">
        <div class="bg-white dark:bg-surface-800 rounded-lg shadow-xl w-96 p-4">
          <h3 class="text-lg font-semibold mb-4">New Collection</h3>
          <input
            v-model="newCollectionName"
            type="text"
            placeholder="Collection name"
            class="input mb-4"
            @keydown.enter="createCollection"
            autofocus
          />
          <div class="flex justify-end gap-2">
            <button @click="showNewCollectionModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button @click="createCollection" class="btn btn-primary" :disabled="!newCollectionName.trim()">
              Create
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </aside>
</template>
