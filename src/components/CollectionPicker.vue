<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useTabsStore } from '@/stores/tabs'
import type { HttpRequest, GraphQLRequest, WebSocketRequest } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const emit = defineEmits<{
  close: []
  saved: [collectionId: string]
}>()

const workspaceStore = useWorkspaceStore()
const tabsStore = useTabsStore()

const collections = computed(() => workspaceStore.activeWorkspace?.collections || [])
const activeTab = computed(() => tabsStore.activeTab)

const showNewCollection = ref(false)
const newCollectionName = ref('')
const selectedCollectionId = ref<string | null>(null)
const searchQuery = ref('')

const filteredCollections = computed(() => {
  if (!searchQuery.value) return collections.value
  const query = searchQuery.value.toLowerCase()
  return collections.value.filter(c => c.name.toLowerCase().includes(query))
})

// Get the current request based on tab type
const currentRequest = computed(() => {
  if (!activeTab.value) return null
  
  const tab = activeTab.value
  const requestType = tab.requestType || 'http'
  
  if (requestType === 'graphql' && tab.graphqlRequest) {
    return {
      type: 'graphql' as const,
      data: tab.graphqlRequest,
      name: tab.request.name || tab.graphqlRequest.url || 'GraphQL Request'
    }
  } else if (requestType === 'websocket' && tab.websocketRequest) {
    return {
      type: 'websocket' as const,
      data: tab.websocketRequest,
      name: tab.request.name || tab.websocketRequest.url || 'WebSocket Request'
    }
  } else {
    return {
      type: 'http' as const,
      data: tab.request,
      name: tab.request.name || tab.request.url || 'HTTP Request'
    }
  }
})

function selectCollection(collectionId: string) {
  selectedCollectionId.value = collectionId
}

function createNewCollection() {
  if (!newCollectionName.value.trim()) return
  
  const newCollection = workspaceStore.createCollection(newCollectionName.value.trim())
  if (newCollection) {
    selectedCollectionId.value = newCollection.id
  }
  newCollectionName.value = ''
  showNewCollection.value = false
}

function saveToCollection() {
  if (!selectedCollectionId.value || !currentRequest.value || !activeTab.value) return
  
  const req = currentRequest.value
  const tab = activeTab.value
  
  // Create a proper request object based on type
  if (req.type === 'graphql') {
    // Save GraphQL request
    const gqlRequest = req.data as GraphQLRequest
    const httpWrapper: HttpRequest = {
      id: uuidv4(),
      name: req.name,
      method: 'POST',
      url: gqlRequest.url,
      params: [],
      headers: gqlRequest.headers || [],
      body: {
        type: 'json',
        raw: JSON.stringify({
          query: gqlRequest.query,
          variables: gqlRequest.variables
        })
      },
      auth: gqlRequest.auth || { type: 'none' },
      cookies: [],
      preRequestScript: '',
      testScript: ''
    }
    
    // Store with GraphQL metadata (folderId = undefined, metadata = 4th param)
    workspaceStore.addRequestToCollection(selectedCollectionId.value, httpWrapper, undefined, {
      requestType: 'graphql',
      graphqlRequest: gqlRequest
    })
  } else if (req.type === 'websocket') {
    // Save WebSocket request
    const wsRequest = req.data as WebSocketRequest
    const httpWrapper: HttpRequest = {
      id: uuidv4(),
      name: req.name,
      method: 'GET',
      url: wsRequest.url,
      params: [],
      headers: wsRequest.headers || [],
      body: { type: 'none' },
      auth: { type: 'none' },
      cookies: [],
      preRequestScript: '',
      testScript: ''
    }
    
    workspaceStore.addRequestToCollection(selectedCollectionId.value, httpWrapper, undefined, {
      requestType: 'websocket',
      websocketRequest: wsRequest
    })
  } else {
    // Save HTTP request
    const httpRequest = { ...req.data as HttpRequest, name: req.name }
    workspaceStore.addRequestToCollection(selectedCollectionId.value, httpRequest, undefined, {
      requestType: 'http'
    })
  }
  
  // Mark tab as saved
  tabsStore.markSaved(tab.id)
  
  emit('saved', selectedCollectionId.value)
  emit('close')
}

