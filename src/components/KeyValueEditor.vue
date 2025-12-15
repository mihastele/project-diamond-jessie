<script setup lang="ts">
import { computed } from 'vue'
import type { KeyValue } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const props = defineProps<{
  items: KeyValue[]
  placeholderKey?: string
  placeholderValue?: string
}>()

const emit = defineEmits<{
  update: [items: KeyValue[]]
}>()

const itemsWithEmpty = computed(() => {
  const items = [...props.items]
  if (items.length === 0 || items[items.length - 1].key || items[items.length - 1].value) {
    items.push({ id: uuidv4(), key: '', value: '', enabled: true })
  }
  return items
})

function updateItem(index: number, field: keyof KeyValue, value: string | boolean) {
  const newItems = [...props.items]
  
  if (index >= newItems.length) {
    newItems.push({ id: uuidv4(), key: '', value: '', enabled: true })
  }
  
  newItems[index] = { ...newItems[index], [field]: value }
  
  // Remove empty items except the last one
  const filtered = newItems.filter((item, i) => 
    item.key || item.value || i === newItems.length - 1
  )
  
  emit('update', filtered)
}

function removeItem(index: number) {
  const newItems = props.items.filter((_, i) => i !== index)
  emit('update', newItems)
}

function toggleEnabled(index: number) {
  if (index < props.items.length) {
    updateItem(index, 'enabled', !props.items[index].enabled)
  }
}
</script>

<template>
  <div class="space-y-1">
    <div class="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs font-medium text-surface-500 uppercase px-1 pb-1">
      <span class="w-5"></span>
      <span>{{ placeholderKey || 'Key' }}</span>
      <span>{{ placeholderValue || 'Value' }}</span>
      <span class="w-6"></span>
    </div>
    
    <div
      v-for="(item, index) in itemsWithEmpty"
      :key="item.id"
      class="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center group"
    >
      <input
        type="checkbox"
        :checked="item.enabled"
        @change="toggleEnabled(index)"
        class="w-4 h-4 rounded border-surface-300 text-diamond-600 focus:ring-diamond-500"
        :class="{ 'opacity-50': !item.key && !item.value }"
      />
      
      <input
        :value="item.key"
        @input="updateItem(index, 'key', ($event.target as HTMLInputElement).value)"
        type="text"
        :placeholder="placeholderKey || 'Key'"
        class="input text-sm"
        :class="{ 'opacity-60': !item.enabled }"
      />
      
      <input
        :value="item.value"
        @input="updateItem(index, 'value', ($event.target as HTMLInputElement).value)"
        type="text"
        :placeholder="placeholderValue || 'Value'"
        class="input text-sm font-mono"
        :class="{ 'opacity-60': !item.enabled }"
      />
      
      <button
        v-if="item.key || item.value"
        @click="removeItem(index)"
        class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <span v-else class="w-6"></span>
    </div>
  </div>
</template>
