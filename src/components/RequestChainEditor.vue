<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import type { RequestChain, ChainedRequest } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const props = defineProps<{
  chain?: RequestChain
}>()

const emit = defineEmits<{
  save: [chain: RequestChain]
  close: []
  run: [chain: RequestChain]
}>()

const workspaceStore = useWorkspaceStore()

const chainName = ref(props.chain?.name || 'New Request Chain')
const chainDescription = ref(props.chain?.description || '')
const chainRequests = ref<ChainedRequest[]>(props.chain?.requests || [])
const chainVariables = ref<Record<string, string>>(props.chain?.variables || {})

const isRunning = ref(false)
const runResults = ref<Array<{ requestId: string; success: boolean; message: string }>>([])

const availableRequests = computed(() => {
  const collections = workspaceStore.activeWorkspace?.collections || []
  const requests: Array<{ id: string; name: string; method: string }> = []
  
  function collectRequests(items: any[]) {
    for (const item of items) {
      if (item.type === 'request' && item.request) {
        requests.push({
          id: item.request.id,
          name: item.name || item.request.name,
          method: item.request.method
        })
      }
      if (item.children) {
        collectRequests(item.children)
      }
    }
  }
  
  for (const collection of collections) {
    collectRequests(collection.items)
  }
  
  return requests
})

function addRequest() {
  chainRequests.value.push({
    id: uuidv4(),
    requestId: '',
    order: chainRequests.value.length,
    extractors: [],
    enabled: true
  })
}

function removeRequest(index: number) {
  chainRequests.value.splice(index, 1)
  // Update order values
  chainRequests.value.forEach((req, i) => {
    req.order = i
  })
}

function moveRequest(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= chainRequests.value.length) return
  
  const temp = chainRequests.value[index]
  chainRequests.value[index] = chainRequests.value[newIndex]
  chainRequests.value[newIndex] = temp
  
  // Update order values
  chainRequests.value.forEach((req, i) => {
    req.order = i
  })
}

function addExtractor(requestIndex: number) {
  chainRequests.value[requestIndex].extractors.push({
    id: uuidv4(),
    name: '',
    source: 'body',
    path: ''
  })
}

function removeExtractor(requestIndex: number, extractorIndex: number) {
  chainRequests.value[requestIndex].extractors.splice(extractorIndex, 1)
}

function addVariable() {
  const key = `var_${Object.keys(chainVariables.value).length + 1}`
  chainVariables.value[key] = ''
}

function removeVariable(key: string) {
  delete chainVariables.value[key]
}

function saveChain() {
  const chain: RequestChain = {
    id: props.chain?.id || uuidv4(),
    name: chainName.value,
    description: chainDescription.value,
    requests: chainRequests.value,
    variables: chainVariables.value,
    createdAt: props.chain?.createdAt || Date.now(),
    updatedAt: Date.now()
  }
  emit('save', chain)
}

