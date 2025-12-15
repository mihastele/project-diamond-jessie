<script setup lang="ts">
import { ref } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { 
  importPostmanCollection, 
  exportToPostman, 
  importHarFile,
  importInsomniaCollection,
  exportToDiamond,
  importFromDiamond
} from '@/utils/import-export'
import type { Collection } from '@/types'

const props = defineProps<{
  mode: 'import' | 'export'
  collection?: Collection
}>()

const emit = defineEmits<{
  close: []
  imported: [collection: Collection]
}>()

const workspaceStore = useWorkspaceStore()

const importFormat = ref<'postman' | 'insomnia' | 'har' | 'diamond'>('postman')
const exportFormat = ref<'postman' | 'diamond'>('postman')
const fileContent = ref('')
const error = ref<string | null>(null)
const isDragging = ref(false)

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    readFile(file)
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    readFile(file)
  }
}

function readFile(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    fileContent.value = e.target?.result as string
    error.value = null
  }
  reader.onerror = () => {
    error.value = 'Failed to read file'
  }
  reader.readAsText(file)
}

function importCollection() {
  if (!fileContent.value) {
    error.value = 'Please select a file to import'
    return
  }
  
  try {
    let collection: Collection
    
    switch (importFormat.value) {
      case 'postman':
        collection = importPostmanCollection(fileContent.value)
        break
      case 'insomnia':
        collection = importInsomniaCollection(fileContent.value)
        break
      case 'har':
        collection = importHarFile(fileContent.value)
        break
      case 'diamond':
        collection = importFromDiamond(fileContent.value)
        break
      default:
        throw new Error('Unknown format')
    }
    
    // Add to workspace
    if (workspaceStore.activeWorkspace) {
      workspaceStore.activeWorkspace.collections.push(collection)
    }
    
    emit('imported', collection)
    emit('close')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to import collection'
  }
}

function exportCollection() {
  if (!props.collection) return
  
  try {
    let content: string
    let filename: string
    let mimeType: string
    
    switch (exportFormat.value) {
      case 'postman':
        content = JSON.stringify(exportToPostman(props.collection), null, 2)
        filename = `${props.collection.name}.postman_collection.json`
        mimeType = 'application/json'
        break
      case 'diamond':
        content = exportToDiamond(props.collection)
        filename = `${props.collection.name}.diamond.json`
        mimeType = 'application/json'
        break
      default:
        throw new Error('Unknown format')
    }
    
    // Download file
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    emit('close')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to export collection'
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-2xl w-[500px]">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b dark:border-surface-700">
        <h2 class="text-lg font-semibold">
          {{ mode === 'import' ? 'Import Collection' : 'Export Collection' }}
        </h2>
        <button @click="emit('close')" class="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-4">
        <!-- Import Mode -->
        <template v-if="mode === 'import'">
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2">Import Format</label>
            <div class="flex gap-2">
              <button
                v-for="fmt in ['postman', 'insomnia', 'har', 'diamond'] as const"
                :key="fmt"
                @click="importFormat = fmt"
                class="px-3 py-1.5 text-sm rounded-lg border transition-colors"
                :class="importFormat === fmt 
                  ? 'border-diamond-500 bg-diamond-50 dark:bg-diamond-900/20 text-diamond-700 dark:text-diamond-400'
                  : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'"
              >
                {{ fmt.charAt(0).toUpperCase() + fmt.slice(1) }}
              </button>
            </div>
          </div>
          
          <div 
            class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
            :class="isDragging ? 'border-diamond-500 bg-diamond-50 dark:bg-diamond-900/20' : 'border-surface-300 dark:border-surface-600'"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <input
              type="file"
              accept=".json,.har"
              class="hidden"
              id="file-input"
              @change="handleFileSelect"
            />
            <label for="file-input" class="cursor-pointer">
              <svg class="w-10 h-10 mx-auto mb-3 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="text-surface-600 dark:text-surface-400">
                <span class="text-diamond-600 font-medium">Click to upload</span> or drag and drop
              </p>
              <p class="text-xs text-surface-400 mt-1">JSON or HAR files</p>
            </label>
          </div>
          
          <div v-if="fileContent" class="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-400">
            ✓ File loaded ({{ (fileContent.length / 1024).toFixed(1) }} KB)
          </div>
        </template>
        
        <!-- Export Mode -->
        <template v-else>
          <div v-if="collection" class="mb-4 p-3 bg-surface-50 dark:bg-surface-900 rounded-lg">
            <p class="font-medium">{{ collection.name }}</p>
            <p class="text-sm text-surface-500">{{ collection.items.length }} items</p>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2">Export Format</label>
            <div class="flex gap-2">
              <button
                v-for="fmt in ['postman', 'diamond'] as const"
                :key="fmt"
                @click="exportFormat = fmt"
                class="px-3 py-1.5 text-sm rounded-lg border transition-colors"
                :class="exportFormat === fmt 
                  ? 'border-diamond-500 bg-diamond-50 dark:bg-diamond-900/20 text-diamond-700 dark:text-diamond-400'
                  : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'"
              >
                {{ fmt === 'postman' ? 'Postman v2.1' : 'Diamond (native)' }}
              </button>
            </div>
          </div>
          
          <p class="text-sm text-surface-500">
            {{ exportFormat === 'postman' 
              ? 'Export as Postman Collection v2.1 format, compatible with Postman and other tools.'
              : 'Export in Diamond native format with full feature support.'
            }}
          </p>
        </template>
        
        <!-- Error -->
        <div v-if="error" class="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
          {{ error }}
        </div>
      </div>
      
      <!-- Footer -->
      <div class="flex justify-end gap-2 p-4 border-t dark:border-surface-700">
        <button @click="emit('close')" class="btn btn-secondary">
          Cancel
        </button>
        <button 
          v-if="mode === 'import'"
          @click="importCollection" 
          class="btn btn-primary"
          :disabled="!fileContent"
        >
          Import
        </button>
        <button 
          v-else
          @click="exportCollection" 
          class="btn btn-primary"
          :disabled="!collection"
        >
          Export
        </button>
      </div>
    </div>
  </div>
</template>
