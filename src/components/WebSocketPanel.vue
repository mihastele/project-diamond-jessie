<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type { WebSocketRequest, WebSocketMessage, WebSocketConnection, KeyValue } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import KeyValueEditor from './KeyValueEditor.vue'
import AuthEditor from './AuthEditor.vue'

const props = defineProps<{
  request: WebSocketRequest
}>()

const emit = defineEmits<{
  update: [request: WebSocketRequest]
}>()

const activeTab = ref<'messages' | 'headers' | 'auth'>('messages')
const connection = ref<WebSocketConnection | null>(null)
const socket = ref<WebSocket | null>(null)
const messageInput = ref('')
const messageFilter = ref('')
const autoScroll = ref(true)

const filteredMessages = computed(() => {
  if (!connection.value) return []
  if (!messageFilter.value) return connection.value.messages
  
  const filter = messageFilter.value.toLowerCase()
  return connection.value.messages.filter(m => 
    m.data.toLowerCase().includes(filter)
  )
})

const connectionStatus = computed(() => connection.value?.status || 'disconnected')

function updateUrl(url: string) {
  emit('update', { ...props.request, url })
}

function updateHeaders(headers: KeyValue[]) {
  emit('update', { ...props.request, headers })
}

function updateAuth(auth: typeof props.request.auth) {
  emit('update', { ...props.request, auth })
}

function connect() {
  if (!props.request.url) return
  
  // Initialize connection state
  connection.value = {
    id: uuidv4(),
    request: props.request,
    status: 'connecting',
    messages: []
  }
  
  try {
    // Create WebSocket with protocols if specified
    const ws = props.request.protocols?.length 
      ? new WebSocket(props.request.url, props.request.protocols)
      : new WebSocket(props.request.url)
    
    socket.value = ws
    
    ws.onopen = () => {
      if (connection.value) {
        connection.value.status = 'connected'
        connection.value.connectedAt = Date.now()
      }
    }
    
    ws.onmessage = (event) => {
      if (connection.value) {
        const message: WebSocketMessage = {
          id: uuidv4(),
          type: typeof event.data === 'string' ? 'text' : 'binary',
          direction: 'received',
          data: typeof event.data === 'string' ? event.data : '[Binary Data]',
          timestamp: Date.now(),
          size: typeof event.data === 'string' ? event.data.length : 0
        }
        connection.value.messages.push(message)
      }
    }
    
    ws.onerror = () => {
      if (connection.value) {
        connection.value.status = 'error'
        connection.value.error = 'Connection error'
      }
    }
    
    ws.onclose = (event) => {
      if (connection.value) {
        connection.value.status = 'disconnected'
        connection.value.disconnectedAt = Date.now()
        if (!event.wasClean) {
          connection.value.error = `Connection closed: ${event.code} ${event.reason || ''}`
        }
      }
      socket.value = null
    }
  } catch (e) {
    if (connection.value) {
      connection.value.status = 'error'
      connection.value.error = e instanceof Error ? e.message : 'Failed to connect'
    }
  }
}

function disconnect() {
  if (socket.value) {
    socket.value.close(1000, 'User disconnected')
    socket.value = null
  }
}

function sendMessage() {
  if (!socket.value || socket.value.readyState !== WebSocket.OPEN || !messageInput.value) return
  
  socket.value.send(messageInput.value)
  
  if (connection.value) {
    const message: WebSocketMessage = {
      id: uuidv4(),
      type: 'text',
      direction: 'sent',
      data: messageInput.value,
      timestamp: Date.now(),
      size: messageInput.value.length
    }
    connection.value.messages.push(message)
  }
  
  messageInput.value = ''
}

function sendPing() {
  // Note: Browser WebSocket API doesn't expose ping/pong frames directly
  // This is a placeholder that sends a text message
  if (!socket.value || socket.value.readyState !== WebSocket.OPEN) return
  
  const pingMessage = JSON.stringify({ type: 'ping', timestamp: Date.now() })
  socket.value.send(pingMessage)
  
  if (connection.value) {
    connection.value.messages.push({
      id: uuidv4(),
      type: 'ping',
      direction: 'sent',
      data: pingMessage,
      timestamp: Date.now(),
      size: pingMessage.length
    })
  }
}