async function runChain() {
  isRunning.value = true
  runResults.value = []
  
  const localVars = { ...chainVariables.value }
  
  for (const chainReq of chainRequests.value.filter(r => r.enabled).sort((a, b) => a.order - b.order)) {
    // Check condition if exists
    if (chainReq.condition) {
      try {
        const conditionFn = new Function('vars', `return ${chainReq.condition}`)
        if (!conditionFn(localVars)) {
          runResults.value.push({
            requestId: chainReq.requestId,
            success: true,
            message: 'Skipped (condition not met)'
          })
          continue
        }
      } catch (e) {
        runResults.value.push({
          requestId: chainReq.requestId,
          success: false,
          message: `Condition error: ${e}`
        })
        continue
      }
    }
    
    // Find the request in collections
    const request = findRequestById(chainReq.requestId)
    if (!request) {
      runResults.value.push({
        requestId: chainReq.requestId,
        success: false,
        message: 'Request not found'
      })
      continue
    }
    
    try {
      // Resolve variables in URL and headers
      let resolvedUrl = request.url
      for (const [key, value] of Object.entries(localVars)) {
        resolvedUrl = resolvedUrl.replace(new RegExp(`{{${key}}}`, 'g'), value)
      }
      
      const headers: Record<string, string> = {}
      for (const h of request.headers.filter((h: any) => h.enabled)) {
        let value = h.value
        for (const [k, v] of Object.entries(localVars)) {
          value = value.replace(new RegExp(`{{${k}}}`, 'g'), v)
        }
        headers[h.key] = value
      }
      
      // Send request
      const response = await fetch(resolvedUrl, {
        method: request.method,
        headers
      })
      
      const responseBody = await response.text()
      let jsonBody: any = null
      try {
        jsonBody = JSON.parse(responseBody)
      } catch {}
      
      // Extract data
      for (const extractor of chainReq.extractors) {
        let value: any
        
        if (extractor.source === 'body' && jsonBody) {
          value = getValueByPath(jsonBody, extractor.path)
        } else if (extractor.source === 'headers') {
          value = response.headers.get(extractor.path)
        } else if (extractor.source === 'status') {
          value = response.status
        }
        
        if (extractor.transform) {
          try {
            const transformFn = new Function('value', 'vars', `return ${extractor.transform}`)
            value = transformFn(value, localVars)
          } catch {}
        }
        
        if (value !== undefined && extractor.name) {
          localVars[extractor.name] = String(value)
        }
      }
      
      runResults.value.push({
        requestId: chainReq.requestId,
        success: response.ok,
        message: `${response.status} ${response.statusText}`
      })
      
    } catch (e) {
      runResults.value.push({
        requestId: chainReq.requestId,
        success: false,
        message: `Error: ${e}`
      })
    }
  }
  
  isRunning.value = false
}

function findRequestById(id: string): any {
  const collections = workspaceStore.activeWorkspace?.collections || []
  
  function search(items: any[]): any {
    for (const item of items) {
      if (item.type === 'request' && item.request?.id === id) {
        return item.request
      }
      if (item.children) {
        const found = search(item.children)
        if (found) return found
      }
    }
    return null
  }
  
  for (const collection of collections) {
    const found = search(collection.items)
    if (found) return found
  }
  return null
}

function getValueByPath(obj: any, path: string): any {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (part.includes('[')) {
      const [key, indexStr] = part.split('[')
      const index = parseInt(indexStr.replace(']', ''))
      current = current[key]?.[index]
    } else {
      current = current[part]
    }
  }
  return current
}

