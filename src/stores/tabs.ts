import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { RequestTab, HttpRequest, HttpResponse, HttpMethod } from '@/types'

function createDefaultRequest(): HttpRequest {
  return {
    id: uuidv4(),
    name: 'New Request',
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    cookies: [],
    body: { type: 'none' },
    auth: { type: 'none' }
  }
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<RequestTab[]>([])
  const activeTabId = ref<string | null>(null)

  const activeTab = computed(() => 
    tabs.value.find(t => t.id === activeTabId.value)
  )

  function createTab(request?: Partial<HttpRequest>): RequestTab {
    const tab: RequestTab = {
      id: uuidv4(),
      request: { ...createDefaultRequest(), ...request },
      isLoading: false,
      isDirty: false
    }
    tabs.value.push(tab)
    activeTabId.value = tab.id
    return tab
  }

  function openRequest(request: HttpRequest) {
    const existingTab = tabs.value.find(t => t.request.id === request.id)
    if (existingTab) {
      activeTabId.value = existingTab.id
      return existingTab
    }
    return createTab(request)
  }

  function closeTab(tabId: string) {
    const index = tabs.value.findIndex(t => t.id === tabId)
    if (index === -1) return

    tabs.value.splice(index, 1)

    if (activeTabId.value === tabId) {
      if (tabs.value.length > 0) {
        const newIndex = Math.min(index, tabs.value.length - 1)
        activeTabId.value = tabs.value[newIndex].id
      } else {
        activeTabId.value = null
      }
    }
  }

  function closeAllTabs() {
    tabs.value = []
    activeTabId.value = null
  }

  function closeOtherTabs(tabId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tabs.value = [tab]
      activeTabId.value = tabId
    }
  }

  function setActiveTab(tabId: string) {
    if (tabs.value.some(t => t.id === tabId)) {
      activeTabId.value = tabId
    }
  }

  function updateRequest(tabId: string, updates: Partial<HttpRequest>) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      Object.assign(tab.request, updates)
      tab.isDirty = true
    }
  }

  function setMethod(tabId: string, method: HttpMethod) {
    updateRequest(tabId, { method })
  }

  function setUrl(tabId: string, url: string) {
    updateRequest(tabId, { url })
  }

  function setResponse(tabId: string, response: HttpResponse) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.response = response
      tab.isLoading = false
    }
  }

  function setLoading(tabId: string, isLoading: boolean) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.isLoading = isLoading
    }
  }

  function clearResponse(tabId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.response = undefined
    }
  }

  function markSaved(tabId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.isDirty = false
    }
  }

  function duplicateTab(tabId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      const newRequest = { 
        ...tab.request, 
        id: uuidv4(), 
        name: `${tab.request.name} (copy)` 
      }
      return createTab(newRequest)
    }
    return null
  }

  function reorderTabs(fromIndex: number, toIndex: number) {
    const [tab] = tabs.value.splice(fromIndex, 1)
    tabs.value.splice(toIndex, 0, tab)
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    createTab,
    openRequest,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    setActiveTab,
    updateRequest,
    setMethod,
    setUrl,
    setResponse,
    setLoading,
    clearResponse,
    markSaved,
    duplicateTab,
    reorderTabs
  }
})
