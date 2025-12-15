<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTabsStore } from '@/stores/tabs'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSettingsStore } from '@/stores/settings'

const emit = defineEmits<{
  close: []
}>()

const tabsStore = useTabsStore()
const workspaceStore = useWorkspaceStore()
const settingsStore = useSettingsStore()

const searchQuery = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

interface Command {
  id: string
  label: string
  description?: string
  shortcut?: string
  action: () => void
  category: string
}

const commands: Command[] = [
  {
    id: 'new-request',
    label: 'New Request',
    description: 'Create a new request tab',
    shortcut: 'Ctrl+T',
    action: () => tabsStore.createTab(),
    category: 'Tabs'
  },
  {
    id: 'close-tab',
    label: 'Close Current Tab',
    shortcut: 'Ctrl+W',
    action: () => tabsStore.activeTabId && tabsStore.closeTab(tabsStore.activeTabId),
    category: 'Tabs'
  },
  {
    id: 'close-all-tabs',
    label: 'Close All Tabs',
    action: () => tabsStore.closeAllTabs(),
    category: 'Tabs'
  },
  {
    id: 'duplicate-tab',
    label: 'Duplicate Current Tab',
    action: () => tabsStore.activeTabId && tabsStore.duplicateTab(tabsStore.activeTabId),
    category: 'Tabs'
  },
  {
    id: 'new-collection',
    label: 'New Collection',
    description: 'Create a new collection',
    action: () => {
      const name = prompt('Collection name:')
      if (name) workspaceStore.createCollection(name)
    },
    category: 'Collections'
  },
  {
    id: 'new-environment',
    label: 'New Environment',
    description: 'Create a new environment',
    action: () => {
      const name = prompt('Environment name:')
      if (name) workspaceStore.createEnvironment(name)
    },
    category: 'Environments'
  },
  {
    id: 'toggle-theme',
    label: 'Toggle Theme',
    description: 'Switch between light, dark, and system theme',
    action: () => settingsStore.toggleTheme(),
    category: 'Settings'
  },
  {
    id: 'clear-history',
    label: 'Clear History',
    description: 'Clear all request history',
    action: () => workspaceStore.clearHistory(),
    category: 'History'
  }
]

const filteredCommands = computed(() => {
  if (!searchQuery.value) return commands
  
  const query = searchQuery.value.toLowerCase()
  return commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query) ||
    cmd.description?.toLowerCase().includes(query) ||
    cmd.category.toLowerCase().includes(query)
  )
})

function executeCommand(command: Command) {
  command.action()
  emit('close')
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, filteredCommands.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (filteredCommands.value[selectedIndex.value]) {
      executeCommand(filteredCommands.value[selectedIndex.value])
    }
  }
}

onMounted(() => {
  inputRef.value?.focus()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-start justify-center pt-24 z-50" @click.self="emit('close')">
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-2xl w-[500px] overflow-hidden">
      <div class="p-3 border-b dark:border-surface-700">
        <input
          ref="inputRef"
          v-model="searchQuery"
          type="text"
          placeholder="Type a command or search..."
          class="w-full px-3 py-2 bg-surface-100 dark:bg-surface-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-diamond-500"
          @input="selectedIndex = 0"
        />
      </div>
      
      <div class="max-h-80 overflow-auto">
        <div v-if="filteredCommands.length === 0" class="p-4 text-center text-surface-500">
          No commands found
        </div>
        
        <div
          v-for="(command, index) in filteredCommands"
          :key="command.id"
          @click="executeCommand(command)"
          class="flex items-center justify-between px-4 py-2.5 cursor-pointer"
          :class="index === selectedIndex ? 'bg-diamond-50 dark:bg-diamond-900/20' : 'hover:bg-surface-50 dark:hover:bg-surface-700'"
        >
          <div>
            <p class="text-sm font-medium" :class="index === selectedIndex ? 'text-diamond-700 dark:text-diamond-400' : ''">
              {{ command.label }}
            </p>
            <p v-if="command.description" class="text-xs text-surface-500">
              {{ command.description }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-surface-400 px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700">
              {{ command.category }}
            </span>
            <kbd v-if="command.shortcut" class="text-xs px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300">
              {{ command.shortcut }}
            </kbd>
          </div>
        </div>
      </div>
      
      <div class="p-2 border-t dark:border-surface-700 flex items-center justify-between text-xs text-surface-500">
        <span>
          <kbd class="px-1 py-0.5 rounded bg-surface-200 dark:bg-surface-700">↑↓</kbd> to navigate
          <kbd class="ml-2 px-1 py-0.5 rounded bg-surface-200 dark:bg-surface-700">Enter</kbd> to select
          <kbd class="ml-2 px-1 py-0.5 rounded bg-surface-200 dark:bg-surface-700">Esc</kbd> to close
        </span>
      </div>
    </div>
  </div>
</template>