function getRequestName(requestId: string): string {
  const req = availableRequests.value.find(r => r.id === requestId)
  return req ? `${req.method} ${req.name}` : 'Unknown Request'
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-surface-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b dark:border-surface-700">
        <h2 class="text-lg font-semibold">Request Chain Editor</h2>
        <button @click="emit('close')" class="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-auto p-4 space-y-4">
        <!-- Chain Info -->
        <div class="space-y-2">
          <input
            v-model="chainName"
            type="text"
            placeholder="Chain Name"
            class="input w-full text-lg font-medium"
          />
          <textarea
            v-model="chainDescription"
            placeholder="Description (optional)"
            rows="2"
            class="input w-full text-sm resize-none"
          />
        </div>
        
        <!-- Shared Variables -->
        <div class="border dark:border-surface-700 rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium">Shared Variables</h3>
            <button @click="addVariable" class="text-xs text-diamond-600 hover:text-diamond-700">
              + Add Variable
            </button>
          </div>
          <div class="space-y-2">
            <div v-for="(_value, key) in chainVariables" :key="key" class="flex items-center gap-2">
              <input
                :value="key"
                @change="(e) => { const newKey = (e.target as HTMLInputElement).value; chainVariables[newKey] = chainVariables[key]; delete chainVariables[key] }"
                class="input flex-1 text-sm font-mono"
                placeholder="Variable name"
              />
              <input
                v-model="chainVariables[key]"
                class="input flex-1 text-sm font-mono"
                placeholder="Initial value"
              />
              <button @click="removeVariable(key)" class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <p v-if="Object.keys(chainVariables).length === 0" class="text-xs text-surface-400">
              No shared variables. Variables can be used as <code>{<!-- -->{variableName}<!-- -->}</code> in URLs and headers.
            </p>
          </div>
        </div>
        
        <!-- Request Chain -->
        <div class="border dark:border-surface-700 rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium">Request Sequence</h3>
            <button @click="addRequest" class="text-xs text-diamond-600 hover:text-diamond-700">
              + Add Request
            </button>
          </div>
          
          <div class="space-y-3">
            <div
              v-for="(chainReq, index) in chainRequests"
              :key="chainReq.id"
              class="border dark:border-surface-600 rounded-lg p-3 bg-surface-50 dark:bg-surface-800"
            >
              <div class="flex items-center gap-2 mb-2">
                <span class="w-6 h-6 flex items-center justify-center text-xs font-bold bg-diamond-100 dark:bg-diamond-900 text-diamond-700 dark:text-diamond-300 rounded-full">
                  {{ index + 1 }}
                </span>
                <select v-model="chainReq.requestId" class="input flex-1 text-sm">
                  <option value="">Select a request...</option>
                  <option v-for="req in availableRequests" :key="req.id" :value="req.id">
                    {{ req.method }} {{ req.name }}
                  </option>
                </select>
                <label class="flex items-center gap-1 text-xs">
                  <input type="checkbox" v-model="chainReq.enabled" class="rounded" />
                  Enabled
                </label>
                <button
                  @click="moveRequest(index, 'up')"
                  :disabled="index === 0"
                  class="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded disabled:opacity-30"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  @click="moveRequest(index, 'down')"
                  :disabled="index === chainRequests.length - 1"
                  class="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded disabled:opacity-30"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button @click="removeRequest(index)" class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <!-- Condition -->
              <div class="mb-2">
                <input
                  v-model="chainReq.condition"
                  class="input w-full text-xs font-mono"
                  placeholder="Condition (JS expression, e.g., vars.status === 'active')"
                />
              </div>
              
              <!-- Data Extractors -->
              <div class="ml-6 mt-2 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-surface-500">Extract data from response:</span>
                  <button @click="addExtractor(index)" class="text-xs text-diamond-600 hover:text-diamond-700">
                    + Add Extractor
                  </button>
                </div>
                <div v-for="(ext, extIndex) in chainReq.extractors" :key="ext.id" class="flex items-center gap-2">
                  <input v-model="ext.name" class="input flex-1 text-xs font-mono" placeholder="Variable name" />
                  <select v-model="ext.source" class="input w-24 text-xs">
                    <option value="body">Body</option>
                    <option value="headers">Headers</option>
                    <option value="status">Status</option>
                  </select>
                  <input v-model="ext.path" class="input flex-1 text-xs font-mono" placeholder="Path (e.g., data.id)" />
                  <button @click="removeExtractor(index, extIndex)" class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <p v-if="chainRequests.length === 0" class="text-center py-4 text-surface-400 text-sm">
              No requests in chain. Click "Add Request" to start building your chain.
            </p>
          </div>
        </div>
        
        <!-- Run Results -->
        <div v-if="runResults.length > 0" class="border dark:border-surface-700 rounded-lg p-3">
          <h3 class="text-sm font-medium mb-2">Run Results</h3>
          <div class="space-y-1">
            <div
              v-for="result in runResults"
              :key="result.requestId"
              class="flex items-center gap-2 text-sm"
            >
              <span :class="result.success ? 'text-green-500' : 'text-red-500'">
                {{ result.success ? '✓' : '✗' }}
              </span>
              <span>{{ getRequestName(result.requestId) }}</span>
              <span class="text-surface-400">{{ result.message }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="flex items-center justify-between p-4 border-t dark:border-surface-700">
        <button @click="emit('close')" class="btn btn-secondary">
          Cancel
        </button>
        <div class="flex items-center gap-2">
          <button
            @click="runChain"
            :disabled="isRunning || chainRequests.length === 0"
            class="btn btn-secondary"
          >
            <svg v-if="isRunning" class="w-4 h-4 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ isRunning ? 'Running...' : 'Run Chain' }}
          </button>
          <button @click="saveChain" class="btn btn-primary">
            Save Chain
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
