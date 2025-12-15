<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { GraphQLRequest, GraphQLResponse, GraphQLSchema, KeyValue } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import KeyValueEditor from './KeyValueEditor.vue'
import AuthEditor from './AuthEditor.vue'

const props = defineProps<{
  request: GraphQLRequest
}>()

const emit = defineEmits<{
  update: [request: GraphQLRequest]
  send: []
}>()

const activeTab = ref<'query' | 'variables' | 'headers' | 'auth'>('query')
const schema = ref<GraphQLSchema | null>(null)
const isLoadingSchema = ref(false)
const schemaError = ref<string | null>(null)
const queryError = ref<string | null>(null)

const localQuery = ref(props.request.query || '')
const localVariables = ref(props.request.variables || '{}')

watch(() => props.request.query, (newVal) => {
  if (newVal !== localQuery.value) {
    localQuery.value = newVal || ''
  }
})

watch(() => props.request.variables, (newVal) => {
  if (newVal !== localVariables.value) {
    localVariables.value = newVal || '{}'
  }
})

function updateQuery(value: string) {
  localQuery.value = value
  emit('update', { ...props.request, query: value })
}

function updateVariables(value: string) {
  localVariables.value = value
  try {
    JSON.parse(value || '{}')
    queryError.value = null
  } catch (e) {
    queryError.value = 'Invalid JSON in variables'
  }
  emit('update', { ...props.request, variables: value })
}

function updateUrl(url: string) {
  emit('update', { ...props.request, url })
}

function updateHeaders(headers: KeyValue[]) {
  emit('update', { ...props.request, headers })
}

function updateAuth(auth: typeof props.request.auth) {
  emit('update', { ...props.request, auth })
}

function formatQuery() {
  // Basic query formatting - indent and clean up
  const formatted = localQuery.value
    .replace(/\s+/g, ' ')
    .replace(/\{\s*/g, ' {\n  ')
    .replace(/\s*\}/g, '\n}')
    .replace(/,\s*/g, ',\n  ')
  localQuery.value = formatted
  emit('update', { ...props.request, query: formatted })
}

function formatVariables() {
  try {
    const parsed = JSON.parse(localVariables.value || '{}')
    const formatted = JSON.stringify(parsed, null, 2)
    localVariables.value = formatted
    queryError.value = null
    emit('update', { ...props.request, variables: formatted })
  } catch (e) {
    queryError.value = 'Invalid JSON in variables'
  }
}

