<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Environment, Variable } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const workspaceStore = useWorkspaceStore()

const showNewEnvModal = ref(false)
const showEditEnvModal = ref(false)
const newEnvName = ref('')
const editingEnv = ref<Environment | null>(null)
const editingVariables = ref<Variable[]>([])

const environments = computed(() => workspaceStore.activeWorkspace?.environments ?? [])
const activeEnvId = computed(() => workspaceStore.activeWorkspace?.activeEnvironmentId)

function createEnvironment() {
  if (newEnvName.value.trim()) {
    workspaceStore.createEnvironment(newEnvName.value.trim())
    newEnvName.value = ''
    showNewEnvModal.value = false
  }
}

function selectEnvironment(id: string | null) {
  workspaceStore.setActiveEnvironment(id)
}

function editEnvironment(env: Environment) {
  editingEnv.value = env
  editingVariables.value = JSON.parse(JSON.stringify(env.variables))
  showEditEnvModal.value = true
}

function saveEnvironment() {
  if (editingEnv.value) {
    workspaceStore.updateEnvironment(editingEnv.value.id, {
      variables: editingVariables.value
    })
    showEditEnvModal.value = false
    editingEnv.value = null
  }
}

function addVariable() {
  editingVariables.value.push({
    id: uuidv4(),
    key: '',
    value: '',
    type: 'text',
    enabled: true
  })
}

function removeVariable(index: number) {
  editingVariables.value.splice(index, 1)
}

function deleteEnvironment(env: Environment) {
  if (confirm(`Delete environment "${env.name}"?`)) {
    workspaceStore.deleteEnvironment(env.id)
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-medium text-surface-500 uppercase tracking-wider">Environments</span>
      <button
        @click="showNewEnvModal = true"
        class="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
        title="New Environment"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
    
    <div class="mb-3">
      <select
        :value="activeEnvId ?? ''"
        @change="selectEnvironment(($event.target as HTMLSelectElement).value || null)"
        class="select text-sm"
      >
        <option value="">No Environment</option>
        <option v-for="env in environments" :key="env.id" :value="env.id">
          {{ env.name }}
        </option>
      </select>
    </div>
    
    <div v-if="environments.length === 0" class="text-center py-4 text-surface-400 text-sm">
      <p>No environments yet</p>
    </div>
    
    <div
      v-for="env in environments"
      :key="env.id"
      class="flex items-center gap-2 p-2 rounded-md hover:bg-surface-200 dark:hover:bg-surface-800 group"
    >
      <div
        class="w-2 h-2 rounded-full"
        :class="activeEnvId === env.id ? 'bg-emerald-500' : 'bg-surface-300 dark:bg-surface-600'"
      />
      <span class="flex-1 text-sm truncate text-surface-700 dark:text-surface-300">
        {{ env.name }}
      </span>
      <span class="text-xs text-surface-400">{{ env.variables.length }} vars</span>
      <button
        @click="editEnvironment(env)"
        class="p-1 rounded hover:bg-surface-300 dark:hover:bg-surface-700 opacity-0 group-hover:opacity-100"
      >
        <svg class="w-3 h-3 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
    
    <Teleport to="body">
      <div v-if="showNewEnvModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showNewEnvModal = false">
        <div class="bg-white dark:bg-surface-800 rounded-lg shadow-xl w-96 p-4">
          <h3 class="text-lg font-semibold mb-4">New Environment</h3>
          <input
            v-model="newEnvName"
            type="text"
            placeholder="Environment name (e.g., Development, Staging, Production)"
            class="input mb-4"
            @keydown.enter="createEnvironment"
            autofocus
          />
          <div class="flex justify-end gap-2">
            <button @click="showNewEnvModal = false" class="btn btn-secondary">Cancel</button>
            <button @click="createEnvironment" class="btn btn-primary" :disabled="!newEnvName.trim()">Create</button>
          </div>
        </div>
      </div>
      
      <div v-if="showEditEnvModal && editingEnv" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showEditEnvModal = false">
        <div class="bg-white dark:bg-surface-800 rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
          <div class="p-4 border-b dark:border-surface-700 flex items-center justify-between">
            <h3 class="text-lg font-semibold">{{ editingEnv.name }}</h3>
            <button
              @click="deleteEnvironment(editingEnv)"
              class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
              title="Delete environment"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          
          <div class="flex-1 overflow-auto p-4">
            <div class="space-y-2">
              <div class="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 text-xs font-medium text-surface-500 uppercase px-1">
                <span></span>
                <span>Variable</span>
                <span>Value</span>
                <span>Type</span>
                <span></span>
              </div>
              
              <div
                v-for="(variable, index) in editingVariables"
                :key="variable.id"
                class="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 items-center"
              >
                <input
                  type="checkbox"
                  v-model="variable.enabled"
                  class="w-4 h-4 rounded border-surface-300 text-diamond-600 focus:ring-diamond-500"
                />
                <input
                  v-model="variable.key"
                  type="text"
                  placeholder="Variable name"
                  class="input text-sm"
                />
                <input
                  v-model="variable.value"
                  :type="variable.type === 'secret' ? 'password' : 'text'"
                  placeholder="Value"
                  class="input text-sm font-mono"
                />
                <select
                  v-model="variable.type"
                  class="select text-sm w-20"
                >
                  <option value="text">Text</option>
                  <option value="secret">Secret</option>
                </select>
                <button
                  @click="removeVariable(index)"
                  class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <button
                @click="addVariable"
                class="w-full py-2 border-2 border-dashed rounded-lg text-sm text-surface-500 hover:border-diamond-500 hover:text-diamond-600 transition-colors"
              >
                + Add Variable
              </button>
            </div>
          </div>
          
          <div class="p-4 border-t dark:border-surface-700 flex justify-end gap-2">
            <button @click="showEditEnvModal = false" class="btn btn-secondary">Cancel</button>
            <button @click="saveEnvironment" class="btn btn-primary">Save Changes</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