function getRequestTypeLabel(): string {
  if (!currentRequest.value) return 'Request'
  switch (currentRequest.value.type) {
    case 'graphql': return 'GraphQL'
    case 'websocket': return 'WebSocket'
    default: return 'HTTP'
  }
}

function getRequestTypeColor(): string {
  if (!currentRequest.value) return 'bg-emerald-500'
  switch (currentRequest.value.type) {
    case 'graphql': return 'bg-pink-500'
    case 'websocket': return 'bg-indigo-500'
    default: return 'bg-emerald-500'
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="emit('close')">
      <div class="bg-white dark:bg-surface-900 rounded-lg shadow-xl w-full max-w-md">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b dark:border-surface-700">
          <div>
            <h2 class="text-lg font-semibold">Save to Collection</h2>
            <p class="text-sm text-surface-500 mt-0.5">
              Saving: 
              <span :class="['inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white', getRequestTypeColor()]">
                {{ getRequestTypeLabel() }}
              </span>
              {{ currentRequest?.name }}
            </p>
          </div>
          <button @click="emit('close')" class="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Content -->
        <div class="p-4">
          <!-- Search -->
          <div class="relative mb-3">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search collections..."
              class="input pl-10 w-full"
              autofocus
            />
          </div>
          
          <!-- Collections List -->
          <div class="max-h-64 overflow-y-auto border dark:border-surface-700 rounded-lg">
            <div v-if="filteredCollections.length === 0 && !showNewCollection" class="p-4 text-center text-surface-400">
              <p>No collections found</p>
              <button @click="showNewCollection = true" class="mt-2 text-diamond-600 dark:text-diamond-400 hover:underline text-sm">
                Create a new collection
              </button>
            </div>
            
            <div
              v-for="collection in filteredCollections"
              :key="collection.id"
              @click="selectCollection(collection.id)"
              class="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 border-b dark:border-surface-700 last:border-b-0"
              :class="{ 'bg-diamond-50 dark:bg-diamond-900/20 border-l-2 border-l-diamond-500': selectedCollectionId === collection.id }"
            >
              <div class="w-8 h-8 rounded bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
                <svg class="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ collection.name }}</p>
                <p class="text-xs text-surface-400">{{ collection.items.length }} items</p>
              </div>
              <svg v-if="selectedCollectionId === collection.id" class="w-5 h-5 text-diamond-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          
          <!-- New Collection -->
          <div v-if="showNewCollection" class="mt-3 p-3 border dark:border-surface-700 rounded-lg bg-surface-50 dark:bg-surface-800">
            <p class="text-sm font-medium mb-2">Create New Collection</p>
            <div class="flex gap-2">
              <input
                v-model="newCollectionName"
                type="text"
                placeholder="Collection name"
                class="input flex-1"
                @keydown.enter="createNewCollection"
                @keydown.escape="showNewCollection = false"
                autofocus
              />
              <button @click="createNewCollection" class="btn btn-primary" :disabled="!newCollectionName.trim()">
                Create
              </button>
            </div>
          </div>
          
          <button
            v-if="!showNewCollection"
            @click="showNewCollection = true"
            class="mt-3 w-full flex items-center justify-center gap-2 p-2 border border-dashed dark:border-surface-600 rounded-lg text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:border-surface-400 dark:hover:border-surface-500 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Collection
          </button>
        </div>
        
        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 p-4 border-t dark:border-surface-700">
          <button @click="emit('close')" class="btn btn-secondary">
            Cancel
          </button>
          <button
            @click="saveToCollection"
            class="btn btn-primary"
            :disabled="!selectedCollectionId"
          >
            Save to Collection
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