async function introspectSchema() {
  if (!props.request.url) return
  
  isLoadingSchema.value = true
  schemaError.value = null
  
  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        types {
          name
          kind
          description
          fields(includeDeprecated: true) {
            name
            description
            args {
              name
              description
              type {
                kind
                name
                ofType { kind name ofType { kind name } }
              }
            }
            type {
              kind
              name
              ofType { kind name ofType { kind name } }
            }
          }
          inputFields {
            name
            description
            type {
              kind
              name
              ofType { kind name }
            }
          }
          enumValues { name description }
        }
        queryType { name }
        mutationType { name }
        subscriptionType { name }
      }
    }
  `
  
  try {
    const response = await fetch(props.request.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(
          props.request.headers
            .filter(h => h.enabled)
            .map(h => [h.key, h.value])
        )
      },
      body: JSON.stringify({ query: introspectionQuery })
    })
    
    const data = await response.json()
    if (data.data?.__schema) {
      schema.value = data.data.__schema
    } else if (data.errors) {
      schemaError.value = data.errors[0]?.message || 'Schema introspection failed'
    }
  } catch (e) {
    schemaError.value = e instanceof Error ? e.message : 'Failed to fetch schema'
  } finally {
    isLoadingSchema.value = false
  }
}

function insertQuery(type: 'query' | 'mutation' | 'subscription') {
  const templates = {
    query: 'query MyQuery {\n  \n}',
    mutation: 'mutation MyMutation {\n  \n}',
    subscription: 'subscription MySubscription {\n  \n}'
  }
  localQuery.value = templates[type]
  emit('update', { ...props.request, query: templates[type] })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- URL Bar -->
    <div class="flex items-center gap-2 p-3 border-b dark:border-surface-700">
      <span class="px-2 py-1 text-xs font-bold bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 rounded">
        GQL
      </span>
      <input
        :value="request.url"
        @input="updateUrl(($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="https://api.example.com/graphql"
        class="flex-1 input font-mono text-sm"
      />
      <button
        @click="introspectSchema"
        :disabled="isLoadingSchema || !request.url"
        class="btn btn-secondary text-sm"
        title="Fetch GraphQL schema"
      >
        <svg v-if="isLoadingSchema" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span v-else>Schema</span>
      </button>
      <button
        @click="emit('send')"
        :disabled="!request.url || !request.query"
        class="btn btn-primary"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Execute
      </button>
    </div>
    
    <!-- Tabs -->
    <div class="flex border-b dark:border-surface-700">
      <button
        v-for="tab in ['query', 'variables', 'headers', 'auth'] as const"
        :key="tab"
        @click="activeTab = tab"
        class="tab"
        :class="activeTab === tab ? 'tab-active' : ''"
      >
        {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
      </button>
    </div>
    
    <!-- Tab Content -->
    <div class="flex-1 overflow-auto p-3">
      <!-- Query Editor -->
      <div v-if="activeTab === 'query'" class="h-full flex flex-col">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs text-surface-500">Quick insert:</span>
          <button @click="insertQuery('query')" class="text-xs px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600">
            Query
          </button>
          <button @click="insertQuery('mutation')" class="text-xs px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600">
            Mutation
          </button>
          <button @click="insertQuery('subscription')" class="text-xs px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600">
            Subscription
          </button>
          <div class="flex-1"></div>
          <button @click="formatQuery" class="btn btn-secondary text-xs">
            Format
          </button>
        </div>
        <textarea
          :value="localQuery"
          @input="updateQuery(($event.target as HTMLTextAreaElement).value)"
          placeholder="query {
  users {
    id
    name
  }
}"
          class="flex-1 input font-mono text-sm resize-none"
          spellcheck="false"
        />
      </div>
      
      <!-- Variables Editor -->
      <div v-else-if="activeTab === 'variables'" class="h-full flex flex-col">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-surface-500">JSON variables for the query</span>
          <button @click="formatVariables" class="btn btn-secondary text-xs">
            Format
          </button>
        </div>
        <textarea
          :value="localVariables"
          @input="updateVariables(($event.target as HTMLTextAreaElement).value)"
          placeholder='{
  "id": "123"
}'
          class="flex-1 input font-mono text-sm resize-none"
          :class="{ 'border-red-500': queryError }"
          spellcheck="false"
        />
        <p v-if="queryError" class="text-xs text-red-500 mt-1">{{ queryError }}</p>
      </div>
      
      <!-- Headers -->
      <div v-else-if="activeTab === 'headers'">
        <KeyValueEditor
          :items="request.headers"
          @update="updateHeaders"
          placeholder-key="Header name"
          placeholder-value="Value"
        />
      </div>
      
      <!-- Auth -->
      <div v-else-if="activeTab === 'auth'">
        <AuthEditor
          :auth="request.auth"
          @update="updateAuth"
        />
      </div>
    </div>
    
    <!-- Schema Sidebar (if loaded) -->
    <div v-if="schema" class="border-t dark:border-surface-700 max-h-48 overflow-auto">
      <div class="p-2 bg-surface-50 dark:bg-surface-900">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-surface-700 dark:text-surface-300">Schema Explorer</span>
          <button @click="schema = null" class="text-xs text-surface-400 hover:text-surface-600">
            Close
          </button>
        </div>
        <div class="text-xs space-y-1">
          <div v-if="schema.queryType" class="text-green-600 dark:text-green-400">
            Query: {{ schema.queryType }}
          </div>
          <div v-if="schema.mutationType" class="text-orange-600 dark:text-orange-400">
            Mutation: {{ schema.mutationType }}
          </div>
          <div v-if="schema.subscriptionType" class="text-purple-600 dark:text-purple-400">
            Subscription: {{ schema.subscriptionType }}
          </div>
          <div class="text-surface-500">
            {{ schema.types.length }} types available
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="schemaError" class="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
      {{ schemaError }}
    </div>
  </div>
</template>
