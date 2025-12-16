<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { sendHttpRequest } from '@/utils/http'
import type { Collection, CollectionRunResult, HttpRequest, HttpResponse, TestResult} from '@/types'

const props = defineProps<{
  collection: Collection
}>()

const emit = defineEmits<{
  close: []
}>()

const workspaceStore = useWorkspaceStore()

const isRunning = ref(false)
const currentRequestIndex = ref(0)
const results = ref<CollectionRunResult | null>(null)
const selectedEnvironmentId = ref<string | undefined>(workspaceStore.activeWorkspace?.activeEnvironmentId)
const delay = ref(0)
const stopOnError = ref(false)
const abortController = ref<AbortController | null>(null)

const environments = computed(() => workspaceStore.activeWorkspace?.environments || [])

const allRequests = computed(() => {
  const requests: { item: { id: string; name: string; request: HttpRequest }; path: string[] }[] = []
  
  function collectRequests(items: typeof props.collection.items, path: string[] = []) {
    for (const item of items) {
      if (item.type === 'request' && item.request) {
        requests.push({ 
          item: { id: item.id, name: item.name, request: item.request },
          path 
        })
      } else if (item.type === 'folder' && item.children) {
        collectRequests(item.children, [...path, item.name])
      }
    }
  }
  
  collectRequests(props.collection.items)
  return requests
})

const progress = computed(() => {
  if (!results.value) return 0
  const total = results.value.requests.length
  const completed = results.value.requests.filter(r => r.response || r.error).length
  return total > 0 ? (completed / total) * 100 : 0
})

async function runCollection() {
  isRunning.value = true
  currentRequestIndex.value = 0
  abortController.value = new AbortController()
  
  const runResult: CollectionRunResult = {
    collectionId: props.collection.id,
    environmentId: selectedEnvironmentId.value,
    requests: [],
    summary: {
      total: allRequests.value.length,
      passed: 0,
      failed: 0,
      duration: 0
    },
    timestamp: Date.now()
  }
  
  results.value = runResult
  const startTime = Date.now()
  
  for (let i = 0; i < allRequests.value.length; i++) {
    if (abortController.value?.signal.aborted) break
    
    currentRequestIndex.value = i
    const { item } = allRequests.value[i]
    
    const requestResult: typeof runResult.requests[0] = {
      requestId: item.id,
      request: item.request,
      tests: []
    }
    
    try {
      // Resolve variables in URL
      const resolvedUrl = workspaceStore.resolveVariables(item.request.url)
      
      // Build headers
      const headers: Record<string, string> = {}
      item.request.headers
        .filter(h => h.enabled)
        .forEach(h => {
          headers[workspaceStore.resolveVariables(h.key)] = workspaceStore.resolveVariables(h.value)
        })
      
      // Build body
      let body: string | undefined
      if (item.request.body.type !== 'none' && item.request.body.raw) {
        body = workspaceStore.resolveVariables(item.request.body.raw)
      }
      
      // Make the request using Tauri backend (no CORS restrictions)
      const httpResponse = await sendHttpRequest({
        method: item.request.method,
        url: resolvedUrl,
        headers,
        body,
        timeoutMs: 30000,
        followRedirects: true,
        validateSsl: true
      })
      
      requestResult.response = httpResponse
      
      // Run test script if present
      if (item.request.testScript) {
        requestResult.tests = runTestScript(item.request.testScript, httpResponse)
      }
      
      // Update summary
      const failedTests = requestResult.tests.filter(t => !t.passed).length
      if (failedTests === 0 && requestResult.tests.length > 0) {
        runResult.summary.passed++
      } else if (failedTests > 0) {
        runResult.summary.failed++
        if (stopOnError.value) break
      }
      
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        break
      }
      requestResult.error = e instanceof Error ? e.message : 'Request failed'
      runResult.summary.failed++
      if (stopOnError.value) break
    }
    
    runResult.requests.push(requestResult)
    
    // Delay between requests
    if (delay.value > 0 && i < allRequests.value.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay.value))
    }
  }
  
  runResult.summary.duration = Date.now() - startTime
  isRunning.value = false
  abortController.value = null
}

function runTestScript(script: string, response: HttpResponse): TestResult[] {
  const tests: TestResult[] = []
  
  // Simple test runner - in production this would be more sophisticated
  const dm = {
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.body,
      timing: response.timing,
      json: () => {
        try {
          return JSON.parse(response.body)
        } catch {
          return null
        }
      }
    },
    test: (name: string, fn: () => void) => {
      const start = Date.now()
      try {
        fn()
        tests.push({ name, passed: true, duration: Date.now() - start })
      } catch (e) {
        tests.push({ 
          name, 
          passed: false, 
          message: e instanceof Error ? e.message : 'Test failed',
          duration: Date.now() - start 
        })
      }
    },
    expect: (value: unknown) => ({
      to: {
        equal: (expected: unknown) => {
          if (value !== expected) throw new Error(`Expected ${expected} but got ${value}`)
        },
        be: {
          true: () => { if (value !== true) throw new Error(`Expected true but got ${value}`) },
          false: () => { if (value !== false) throw new Error(`Expected false but got ${value}`) },
          lessThan: (n: number) => { if (typeof value !== 'number' || value >= n) throw new Error(`Expected less than ${n}`) },
          greaterThan: (n: number) => { if (typeof value !== 'number' || value <= n) throw new Error(`Expected greater than ${n}`) },
          an: (type: string) => { 
            if (type === 'array' && !Array.isArray(value)) throw new Error('Expected an array')
          },
          at: {
            least: (n: number) => { if (typeof value !== 'number' || value < n) throw new Error(`Expected at least ${n}`) }
          }
        },
        have: {
          property: (prop: string) => {
            if (typeof value !== 'object' || value === null || !(prop in value)) {
              throw new Error(`Expected object to have property "${prop}"`)
            }
          }
        },
        include: (str: string) => {
          if (typeof value !== 'string' || !value.includes(str)) {
            throw new Error(`Expected "${value}" to include "${str}"`)
          }
        }
      }
    }),
    environment: workspaceStore
  }
  
  try {
    // Execute script in a sandboxed way (simplified)
    const fn = new Function('dm', script)
    fn(dm)
  } catch (e) {
    tests.push({
      name: 'Script Execution',
      passed: false,
      message: e instanceof Error ? e.message : 'Script error',
      duration: 0
    })
  }
  
  return tests
}

