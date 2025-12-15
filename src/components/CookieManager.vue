<script setup lang="ts">
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Cookie, CookieJar } from '@/types'

const props = defineProps<{
  cookies: Cookie[]
}>()

const emit = defineEmits<{
  update: [cookies: Cookie[]]
}>()

const showAddModal = ref(false)
const editingCookie = ref<Cookie | null>(null)

const newCookie = ref<Partial<Cookie>>({
  name: '',
  value: '',
  domain: '',
  path: '/',
  httpOnly: false,
  secure: false,
  sameSite: 'Lax'
})

const groupedCookies = computed(() => {
  const groups: Record<string, Cookie[]> = {}
  for (const cookie of props.cookies) {
    const domain = cookie.domain || 'unknown'
    if (!groups[domain]) groups[domain] = []
    groups[domain].push(cookie)
  }
  return groups
})

function addCookie() {
  if (!newCookie.value.name || !newCookie.value.domain) return
  
  const cookie: Cookie = {
    id: uuidv4(),
    name: newCookie.value.name || '',
    value: newCookie.value.value || '',
    domain: newCookie.value.domain || '',
    path: newCookie.value.path || '/',
    httpOnly: newCookie.value.httpOnly || false,
    secure: newCookie.value.secure || false,
    sameSite: newCookie.value.sameSite || 'Lax',
    expires: newCookie.value.expires
  }
  
  emit('update', [...props.cookies, cookie])
  resetForm()
  showAddModal.value = false
}

function updateCookie() {
  if (!editingCookie.value) return
  
  const updated = props.cookies.map(c => 
    c.id === editingCookie.value?.id ? editingCookie.value : c
  )
  emit('update', updated)
  editingCookie.value = null
}

function deleteCookie(id: string) {
  emit('update', props.cookies.filter(c => c.id !== id))
}

function clearAllCookies() {
  if (confirm('Delete all cookies?')) {
    emit('update', [])
  }
}

function clearDomainCookies(domain: string) {
  emit('update', props.cookies.filter(c => c.domain !== domain))
}

function resetForm() {
  newCookie.value = {
    name: '',
    value: '',
    domain: '',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax'
  }
}

function formatExpiry(expires?: number): string {
  if (!expires) return 'Session'
  const date = new Date(expires)
  if (date.getTime() < Date.now()) return 'Expired'
  return date.toLocaleDateString()
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-3 border-b dark:border-surface-700">
      <div>
        <h3 class="font-medium">Cookies</h3>
        <p class="text-xs text-surface-500">{{ cookies.length }} cookies stored</p>
      </div>
      <div class="flex gap-2">
        <button @click="clearAllCookies" class="btn btn-secondary text-xs" :disabled="cookies.length === 0">
          Clear All
        </button>
        <button @click="showAddModal = true" class="btn btn-primary text-xs">
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Cookie
        </button>
      </div>
    </div>
    
    <!-- Cookie List -->
    <div class="flex-1 overflow-auto">
      <div v-if="cookies.length === 0" class="text-center py-12 text-surface-400">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>No cookies stored</p>
        <p class="text-sm mt-1">Cookies from responses will appear here</p>
      </div>
      
      <div v-else class="divide-y dark:divide-surface-700">
        <div v-for="(domainCookies, domain) in groupedCookies" :key="domain" class="p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-surface-700 dark:text-surface-300">{{ domain }}</span>
            <button 
              @click="clearDomainCookies(domain)" 
              class="text-xs text-surface-400 hover:text-red-500"
            >
              Clear domain
            </button>
          </div>
          
          <div class="space-y-1">
            <div 
              v-for="cookie in domainCookies" 
              :key="cookie.id"
              class="flex items-center gap-3 p-2 rounded bg-surface-50 dark:bg-surface-900 text-sm"
            >
              <div class="flex-1 min-w-0">
                <div class="font-mono text-xs truncate">
                  <span class="text-surface-700 dark:text-surface-300">{{ cookie.name }}</span>
                  <span class="text-surface-400">=</span>
                  <span class="text-surface-500">{{ cookie.value.slice(0, 50) }}{{ cookie.value.length > 50 ? '...' : '' }}</span>
                </div>
                <div class="flex gap-2 mt-1 text-xs text-surface-400">
                  <span>{{ cookie.path }}</span>
                  <span v-if="cookie.secure" class="text-green-600">🔒 Secure</span>
                  <span v-if="cookie.httpOnly" class="text-blue-600">HttpOnly</span>
                  <span>{{ formatExpiry(cookie.expires) }}</span>
                </div>
              </div>
              <div class="flex gap-1">
                <button 
                  @click="editingCookie = { ...cookie }"
                  class="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded"
                  title="Edit"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button 
                  @click="deleteCookie(cookie.id)"
                  class="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                  title="Delete"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add Cookie Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-[500px] p-6">
          <h3 class="text-lg font-semibold mb-4">Add Cookie</h3>
          
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1">Name *</label>
                <input v-model="newCookie.name" type="text" class="input text-sm" placeholder="session_id" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Domain *</label>
                <input v-model="newCookie.domain" type="text" class="input text-sm" placeholder="example.com" />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-1">Value</label>
              <input v-model="newCookie.value" type="text" class="input text-sm" placeholder="abc123" />
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1">Path</label>
                <input v-model="newCookie.path" type="text" class="input text-sm" placeholder="/" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">SameSite</label>
                <select v-model="newCookie.sameSite" class="select text-sm">
                  <option value="Strict">Strict</option>
                  <option value="Lax">Lax</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>
            
            <div class="flex gap-4">
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" v-model="newCookie.secure" class="rounded" />
                Secure
              </label>
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" v-model="newCookie.httpOnly" class="rounded" />
                HttpOnly
              </label>
            </div>
          </div>
          
          <div class="flex justify-end gap-2 mt-6">
            <button @click="showAddModal = false; resetForm()" class="btn btn-secondary">
              Cancel
            </button>
            <button @click="addCookie" class="btn btn-primary" :disabled="!newCookie.name || !newCookie.domain">
              Add Cookie
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <!-- Edit Cookie Modal -->
    <Teleport to="body">
      <div v-if="editingCookie" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-[500px] p-6">
          <h3 class="text-lg font-semibold mb-4">Edit Cookie</h3>
          
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1">Name</label>
                <input v-model="editingCookie.name" type="text" class="input text-sm" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Domain</label>
                <input v-model="editingCookie.domain" type="text" class="input text-sm" />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-1">Value</label>
              <input v-model="editingCookie.value" type="text" class="input text-sm" />
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1">Path</label>
                <input v-model="editingCookie.path" type="text" class="input text-sm" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">SameSite</label>
                <select v-model="editingCookie.sameSite" class="select text-sm">
                  <option value="Strict">Strict</option>
                  <option value="Lax">Lax</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>
            
            <div class="flex gap-4">
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" v-model="editingCookie.secure" class="rounded" />
                Secure
              </label>
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" v-model="editingCookie.httpOnly" class="rounded" />
                HttpOnly
              </label>
            </div>
          </div>
          
          <div class="flex justify-end gap-2 mt-6">
            <button @click="editingCookie = null" class="btn btn-secondary">
              Cancel
            </button>
            <button @click="updateCookie" class="btn btn-primary">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