function clearMessages() {
  if (connection.value) {
    connection.value.messages = []
  }
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

onUnmounted(() => {
  disconnect()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- URL Bar -->
    <div class="flex items-center gap-2 p-3 border-b dark:border-surface-700">
      <span class="px-2 py-1 text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
        WS
      </span>
      <input
        :value="request.url"
        @input="updateUrl(($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="wss://example.com/socket"
        class="flex-1 input font-mono text-sm"
        :disabled="connectionStatus === 'connected'"
      />
      <button
        v-if="connectionStatus !== 'connected'"
        @click="connect"
        :disabled="!request.url"
        class="btn btn-primary"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Connect
      </button>
      <button
        v-else
        @click="disconnect"
        class="btn bg-red-500 hover:bg-red-600 text-white"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Disconnect
      </button>
    </div>
    
    <!-- Connection Status -->
    <div class="flex items-center gap-2 px-3 py-1.5 text-xs border-b dark:border-surface-700"
         :class="{
           'bg-green-50 dark:bg-green-900/20': connectionStatus === 'connected',
           'bg-yellow-50 dark:bg-yellow-900/20': connectionStatus === 'connecting',
           'bg-red-50 dark:bg-red-900/20': connectionStatus === 'error',
           'bg-surface-50 dark:bg-surface-900': connectionStatus === 'disconnected'
         }">
      <span class="w-2 h-2 rounded-full"
            :class="{
              'bg-green-500': connectionStatus === 'connected',
              'bg-yellow-500 animate-pulse': connectionStatus === 'connecting',
              'bg-red-500': connectionStatus === 'error',
              'bg-surface-400': connectionStatus === 'disconnected'
            }"></span>
      <span class="font-medium capitalize">{{ connectionStatus }}</span>
      <span v-if="connection?.connectedAt && connectionStatus === 'connected'" class="text-surface-500">
        since {{ formatTimestamp(connection.connectedAt) }}
      </span>
      <span v-if="connection?.error" class="text-red-600 dark:text-red-400">
        {{ connection.error }}
      </span>
      <span v-if="connection" class="ml-auto text-surface-500">
        {{ connection.messages.length }} messages
      </span>
    </div>
    
    <!-- Tabs -->
    <div class="flex border-b dark:border-surface-700">
      <button
        v-for="tab in ['messages', 'headers', 'auth'] as const"
        :key="tab"
        @click="activeTab = tab"
        class="tab"
        :class="activeTab === tab ? 'tab-active' : ''"
      >
        {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
      </button>
    </div>
    
    <!-- Tab Content -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- Messages -->
      <template v-if="activeTab === 'messages'">
        <!-- Message Controls -->
        <div class="flex items-center gap-2 p-2 border-b dark:border-surface-700">
          <input
            v-model="messageFilter"
            type="text"
            placeholder="Filter messages..."
            class="input text-sm py-1"
          />
          <button @click="clearMessages" class="btn btn-secondary text-xs" :disabled="!connection?.messages.length">
            Clear
          </button>
          <label class="flex items-center gap-1 text-xs text-surface-500">
            <input type="checkbox" v-model="autoScroll" class="rounded" />
            Auto-scroll
          </label>
        </div>
        
        <!-- Messages List -->
        <div class="flex-1 overflow-auto p-2 space-y-1 bg-surface-50 dark:bg-surface-950">
          <div v-if="!connection || filteredMessages.length === 0" class="text-center py-8 text-surface-400">
            <p v-if="!connection">Connect to see messages</p>
            <p v-else>No messages yet</p>
          </div>
          
          <div
            v-for="msg in filteredMessages"
            :key="msg.id"
            class="flex gap-2 p-2 rounded text-sm font-mono"
            :class="msg.direction === 'sent' 
              ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
              : 'bg-green-50 dark:bg-green-900/20 border-l-2 border-green-500'"
          >
            <div class="flex-shrink-0 text-xs text-surface-400 w-20">
              {{ formatTimestamp(msg.timestamp) }}
            </div>
            <div class="flex-shrink-0">
              <span v-if="msg.direction === 'sent'" class="text-blue-600 dark:text-blue-400">→</span>
              <span v-else class="text-green-600 dark:text-green-400">←</span>
            </div>
            <div class="flex-1 break-all whitespace-pre-wrap">{{ msg.data }}</div>
            <div class="flex-shrink-0 text-xs text-surface-400">
              {{ formatSize(msg.size) }}
            </div>
          </div>
        </div>
        
        <!-- Send Message -->
        <div class="p-2 border-t dark:border-surface-700">
          <div class="flex gap-2">
            <textarea
              v-model="messageInput"
              @keydown.enter.ctrl="sendMessage"
              placeholder="Type message... (Ctrl+Enter to send)"
              class="flex-1 input font-mono text-sm resize-none"
              rows="2"
              :disabled="connectionStatus !== 'connected'"
            />
            <div class="flex flex-col gap-1">
              <button
                @click="sendMessage"
                :disabled="connectionStatus !== 'connected' || !messageInput"
                class="btn btn-primary text-sm flex-1"
              >
                Send
              </button>
              <button
                @click="sendPing"
                :disabled="connectionStatus !== 'connected'"
                class="btn btn-secondary text-xs"
                title="Send ping"
              >
                Ping
              </button>
            </div>
          </div>
        </div>
      </template>
      
      <!-- Headers -->
      <div v-else-if="activeTab === 'headers'" class="flex-1 overflow-auto p-3">
        <p class="text-xs text-surface-500 mb-2">
          Note: Browser WebSocket API has limited header support. Use subprotocols for authentication.
        </p>
        <KeyValueEditor
          :items="request.headers"
          @update="updateHeaders"
          placeholder-key="Header name"
          placeholder-value="Value"
        />
        <div class="mt-4">
          <label class="block text-sm font-medium mb-1">Subprotocols (comma-separated)</label>
          <input
            :value="request.protocols?.join(', ') || ''"
            @input="emit('update', { ...request, protocols: ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) })"
            type="text"
            placeholder="graphql-ws, json"
            class="input text-sm"
          />
        </div>
      </div>
      
      <!-- Auth -->
      <div v-else-if="activeTab === 'auth'" class="flex-1 overflow-auto p-3">
        <AuthEditor
          :auth="request.auth"
          @update="updateAuth"
        />
      </div>
    </div>
  </div>
</template>