function stopRun() {
  abortController.value?.abort()
  isRunning.value = false
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-2xl w-[800px] max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b dark:border-surface-700">
        <div>
          <h2 class="text-lg font-semibold">Run Collection: {{ collection.name }}</h2>
          <p class="text-sm text-surface-500">{{ allRequests.length }} requests</p>
        </div>
        <button @click="emit('close')" class="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Settings -->
      <div class="p-4 border-b dark:border-surface-700 flex items-center gap-4">
        <div>
          <label class="block text-xs text-surface-500 mb-1">Environment</label>
          <select v-model="selectedEnvironmentId" class="select text-sm" :disabled="isRunning">
            <option :value="undefined">No Environment</option>
            <option v-for="env in environments" :key="env.id" :value="env.id">
              {{ env.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-surface-500 mb-1">Delay (ms)</label>
          <input v-model.number="delay" type="number" min="0" step="100" class="input text-sm w-24" :disabled="isRunning" />
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="stopOnError" :disabled="isRunning" class="rounded" />
          Stop on error
        </label>
        <div class="flex-1"></div>
        <button
          v-if="!isRunning"
          @click="runCollection"
          class="btn btn-primary"
          :disabled="allRequests.length === 0"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
          Run
        </button>
        <button v-else @click="stopRun" class="btn bg-red-500 hover:bg-red-600 text-white">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          Stop
        </button>
      </div>
      
      <!-- Progress -->
      <div v-if="results" class="px-4 py-2 border-b dark:border-surface-700">
        <div class="flex items-center justify-between text-sm mb-1">
          <span>Progress: {{ results.requests.length }} / {{ results.summary.total }}</span>
          <span>
            <span class="text-green-600">{{ results.summary.passed }} passed</span>
            <span class="mx-2">·</span>
            <span class="text-red-600">{{ results.summary.failed }} failed</span>
          </span>
        </div>
        <div class="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
          <div 
            class="h-full bg-diamond-500 transition-all duration-300"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
      </div>
      
      <!-- Results -->
      <div class="flex-1 overflow-auto p-4">
        <div v-if="!results" class="text-center py-12 text-surface-400">
          <p>Click "Run" to execute all requests in this collection</p>
        </div>
        
        <div v-else class="space-y-2">
          <div
            v-for="(result, index) in results.requests"
            :key="result.requestId"
            class="border dark:border-surface-700 rounded-lg overflow-hidden"
          >
            <div 
              class="flex items-center gap-3 p-3"
              :class="{
                'bg-green-50 dark:bg-green-900/20': result.response && !result.error && result.tests.every(t => t.passed),
                'bg-red-50 dark:bg-red-900/20': result.error || result.tests.some(t => !t.passed),
                'bg-surface-50 dark:bg-surface-900': !result.response && !result.error
              }"
            >
              <span class="text-xs text-surface-400 w-6">{{ index + 1 }}</span>
              <span :class="['method-badge text-[10px]', `method-${result.request.method.toLowerCase()}`]">
                {{ result.request.method.slice(0, 3) }}
              </span>
              <span class="flex-1 text-sm truncate">{{ result.request.name }}</span>
              
              <template v-if="result.response">
                <span 
                  class="text-xs font-mono px-1.5 py-0.5 rounded"
                  :class="result.response.status < 400 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'"
                >
                  {{ result.response.status }}
                </span>
                <span class="text-xs text-surface-500">{{ formatDuration(result.response.timing.total) }}</span>
              </template>
              
              <span v-if="result.error" class="text-xs text-red-600">{{ result.error }}</span>
              
              <span v-if="result.tests.length > 0" class="text-xs">
                <span class="text-green-600">{{ result.tests.filter(t => t.passed).length }}</span>
                /
                <span>{{ result.tests.length }}</span>
                tests
              </span>
            </div>
            
            <!-- Test Results -->
            <div v-if="result.tests.length > 0" class="border-t dark:border-surface-700 p-2 bg-white dark:bg-surface-800">
              <div v-for="test in result.tests" :key="test.name" class="flex items-center gap-2 text-xs py-1">
                <span v-if="test.passed" class="text-green-500">✓</span>
                <span v-else class="text-red-500">✗</span>
                <span :class="test.passed ? 'text-surface-600 dark:text-surface-400' : 'text-red-600'">
                  {{ test.name }}
                </span>
                <span v-if="test.message" class="text-red-500">- {{ test.message }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Summary -->
      <div v-if="results && !isRunning" class="p-4 border-t dark:border-surface-700 bg-surface-50 dark:bg-surface-900">
        <div class="flex items-center justify-between">
          <div class="text-sm">
            <span class="font-medium">Total Duration:</span>
            <span class="ml-2">{{ formatDuration(results.summary.duration) }}</span>
          </div>
          <div class="flex gap-4 text-sm">
            <span>
              <span class="text-green-600 font-medium">{{ results.summary.passed }}</span> passed
            </span>
            <span>
              <span class="text-red-600 font-medium">{{ results.summary.failed }}</span> failed
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
