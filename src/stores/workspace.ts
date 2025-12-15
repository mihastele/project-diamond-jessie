import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { 
  Workspace, 
  Collection, 
  Environment, 
  Variable, 
  HistoryEntry,
  CollectionItem,
  HttpRequest 
} from '@/types'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([])
  const activeWorkspaceId = ref<string | null>(null)

  const activeWorkspace = computed(() => 
    workspaces.value.find(w => w.id === activeWorkspaceId.value)
  )

  const activeEnvironment = computed(() => 
    activeWorkspace.value?.environments.find(e => e.id === activeWorkspace.value?.activeEnvironmentId)
  )

  const allVariables = computed(() => {
    const vars: Record<string, string> = {}
    
    activeWorkspace.value?.globalVariables
      .filter(v => v.enabled)
      .forEach(v => { vars[v.key] = v.value })
    
    activeEnvironment.value?.variables
      .filter(v => v.enabled)
      .forEach(v => { vars[v.key] = v.value })
    
    return vars
  })

  function createWorkspace(name: string, description?: string): Workspace {
    const workspace: Workspace = {
      id: uuidv4(),
      name,
      description,
      collections: [],
      environments: [],
      globalVariables: [],
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    workspaces.value.push(workspace)
    if (!activeWorkspaceId.value) {
      activeWorkspaceId.value = workspace.id
    }
    return workspace
  }

  function setActiveWorkspace(id: string) {
    activeWorkspaceId.value = id
  }

  function deleteWorkspace(id: string) {
    const index = workspaces.value.findIndex(w => w.id === id)
    if (index !== -1) {
      workspaces.value.splice(index, 1)
      if (activeWorkspaceId.value === id) {
        activeWorkspaceId.value = workspaces.value[0]?.id ?? null
      }
    }
  }

  function createCollection(name: string, description?: string): Collection | null {
    if (!activeWorkspace.value) return null
    
    const collection: Collection = {
      id: uuidv4(),
      name,
      description,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    activeWorkspace.value.collections.push(collection)
    activeWorkspace.value.updatedAt = Date.now()
    return collection
  }

  function updateCollection(id: string, updates: Partial<Collection>) {
    if (!activeWorkspace.value) return
    
    const collection = activeWorkspace.value.collections.find(c => c.id === id)
    if (collection) {
      Object.assign(collection, updates, { updatedAt: Date.now() })
      activeWorkspace.value.updatedAt = Date.now()
    }
  }

  function deleteCollection(id: string) {
    if (!activeWorkspace.value) return
    
    const index = activeWorkspace.value.collections.findIndex(c => c.id === id)
    if (index !== -1) {
      activeWorkspace.value.collections.splice(index, 1)
      activeWorkspace.value.updatedAt = Date.now()
    }
  }

  function addRequestToCollection(collectionId: string, request: HttpRequest, folderId?: string) {
    if (!activeWorkspace.value) return
    
    const collection = activeWorkspace.value.collections.find(c => c.id === collectionId)
    if (!collection) return

    const item: CollectionItem = {
      id: uuidv4(),
      type: 'request',
      name: request.name,
      request: { ...request, id: uuidv4() }
    }

    if (folderId) {
      const folder = findItemById(collection.items, folderId)
      if (folder && folder.type === 'folder') {
        folder.children = folder.children || []
        folder.children.push(item)
      }
    } else {
      collection.items.push(item)
    }
    
    collection.updatedAt = Date.now()
    activeWorkspace.value.updatedAt = Date.now()
  }

  function createFolder(collectionId: string, name: string, parentId?: string) {
    if (!activeWorkspace.value) return
    
    const collection = activeWorkspace.value.collections.find(c => c.id === collectionId)
    if (!collection) return

    const folder: CollectionItem = {
      id: uuidv4(),
      type: 'folder',
      name,
      children: []
    }

    if (parentId) {
      const parent = findItemById(collection.items, parentId)
      if (parent && parent.type === 'folder') {
        parent.children = parent.children || []
        parent.children.push(folder)
      }
    } else {
      collection.items.push(folder)
    }
    
    collection.updatedAt = Date.now()
    activeWorkspace.value.updatedAt = Date.now()
  }

  function findItemById(items: CollectionItem[], id: string): CollectionItem | null {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children) {
        const found = findItemById(item.children, id)
        if (found) return found
      }
    }
    return null
  }

  function createEnvironment(name: string): Environment | null {
    if (!activeWorkspace.value) return null
    
    const environment: Environment = {
      id: uuidv4(),
      name,
      variables: [],
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    activeWorkspace.value.environments.push(environment)
    activeWorkspace.value.updatedAt = Date.now()
    return environment
  }

  function setActiveEnvironment(id: string | null) {
    if (!activeWorkspace.value) return
    activeWorkspace.value.activeEnvironmentId = id ?? undefined
    activeWorkspace.value.updatedAt = Date.now()
  }

  function updateEnvironment(id: string, updates: Partial<Environment>) {
    if (!activeWorkspace.value) return
    
    const environment = activeWorkspace.value.environments.find(e => e.id === id)
    if (environment) {
      Object.assign(environment, updates, { updatedAt: Date.now() })
      activeWorkspace.value.updatedAt = Date.now()
    }
  }

  function deleteEnvironment(id: string) {
    if (!activeWorkspace.value) return
    
    const index = activeWorkspace.value.environments.findIndex(e => e.id === id)
    if (index !== -1) {
      activeWorkspace.value.environments.splice(index, 1)
      if (activeWorkspace.value.activeEnvironmentId === id) {
        activeWorkspace.value.activeEnvironmentId = undefined
      }
      activeWorkspace.value.updatedAt = Date.now()
    }
  }

  function addToHistory(entry: Omit<HistoryEntry, 'id'>) {
    if (!activeWorkspace.value) return
    
    const historyEntry: HistoryEntry = {
      ...entry,
      id: uuidv4()
    }
    activeWorkspace.value.history.unshift(historyEntry)
    
    if (activeWorkspace.value.history.length > 100) {
      activeWorkspace.value.history = activeWorkspace.value.history.slice(0, 100)
    }
    
    activeWorkspace.value.updatedAt = Date.now()
  }

  function clearHistory() {
    if (!activeWorkspace.value) return
    activeWorkspace.value.history = []
    activeWorkspace.value.updatedAt = Date.now()
  }

  function setGlobalVariables(variables: Variable[]) {
    if (!activeWorkspace.value) return
    activeWorkspace.value.globalVariables = variables
    activeWorkspace.value.updatedAt = Date.now()
  }

  function resolveVariables(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return allVariables.value[key] ?? `{{${key}}}`
    })
  }

  function loadFromStorage(data: { workspaces: Workspace[], activeWorkspaceId: string | null }) {
    workspaces.value = data.workspaces
    activeWorkspaceId.value = data.activeWorkspaceId
  }

  function exportToStorage() {
    return {
      workspaces: workspaces.value,
      activeWorkspaceId: activeWorkspaceId.value
    }
  }

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    activeEnvironment,
    allVariables,
    createWorkspace,
    setActiveWorkspace,
    deleteWorkspace,
    createCollection,
    updateCollection,
    deleteCollection,
    addRequestToCollection,
    createFolder,
    findItemById,
    createEnvironment,
    setActiveEnvironment,
    updateEnvironment,
    deleteEnvironment,
    addToHistory,
    clearHistory,
    setGlobalVariables,
    resolveVariables,
    loadFromStorage,
    exportToStorage
  }
})
