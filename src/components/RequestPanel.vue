<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTabsStore } from '@/stores/tabs'
import { useWorkspaceStore } from '@/stores/workspace'
import type { HttpMethod, KeyValue, RequestType } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import BodyEditor from './BodyEditor.vue'
import AuthEditor from './AuthEditor.vue'
import KeyValueEditor from './KeyValueEditor.vue'
import ScriptEditor from './ScriptEditor.vue'

const tabsStore = useTabsStore()
const workspaceStore = useWorkspaceStore()

const activeTab = computed(() => tabsStore.activeTab)
const request = computed(() => activeTab.value?.request)
const currentRequestType = computed(() => activeTab.value?.requestType || 'http')

const activeSection = ref<'params' | 'headers' | 'body' | 'auth' | 'cookies' | 'pre-request' | 'tests'>('params')

const requestTypes: { value: RequestType; label: string; color: string }[] = [
  { value: 'http', label: 'HTTP', color: 'bg-emerald-500' },
  { value: 'graphql', label: 'GraphQL', color: 'bg-pink-500' },
  { value: 'websocket', label: 'WebSocket', color: 'bg-indigo-500' }
]

function changeRequestType(type: RequestType) {
  if (!activeTab.value) return
  
  if (type === 'graphql') {
    tabsStore.createGraphQLTab()
  } else if (type === 'websocket') {
    tabsStore.createWebSocketTab()
  } else {
    tabsStore.setRequestType(activeTab.value.id, type)
  }
}

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

const isLoading = computed(() => activeTab.value?.isLoading ?? false)

function updateMethod(method: HttpMethod) {
  if (activeTab.value) {
    tabsStore.setMethod(activeTab.value.id, method)
  }
}

function updateUrl(url: string) {
  if (activeTab.value) {
    tabsStore.setUrl(activeTab.value.id, url)
    syncParamsFromUrl(url)
  }
}

