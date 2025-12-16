<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useTabsStore } from '@/stores/tabs'
import type { HistoryEntry, RequestChain, Collection } from '@/types'
import CollectionTree from './CollectionTree.vue'
import EnvironmentSelector from './EnvironmentSelector.vue'
import RequestChainEditor from './RequestChainEditor.vue'
import { importPostmanCollection, exportToPostman } from '@/utils/postman'

defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const workspaceStore = useWorkspaceStore()
const tabsStore = useTabsStore()

const activeSection = ref<'collections' | 'history' | 'environments' | 'chains'>('collections')
const showNewCollectionModal = ref(false)
const newCollectionName = ref('')
const showChainEditor = ref(false)
const editingChain = ref<RequestChain | undefined>(undefined)
const savedChains = ref<RequestChain[]>([])

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

function openChainEditor(chain?: RequestChain) {
  editingChain.value = chain
  showChainEditor.value = true
}

function saveChain(chain: RequestChain) {
  const existingIndex = savedChains.value.findIndex(c => c.id === chain.id)
  if (existingIndex >= 0) {
    savedChains.value[existingIndex] = chain
  } else {
    savedChains.value.push(chain)
  }
  showChainEditor.value = false
  editingChain.value = undefined
}

function deleteChain(chainId: string) {
  savedChains.value = savedChains.value.filter(c => c.id !== chainId)
}

// Postman Import/Export
const showImportModal = ref(false)
const importError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  try {
    const text = await file.text()
    const collection = importPostmanCollection(text)
    
    // Add to workspace
    if (workspaceStore.activeWorkspace) {
      workspaceStore.activeWorkspace.collections.push(collection)
      workspaceStore.activeWorkspace.updatedAt = Date.now()
    }
    
    importError.value = ''
    showImportModal.value = false
  } catch (e) {
    importError.value = e instanceof Error ? e.message : 'Failed to import collection'
  }
  
  // Reset file input
  target.value = ''
}

function exportCollection(collection: Collection) {
  const json = exportToPostman(collection)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `${collection.name}.postman_collection.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <aside 
    class="bg-surface-100 dark:bg-surface-900 border-r flex flex-col transition-all duration-200"
    :class="collapsed ? 'w-12' : 'w-72'"
  >
    <div v-if="!collapsed" class="flex border-b">
      <button
        v-for="section in ['collections', 'history', 'environments', 'chains']"
        :key="section"
        @click="activeSection = section as typeof activeSection"
        class="flex-1 px-2 py-2 text-xs font-medium capitalize transition-colors"
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
          <div class="flex items-center gap-1">
            <button
              @click="triggerImport"
              class="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              title="Import Postman Collection"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
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
        </div>
        
        <!-- Hidden file input for import -->
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleFileImport"
        />
        
        <div v-if="collections.length === 0" class="text-center py-8 text-surface-400 text-sm">
          <p>No collections yet</p>
          <button
            @click="showNewCollectionModal = true"
            class="mt-2 text-diamond-600 dark:text-diamond-400 hover:underline"
          >
            Create your first collection
          </button>
          <p class="text-xs mt-2 text-surface-400">or</p>
          <button
            @click="triggerImport"
            class="mt-1 text-diamond-600 dark:text-diamond-400 hover:underline"
          >
            Import from Postman
          </button>
        </div>
        
        <div v-for="collection in collections" :key="collection.id" class="group">
          <div class="flex items-center justify-between">
            <CollectionTree :collection="collection" class="flex-1" />
            <button
              @click="exportCollection(collection)"
              class="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600"
              title="Export as Postman Collection"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
        </div>
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
      
      <div v-else-if="activeSection === 'chains'" class="p-2">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-surface-500 uppercase tracking-wider">Request Chains</span>
          <button
            @click="openChainEditor()"
            class="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
            title="New Chain"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <div v-if="savedChains.length === 0" class="text-center py-8 text-surface-400 text-sm">
          <p>No request chains yet</p>
          <button
            @click="openChainEditor()"
            class="mt-2 text-diamond-600 dark:text-diamond-400 hover:underline"
          >
            Create your first chain
          </button>
          <p class="text-xs mt-3 text-surface-400">
            Chains let you run multiple requests in sequence with shared data.
          </p>
        </div>
        
        <div
          v-for="chain in savedChains"
          :key="chain.id"
          class="flex items-center gap-2 p-2 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer group"
        >
          <div class="flex-1 min-w-0" @click="openChainEditor(chain)">
            <p class="text-sm font-medium truncate text-surface-700 dark:text-surface-300">
              {{ chain.name }}
            </p>
            <p class="text-xs text-surface-400">
              {{ chain.requests.length }} requests
            </p>
          </div>
          <button
            @click.stop="deleteChain(chain.id)"
            class="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
            title="Delete chain"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
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
    
    <RequestChainEditor
      v-if="showChainEditor"
      :chain="editingChain"
      @save="saveChain"
      @close="showChainEditor = false; editingChain = undefined"
    />
  </aside>
</template>
