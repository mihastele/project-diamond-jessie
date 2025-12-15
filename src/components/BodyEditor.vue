<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RequestBody, BodyType, KeyValue } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import KeyValueEditor from './KeyValueEditor.vue'

const props = defineProps<{
  body: RequestBody
}>()

const emit = defineEmits<{
  update: [body: RequestBody]
}>()

const bodyTypes: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'text', label: 'Text' },
  { value: 'form-data', label: 'Form Data' },
  { value: 'x-www-form-urlencoded', label: 'URL Encoded' },
  { value: 'binary', label: 'Binary' },
  { value: 'file', label: 'File' }
]

const localRaw = ref(props.body.raw || '')
const jsonError = ref<string | null>(null)
const placeholderText = computed(() => {
  switch (props.body.type) {
    case 'json':
      return '{\n  "key": "value"\n}'
    case 'xml':
      return '<?xml version="1.0"?>\n<root></root>'
    default:
      return 'Enter text...'
  }
})

watch(() => props.body.raw, (newVal) => {
  if (newVal !== localRaw.value) {
    localRaw.value = newVal || ''
  }
})

function updateType(type: BodyType) {
  emit('update', { ...props.body, type })
}

function updateRaw(value: string) {
  localRaw.value = value
  jsonError.value = null
  
  if (props.body.type === 'json' && value.trim()) {
    try {
      JSON.parse(value)
    } catch (e) {
      jsonError.value = e instanceof Error ? e.message : 'Invalid JSON'
    }
  }
  
  emit('update', { ...props.body, raw: value })
}

function formatJson() {
  if (props.body.type !== 'json' || !localRaw.value.trim()) return
  
  try {
    const parsed = JSON.parse(localRaw.value)
    const formatted = JSON.stringify(parsed, null, 2)
    localRaw.value = formatted
    jsonError.value = null
    emit('update', { ...props.body, raw: formatted })
  } catch (e) {
    jsonError.value = e instanceof Error ? e.message : 'Invalid JSON'
  }
}

function updateFormData(items: KeyValue[]) {
  emit('update', { ...props.body, formData: items })
}

function updateUrlEncoded(items: KeyValue[]) {
  emit('update', { ...props.body, urlEncoded: items })
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <select
        :value="body.type"
        @change="updateType(($event.target as HTMLSelectElement).value as BodyType)"
        class="select w-48"
      >
        <option v-for="type in bodyTypes" :key="type.value" :value="type.value">
          {{ type.label }}
        </option>
      </select>
      
      <button
        v-if="body.type === 'json'"
        @click="formatJson"
        class="btn btn-secondary text-xs"
        title="Format JSON (Ctrl+Shift+F)"
      >
        Format
      </button>
      
      <span v-if="jsonError" class="text-xs text-red-500">{{ jsonError }}</span>
    </div>
    
    <div v-if="body.type === 'none'" class="text-center py-8 text-surface-400">
      <p>This request does not have a body</p>
    </div>
    
    <div v-else-if="body.type === 'json' || body.type === 'xml' || body.type === 'text'" class="flex-1">
      <textarea
        :value="localRaw"
        @input="updateRaw(($event.target as HTMLTextAreaElement).value)"
        :placeholder="placeholderText"
        class="input font-mono text-sm min-h-[200px] resize-y"
        :class="{ 'border-red-500 focus:ring-red-500': jsonError }"
        spellcheck="false"
      />
    </div>
    
    <div v-else-if="body.type === 'form-data'">
      <KeyValueEditor
        :items="body.formData || []"
        @update="updateFormData"
        placeholder-key="Field name"
        placeholder-value="Value"
      />
    </div>
    
    <div v-else-if="body.type === 'x-www-form-urlencoded'">
      <KeyValueEditor
        :items="body.urlEncoded || []"
        @update="updateUrlEncoded"
        placeholder-key="Field name"
        placeholder-value="Value"
      />
    </div>
    
    <div v-else-if="body.type === 'binary' || body.type === 'file'" class="text-center py-8">
      <div class="border-2 border-dashed rounded-lg p-8 hover:border-diamond-500 transition-colors cursor-pointer">
        <svg class="w-10 h-10 mx-auto mb-3 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="text-surface-500">Click to select a file or drag and drop</p>
        <p class="text-xs text-surface-400 mt-1">File upload will be available in the Tauri version</p>
      </div>
    </div>
  </div>
</template>