function syncParamsFromUrl(url: string) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`)
    const params: KeyValue[] = []
    urlObj.searchParams.forEach((value, key) => {
      params.push({ id: uuidv4(), key, value, enabled: true })
    })
    if (params.length > 0 && activeTab.value) {
      tabsStore.updateRequest(activeTab.value.id, { params })
    }
  } catch {
    // Invalid URL, ignore
  }
}

function updateParams(params: KeyValue[]) {
  if (!activeTab.value || !request.value) return
  
  tabsStore.updateRequest(activeTab.value.id, { params })
  
  // Sync to URL
  try {
    const baseUrl = request.value.url.split('?')[0]
    const searchParams = new URLSearchParams()
    params.filter(p => p.enabled && p.key).forEach(p => {
      searchParams.append(p.key, p.value)
    })
    const queryString = searchParams.toString()
    const newUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl
    tabsStore.updateRequest(activeTab.value.id, { url: newUrl })
  } catch {
    // Invalid URL, ignore
  }
}

function updateHeaders(headers: KeyValue[]) {
  if (activeTab.value) {
    tabsStore.updateRequest(activeTab.value.id, { headers })
  }
}

function updateCookies(cookies: KeyValue[]) {
  if (activeTab.value) {
    tabsStore.updateRequest(activeTab.value.id, { cookies })
  }
}

async function sendRequest() {
  if (!activeTab.value || !request.value) return
  
  tabsStore.setLoading(activeTab.value.id, true)
  
  try {
    const resolvedUrl = workspaceStore.resolveVariables(request.value.url)
    const resolvedHeaders: Record<string, string> = {}
    
    request.value.headers
      .filter(h => h.enabled && h.key)
      .forEach(h => {
        resolvedHeaders[workspaceStore.resolveVariables(h.key)] = workspaceStore.resolveVariables(h.value)
      })
    
    // Add auth headers
    if (request.value.auth.type === 'bearer' && request.value.auth.bearer?.token) {
      resolvedHeaders['Authorization'] = `Bearer ${workspaceStore.resolveVariables(request.value.auth.bearer.token)}`
    } else if (request.value.auth.type === 'basic' && request.value.auth.basic) {
      const credentials = btoa(`${request.value.auth.basic.username}:${request.value.auth.basic.password}`)
      resolvedHeaders['Authorization'] = `Basic ${credentials}`
    } else if (request.value.auth.type === 'api-key' && request.value.auth.apiKey) {
      if (request.value.auth.apiKey.addTo === 'header') {
        resolvedHeaders[request.value.auth.apiKey.key] = request.value.auth.apiKey.value
      }
    }
    
    // Prepare body
    let body: string | FormData | undefined
    if (request.value.body.type === 'json' || request.value.body.type === 'xml' || request.value.body.type === 'text') {
      body = workspaceStore.resolveVariables(request.value.body.raw || '')
      if (request.value.body.type === 'json' && !resolvedHeaders['Content-Type']) {
        resolvedHeaders['Content-Type'] = 'application/json'
      } else if (request.value.body.type === 'xml' && !resolvedHeaders['Content-Type']) {
        resolvedHeaders['Content-Type'] = 'application/xml'
      }
    } else if (request.value.body.type === 'x-www-form-urlencoded' && request.value.body.urlEncoded) {
      const params = new URLSearchParams()
      request.value.body.urlEncoded.filter(p => p.enabled && p.key).forEach(p => {
        params.append(p.key, p.value)
      })
      body = params.toString()
      resolvedHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
    }
    
    const startTime = performance.now()
    
    const response = await fetch(resolvedUrl, {
      method: request.value.method,
      headers: resolvedHeaders,
      body: ['GET', 'HEAD', 'OPTIONS'].includes(request.value.method) ? undefined : body
    })
    
    const endTime = performance.now()
    const responseBody = await response.text()
    
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })
    
    const httpResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      bodySize: new Blob([responseBody]).size,
      timing: {
        dns: 0,
        connect: 0,
        tls: 0,
        send: 0,
        wait: endTime - startTime,
        receive: 0,
        total: endTime - startTime
      },
      timestamp: Date.now()
    }
    
    tabsStore.setResponse(activeTab.value.id, httpResponse)
    
    // Add to history
    workspaceStore.addToHistory({
      request: { ...request.value },
      response: httpResponse,
      timestamp: Date.now(),
      workspaceId: workspaceStore.activeWorkspaceId || ''
    })
    
  } catch (error) {
    console.error('Request failed:', error)
    tabsStore.setResponse(activeTab.value.id, {
      status: 0,
      statusText: error instanceof Error ? error.message : 'Request failed',
      headers: {},
      body: error instanceof Error ? error.stack || error.message : 'Unknown error',
      bodySize: 0,
      timing: { dns: 0, connect: 0, tls: 0, send: 0, wait: 0, receive: 0, total: 0 },
      timestamp: Date.now()
    })
  }
}

function getMethodClass(method: string): string {
  const classes: Record<string, string> = {
    GET: 'bg-emerald-500',
    POST: 'bg-blue-500',
    PUT: 'bg-amber-500',
    PATCH: 'bg-orange-500',
    DELETE: 'bg-red-500',
    OPTIONS: 'bg-purple-500',
    HEAD: 'bg-gray-500'
  }
  return classes[method] || 'bg-emerald-500'
}
</script>

<template>
  <div v-if="request" class="h-full flex flex-col">
    <div class="flex items-center gap-2 p-3 border-b">
      <!-- Request Type Selector -->
      <div class="relative group">
        <button
          class="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border dark:border-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800"
        >
          <span :class="['w-2 h-2 rounded-full', requestTypes.find(t => t.value === currentRequestType)?.color || 'bg-emerald-500']"></span>
          {{ requestTypes.find(t => t.value === currentRequestType)?.label || 'HTTP' }}
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="absolute left-0 top-full bg-white dark:bg-surface-800 rounded-lg shadow-lg border dark:border-surface-700 py-1 min-w-32 z-10 hidden group-hover:block">
          <button
            v-for="type in requestTypes"
            :key="type.value"
            @click="changeRequestType(type.value)"
            class="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-surface-100 dark:hover:bg-surface-700"
            :class="{ 'bg-surface-100 dark:bg-surface-700': currentRequestType === type.value }"
          >
            <span :class="['w-2 h-2 rounded-full', type.color]"></span>
            {{ type.label }}
          </button>
        </div>
      </div>
      
      <div class="relative">
        <select
          :value="request.method"
          @change="updateMethod(($event.target as HTMLSelectElement).value as HttpMethod)"
          :class="['select w-28 font-bold text-white appearance-none cursor-pointer', getMethodClass(request.method)]"
        >
          <option v-for="method in methods" :key="method" :value="method" class="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">
            {{ method }}
          </option>
        </select>
      </div>
      
      <input
        :value="request.url"
        @input="updateUrl(($event.target as HTMLInputElement).value)"
        @keydown.enter.ctrl="sendRequest"
        type="text"
        placeholder="Enter request URL or paste text"
        class="input flex-1 font-mono text-sm"
      />
      
      <button
        @click="sendRequest"
        :disabled="isLoading || !request.url"
        class="btn btn-primary min-w-24"
      >
        <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span v-else>Send</span>
      </button>
    </div>
    
    <div class="flex border-b overflow-x-auto">
      <button
        v-for="section in ['params', 'headers', 'body', 'auth', 'cookies', 'pre-request', 'tests'] as const"
        :key="section"
        @click="activeSection = section"
        class="tab capitalize whitespace-nowrap"
        :class="{ 'tab-active': activeSection === section }"
      >
        {{ section === 'pre-request' ? 'Pre-request' : section === 'tests' ? 'Tests' : section }}
        <span
          v-if="section === 'params' && request.params.filter(p => p.enabled).length"
          class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-surface-200 dark:bg-surface-700"
        >
          {{ request.params.filter(p => p.enabled).length }}
        </span>
        <span
          v-if="section === 'headers' && request.headers.filter(h => h.enabled).length"
          class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-surface-200 dark:bg-surface-700"
        >
          {{ request.headers.filter(h => h.enabled).length }}
        </span>
      </button>
    </div>
    
    <div class="flex-1 overflow-auto p-3">
      <KeyValueEditor
        v-if="activeSection === 'params'"
        :items="request.params"
        @update="updateParams"
        placeholder-key="Parameter"
        placeholder-value="Value"
      />
      
      <KeyValueEditor
        v-else-if="activeSection === 'headers'"
        :items="request.headers"
        @update="updateHeaders"
        placeholder-key="Header"
        placeholder-value="Value"
      />
      
      <BodyEditor
        v-else-if="activeSection === 'body'"
        :body="request.body"
        @update="(body) => tabsStore.updateRequest(activeTab!.id, { body })"
      />
      
      <AuthEditor
        v-else-if="activeSection === 'auth'"
        :auth="request.auth"
        @update="(auth) => tabsStore.updateRequest(activeTab!.id, { auth })"
      />
      
      <KeyValueEditor
        v-else-if="activeSection === 'cookies'"
        :items="request.cookies"
        @update="updateCookies"
        placeholder-key="Cookie name"
        placeholder-value="Value"
      />
      
      <ScriptEditor
        v-else-if="activeSection === 'pre-request'"
        :script="request.preRequestScript || ''"
        type="pre-request"
        @update="(script) => tabsStore.updateRequest(activeTab!.id, { preRequestScript: script })"
      />
      
      <ScriptEditor
        v-else-if="activeSection === 'tests'"
        :script="request.testScript || ''"
        type="test"
        @update="(script) => tabsStore.updateRequest(activeTab!.id, { testScript: script })"
      />
    </div>
  </div>
</template>
