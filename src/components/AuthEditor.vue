<script setup lang="ts">
import { computed } from 'vue'
import type { AuthConfig, AuthType } from '@/types'

const props = defineProps<{
  auth: AuthConfig
}>()

const emit = defineEmits<{
  update: [auth: AuthConfig]
}>()

const authTypes: { value: AuthType; label: string; description: string }[] = [
  { value: 'none', label: 'No Auth', description: 'No authentication' },
  { value: 'bearer', label: 'Bearer Token', description: 'JWT or API token in Authorization header' },
  { value: 'basic', label: 'Basic Auth', description: 'Username and password' },
  { value: 'api-key', label: 'API Key', description: 'Key-value pair in header or query' },
  { value: 'oauth2', label: 'OAuth 2.0', description: 'OAuth 2.0 authorization flow' }
]

function updateType(type: AuthType) {
  const newAuth: AuthConfig = { type }
  
  if (type === 'bearer') {
    newAuth.bearer = { token: '' }
  } else if (type === 'basic') {
    newAuth.basic = { username: '', password: '' }
  } else if (type === 'api-key') {
    newAuth.apiKey = { key: '', value: '', addTo: 'header' }
  } else if (type === 'oauth2') {
    newAuth.oauth2 = {
      grantType: 'authorization_code',
      authUrl: '',
      tokenUrl: '',
      clientId: '',
      clientSecret: '',
      scope: '',
      pkce: true
    }
  }
  
  emit('update', newAuth)
}

function updateBearer(token: string) {
  emit('update', { ...props.auth, bearer: { token } })
}

function updateBasic(field: 'username' | 'password', value: string) {
  emit('update', { 
    ...props.auth, 
    basic: { ...props.auth.basic!, [field]: value } 
  })
}

function updateApiKey(field: 'key' | 'value' | 'addTo', value: string) {
  emit('update', { 
    ...props.auth, 
    apiKey: { ...props.auth.apiKey!, [field]: value } 
  })
}

function updateOAuth2(field: string, value: string | boolean) {
  emit('update', { 
    ...props.auth, 
    oauth2: { ...props.auth.oauth2!, [field]: value } 
  })
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
        Authorization Type
      </label>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <button
          v-for="type in authTypes"
          :key="type.value"
          @click="updateType(type.value)"
          class="p-3 rounded-lg border text-left transition-all"
          :class="auth.type === type.value 
            ? 'border-diamond-500 bg-diamond-50 dark:bg-diamond-900/20' 
            : 'hover:border-surface-300 dark:hover:border-surface-600'"
        >
          <span class="block text-sm font-medium" :class="auth.type === type.value ? 'text-diamond-700 dark:text-diamond-400' : ''">
            {{ type.label }}
          </span>
          <span class="block text-xs text-surface-500 mt-0.5">{{ type.description }}</span>
        </button>
      </div>
    </div>
    
    <div v-if="auth.type === 'none'" class="text-center py-8 text-surface-400">
      <svg class="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
      <p>This request does not require authentication</p>
    </div>
    
    <div v-else-if="auth.type === 'bearer'" class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          Token
        </label>
        <input
          :value="auth.bearer?.token"
          @input="updateBearer(($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Enter your token or use {{variable}}"
          class="input font-mono text-sm"
        />
        <p class="text-xs text-surface-500 mt-1">The token will be sent as: Authorization: Bearer &lt;token&gt;</p>
      </div>
    </div>
    
    <div v-else-if="auth.type === 'basic'" class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          Username
        </label>
        <input
          :value="auth.basic?.username"
          @input="updateBasic('username', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Username"
          class="input"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          Password
        </label>
        <input
          :value="auth.basic?.password"
          @input="updateBasic('password', ($event.target as HTMLInputElement).value)"
          type="password"
          placeholder="Password"
          class="input"
        />
      </div>
    </div>
    
    <div v-else-if="auth.type === 'api-key'" class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Key
          </label>
          <input
            :value="auth.apiKey?.key"
            @input="updateApiKey('key', ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="X-API-Key"
            class="input"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Value
          </label>
          <input
            :value="auth.apiKey?.value"
            @input="updateApiKey('value', ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="Your API key"
            class="input font-mono"
          />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          Add to
        </label>
        <select
          :value="auth.apiKey?.addTo"
          @change="updateApiKey('addTo', ($event.target as HTMLSelectElement).value)"
          class="select"
        >
          <option value="header">Header</option>
          <option value="query">Query Parameter</option>
        </select>
      </div>
    </div>
    
    <div v-else-if="auth.type === 'oauth2'" class="space-y-3">
      <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p class="text-sm text-amber-800 dark:text-amber-200">
          OAuth 2.0 flow requires the Tauri desktop app for secure token handling.
        </p>
      </div>
      
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Grant Type
          </label>
          <select
            :value="auth.oauth2?.grantType"
            @change="updateOAuth2('grantType', ($event.target as HTMLSelectElement).value)"
            class="select"
          >
            <option value="authorization_code">Authorization Code</option>
            <option value="client_credentials">Client Credentials</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            PKCE
          </label>
          <label class="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              :checked="auth.oauth2?.pkce"
              @change="updateOAuth2('pkce', ($event.target as HTMLInputElement).checked)"
              class="w-4 h-4 rounded border-surface-300 text-diamond-600 focus:ring-diamond-500"
            />
            <span class="text-sm">Enable PKCE</span>
          </label>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          Authorization URL
        </label>
        <input
          :value="auth.oauth2?.authUrl"
          @input="updateOAuth2('authUrl', ($event.target as HTMLInputElement).value)"
          type="url"
          placeholder="https://example.com/oauth/authorize"
          class="input font-mono text-sm"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          Token URL
        </label>
        <input
          :value="auth.oauth2?.tokenUrl"
          @input="updateOAuth2('tokenUrl', ($event.target as HTMLInputElement).value)"
          type="url"
          placeholder="https://example.com/oauth/token"
          class="input font-mono text-sm"
        />
      </div>
      
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Client ID
          </label>
          <input
            :value="auth.oauth2?.clientId"
            @input="updateOAuth2('clientId', ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="Client ID"
            class="input font-mono"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Client Secret
          </label>
          <input
            :value="auth.oauth2?.clientSecret"
            @input="updateOAuth2('clientSecret', ($event.target as HTMLInputElement).value)"
            type="password"
            placeholder="Client Secret"
            class="input font-mono"
          />
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          Scope
        </label>
        <input
          :value="auth.oauth2?.scope"
          @input="updateOAuth2('scope', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="read write"
          class="input"
        />
      </div>
    </div>
  </div>
</template>
