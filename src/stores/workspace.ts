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
  HttpRequest,
  RequestType,
  GraphQLRequest,
  WebSocketRequest
} from '@/types'

export interface RequestMetadata {
  requestType?: RequestType
  graphqlRequest?: GraphQLRequest
  websocketRequest?: WebSocketRequest
}

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

  function addRequestToCollection(
    collectionId: string, 
    request: HttpRequest, 
    folderId?: string,
    metadata?: RequestMetadata
  ) {
    if (!activeWorkspace.value) return
    
    const collection = activeWorkspace.value.collections.find(c => c.id === collectionId)
    if (!collection) return

    const item: CollectionItem = {
      id: uuidv4(),
      type: 'request',
      name: request.name,
      request: { ...request, id: uuidv4() },
      requestType: metadata?.requestType || 'http',
      graphqlRequest: metadata?.graphqlRequest,
      websocketRequest: metadata?.websocketRequest
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
    
    return item.id // Return the created item ID
  }

  function updateCollectionItem(
    collectionId: string,
    itemId: string,
    request: HttpRequest,
    metadata?: RequestMetadata
  ): boolean {
    if (!activeWorkspace.value) return false
    
    const collection = activeWorkspace.value.collections.find(c => c.id === collectionId)
    if (!collection) return false
    
    const item = findItemById(collection.items, itemId)
    if (!item || item.type !== 'request') return false
    
    // Update the item
    item.name = request.name
    item.request = { ...request }
    item.requestType = metadata?.requestType || 'http'
    item.graphqlRequest = metadata?.graphqlRequest
    item.websocketRequest = metadata?.websocketRequest
    
    collection.updatedAt = Date.now()
    activeWorkspace.value.updatedAt = Date.now()
    
    return true
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

  function findItemByPath(items: CollectionItem[], path: string[]): CollectionItem | null {
    if (path.length === 0) return null
    let current: CollectionItem | null = null
    let currentItems = items
    
    for (const id of path) {
      current = currentItems.find(item => item.id === id) ?? null
      if (!current) return null
      currentItems = current.children ?? []
    }
    return current
  }

  function findParentItems(collection: Collection, path: string[]): CollectionItem[] {
    if (path.length === 0) return collection.items
    const parent = findItemByPath(collection.items, path)
    return parent?.children ?? collection.items
  }

  function addRequestToFolder(collectionId: string, folderId: string, parentPath: string[], request: HttpRequest) {
    if (!activeWorkspace.value) return
    
    const collection = activeWorkspace.value.collections.find(c => c.id === collectionId)
    if (!collection) return

    const item: CollectionItem = {
      id: uuidv4(),
      type: 'request',
      name: request.name,
      request: { ...request, id: uuidv4() }
    }

    const fullPath = [...parentPath, folderId]
    const folder = findItemByPath(collection.items, fullPath)
    if (folder && folder.type === 'folder') {
      folder.children = folder.children || []
      folder.children.push(item)
    }
    
    collection.updatedAt = Date.now()
    activeWorkspace.value.updatedAt = Date.now()
  }

  function createSubFolder(collectionId: string, parentFolderId: string, parentPath: string[], name: string) {
    if (!activeWorkspace.value) return
    
    const collection = activeWorkspace.value.collections.find(c => c.id === collectionId)
    if (!collection) return

    const folder: CollectionItem = {
      id: uuidv4(),
      type: 'folder',
      name,
      children: []
    }

    const fullPath = [...parentPath, parentFolderId]
    const parent = findItemByPath(collection.items, fullPath)
    if (parent && parent.type === 'folder') {
      parent.children = parent.children || []
      parent.children.push(folder)
    }
    
    collection.updatedAt = Date.now()
    activeWorkspace.value.updatedAt = Date.now()
  }

  function duplicateItem(collectionId: string, itemId: string, parentPath: string[]) {
    if (!activeWorkspace.value) return
    
    const collection = activeWorkspace.value.collections.find(c => c.id === collectionId)
    if (!collection) return

    const parentItems = findParentItems(collection, parentPath)
    const itemIndex = parentItems.findIndex(i => i.id === itemId)
    if (itemIndex === -1) return

    const original = parentItems[itemIndex]
    const duplicate = JSON.parse(JSON.stringify(original)) as CollectionItem
    
    function regenerateIds(item: CollectionItem) {
      item.id = uuidv4()
      if (item.request) item.request.id = uuidv4()
      item.children?.forEach(regenerateIds)
    }
    
    regenerateIds(duplicate)
    duplicate.name = `${original.name} (copy)`
    parentItems.splice(itemIndex + 1, 0, duplicate)
    
    collection.updatedAt = Date.now()
    activeWorkspace.value.updatedAt = Date.now()
  }

  function renameItem(collectionId: string, itemId: string, parentPath: string[], newName: string) {
    if (!activeWorkspace.value) return
    
    const collection = activeWorkspace.value.collections.find(c => c.id === collectionId)
    if (!collection) return

    const parentItems = findParentItems(collection, parentPath)
    const item = parentItems.find(i => i.id === itemId)
    if (item) {
      item.name = newName
      if (item.request) item.request.name = newName
      collection.updatedAt = Date.now()
      activeWorkspace.value.updatedAt = Date.now()
    }
  }

  function deleteItem(collectionId: string, itemId: string, parentPath: string[]) {
    if (!activeWorkspace.value) return
    
    const collection = activeWorkspace.value.collections.find(c => c.id === collectionId)
    if (!collection) return

    const parentItems = findParentItems(collection, parentPath)
    const index = parentItems.findIndex(i => i.id === itemId)
    if (index !== -1) {
      parentItems.splice(index, 1)
      collection.updatedAt = Date.now()
      activeWorkspace.value.updatedAt = Date.now()
    }
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
    updateCollectionItem,
    createFolder,
    findItemById,
    addRequestToFolder,
    createSubFolder,
    duplicateItem,
    renameItem,
    deleteItem,
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
