import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { AppSettings } from '@/types'

const defaultSettings: AppSettings = {
  theme: 'system',
  fontSize: 14,
  fontFamily: 'JetBrains Mono',
  autoSave: true,
  timeout: 30000,
  followRedirects: true,
  validateSSL: true,
  proxyEnabled: false,
  shortcuts: {
    send: 'Ctrl+Enter',
    newTab: 'Ctrl+T',
    closeTab: 'Ctrl+W',
    saveRequest: 'Ctrl+S',
    focusUrl: 'Ctrl+L',
    toggleSidebar: 'Ctrl+B',
    commandPalette: 'Ctrl+Shift+P',
    switchEnv: 'Ctrl+E',
    nextTab: 'Ctrl+Tab',
    prevTab: 'Ctrl+Shift+Tab'
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...defaultSettings })
  const isDark = ref(false)

  function updateSettings(updates: Partial<AppSettings>) {
    Object.assign(settings.value, updates)
    applyTheme()
  }

  function resetSettings() {
    settings.value = { ...defaultSettings }
    applyTheme()
  }

  function applyTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (settings.value.theme === 'dark' || (settings.value.theme === 'system' && prefersDark)) {
      document.documentElement.classList.add('dark')
      isDark.value = true
    } else {
      document.documentElement.classList.remove('dark')
      isDark.value = false
    }
  }

  function toggleTheme() {
    if (settings.value.theme === 'light') {
      updateSettings({ theme: 'dark' })
    } else if (settings.value.theme === 'dark') {
      updateSettings({ theme: 'system' })
    } else {
      updateSettings({ theme: 'light' })
    }
  }

  function loadFromStorage(data: AppSettings) {
    settings.value = { ...defaultSettings, ...data }
    applyTheme()
  }

  function init() {
    applyTheme()
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (settings.value.theme === 'system') {
        applyTheme()
      }
    })
  }

  return {
    settings,
    isDark,
    updateSettings,
    resetSettings,
    applyTheme,
    toggleTheme,
    loadFromStorage,
    init
  }
})
