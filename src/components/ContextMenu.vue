<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export interface MenuItem {
  id: string
  label: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  separator?: boolean
}

const props = defineProps<{
  items: MenuItem[]
  x: number
  y: number
}>()

const emit = defineEmits<{
  select: [id: string]
  close: []
}>()

const menuRef = ref<HTMLElement | null>(null)

function handleClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

function selectItem(item: MenuItem) {
  if (item.disabled || item.separator) return
  emit('select', item.id)
  emit('close')
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="menuRef"
      class="fixed z-50 min-w-48 py-1 bg-white dark:bg-surface-800 rounded-lg shadow-lg border dark:border-surface-700"
      :style="{ left: `${x}px`, top: `${y}px` }"
      @contextmenu.prevent
    >
      <template v-for="item in items" :key="item.id">
        <div
          v-if="item.separator"
          class="my-1 border-t dark:border-surface-700"
        />
        <button
          v-else
          @click="selectItem(item)"
          :disabled="item.disabled"
          class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors"
          :class="[
            item.disabled 
              ? 'text-surface-400 cursor-not-allowed' 
              : item.danger 
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
          ]"
        >
          <span v-if="item.icon" class="w-4 h-4 flex items-center justify-center" v-html="item.icon" />
          <span class="flex-1">{{ item.label }}</span>
          <span v-if="item.shortcut" class="text-xs text-surface-400">{{ item.shortcut }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>
