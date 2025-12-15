import { v4 as uuidv4 } from 'uuid'
import type {
  Collection,
  CollectionItem,
  HttpRequest,
  KeyValue,
  PostmanCollection,
  PostmanItem,
  HarFile,
  HarEntry
} from '@/types'

// Postman Import
export function importPostmanCollection(json: string): Collection {
  const postman: PostmanCollection = JSON.parse(json)
  
  const collection: Collection = {
    id: uuidv4(),
    name: postman.info.name,
    description: postman.info.description,
    items: postman.item.map(convertPostmanItem),
    variables: postman.variable?.map(v => ({
      id: uuidv4(),
      key: v.key,
      value: v.value,
      type: 'text' as const,
      enabled: true
    })),
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  
  return collection
}

function convertPostmanItem(item: PostmanItem): CollectionItem {
  if (item.item) {
    // Folder
    return {
      id: uuidv4(),
      type: 'folder',
      name: item.name,
      description: item.description,
      children: item.item.map(convertPostmanItem)
    }
  }
  
  // Request
  const request = item.request
  if (!request) {
    return {
      id: uuidv4(),
      type: 'request',
      name: item.name,
      request: createEmptyRequest(item.name)
    }
  }
  
  const url = typeof request.url === 'string' ? request.url : request.url?.raw || ''
  
  const httpRequest: HttpRequest = {
    id: uuidv4(),
    name: item.name,
    method: (request.method as HttpRequest['method']) || 'GET',
    url,
    params: typeof request.url === 'object' && request.url.query 
      ? request.url.query.map(q => ({
          id: uuidv4(),
          key: q.key,
          value: q.value,
          enabled: true
        }))
      : [],
    headers: request.header?.map(h => ({
      id: uuidv4(),
      key: h.key,
      value: h.value,
      enabled: !h.disabled
    })) || [],
    cookies: [],
    body: {
      type: request.body?.mode === 'raw' ? 'json' : 'none',
      raw: request.body?.raw
    },
    auth: convertPostmanAuth(request.auth)
  }
  
  return {
    id: uuidv4(),
    type: 'request',
    name: item.name,
    description: item.description,
    request: httpRequest
  }
}

function convertPostmanAuth(auth?: PostmanItem['request']): HttpRequest['auth'] {
  if (!auth || !auth.type) return { type: 'none' }
  
  switch (auth.type) {
    case 'bearer':
      return {
        type: 'bearer',
        bearer: {
          token: auth.bearer?.find(b => b.key === 'token')?.value || ''
        }
      }
    case 'basic':
      return {
        type: 'basic',
        basic: {
          username: auth.basic?.find(b => b.key === 'username')?.value || '',
          password: auth.basic?.find(b => b.key === 'password')?.value || ''
        }
      }
    default:
      return { type: 'none' }
  }
}

function createEmptyRequest(name: string): HttpRequest {
  return {
    id: uuidv4(),
    name,
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    cookies: [],
    body: { type: 'none' },
    auth: { type: 'none' }
  }
}

// Postman Export
export function exportToPostman(collection: Collection): PostmanCollection {
  return {
    info: {
      _postman_id: collection.id,
      name: collection.name,
      description: collection.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: collection.items.map(convertToPostmanItem),
    variable: collection.variables?.map(v => ({
      key: v.key,
      value: v.value,
      type: v.type
    }))
  }
}

function convertToPostmanItem(item: CollectionItem): PostmanItem {
  if (item.type === 'folder') {
    return {
      name: item.name,
      description: item.description,
      item: item.children?.map(convertToPostmanItem)
    }
  }
  
  const req = item.request
  if (!req) {
    return { name: item.name }
  }
  
  return {
    name: item.name,
    description: item.description,
    request: {
      method: req.method,
      header: req.headers.map(h => ({
        key: h.key,
        value: h.value,
        disabled: !h.enabled
      })),
      url: {
        raw: req.url,
        query: req.params.filter(p => p.enabled).map(p => ({
          key: p.key,
          value: p.value
        }))
      },
      body: req.body.type !== 'none' ? {
        mode: req.body.type === 'form-data' ? 'formdata' : 'raw',
        raw: req.body.raw
      } : undefined,
      auth: convertToPostmanAuth(req.auth)
    }
  }
}

function convertToPostmanAuth(auth: HttpRequest['auth']): PostmanItem['request'] | undefined {
  if (!auth || auth.type === 'none') return undefined
  
  switch (auth.type) {
    case 'bearer':
      return {
        type: 'bearer',
        bearer: [{ key: 'token', value: auth.bearer?.token || '' }]
      }
    case 'basic':
      return {
        type: 'basic',
        basic: [
          { key: 'username', value: auth.basic?.username || '' },
          { key: 'password', value: auth.basic?.password || '' }
        ]
      }
    default:
      return undefined
  }
}

// HAR Import
export function importHarFile(json: string): Collection {
  const har: HarFile = JSON.parse(json)
  
  const items: CollectionItem[] = har.log.entries.map((entry, index) => 
    convertHarEntry(entry, index)
  )
  
  return {
    id: uuidv4(),
    name: `HAR Import - ${new Date().toLocaleDateString()}`,
    description: `Imported from HAR file with ${har.log.entries.length} requests`,
    items,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

function convertHarEntry(entry: HarEntry, index: number): CollectionItem {
  const url = new URL(entry.request.url)
  const name = `${entry.request.method} ${url.pathname}` || `Request ${index + 1}`
  
  const headers: KeyValue[] = entry.request.headers
    .filter(h => !h.name.startsWith(':')) // Filter out pseudo-headers
    .map(h => ({
      id: uuidv4(),
      key: h.name,
      value: h.value,
      enabled: true
    }))
  
  const params: KeyValue[] = entry.request.queryString.map(q => ({
    id: uuidv4(),
    key: q.name,
    value: q.value,
    enabled: true
  }))
  
  const cookies: KeyValue[] = entry.request.cookies.map(c => ({
    id: uuidv4(),
    key: c.name,
    value: c.value,
    enabled: true
  }))
  
  let body: HttpRequest['body'] = { type: 'none' }
  if (entry.request.postData) {
    const mimeType = entry.request.postData.mimeType.toLowerCase()
    if (mimeType.includes('json')) {
      body = { type: 'json', raw: entry.request.postData.text }
    } else if (mimeType.includes('xml')) {
      body = { type: 'xml', raw: entry.request.postData.text }
    } else if (mimeType.includes('form-urlencoded')) {
      body = {
        type: 'x-www-form-urlencoded',
        urlEncoded: entry.request.postData.params?.map(p => ({
          id: uuidv4(),
          key: p.name,
          value: p.value,
          enabled: true
        }))
      }
    } else {
      body = { type: 'text', raw: entry.request.postData.text }
    }
  }
  
  const httpRequest: HttpRequest = {
    id: uuidv4(),
    name,
    method: entry.request.method as HttpRequest['method'],
    url: entry.request.url,
    params,
    headers,
    cookies,
    body,
    auth: { type: 'none' }
  }
  
  return {
    id: uuidv4(),
    type: 'request',
    name,
    request: httpRequest
  }
}

// Insomnia Import (basic support)
export function importInsomniaCollection(json: string): Collection {
  const data = JSON.parse(json)
  
  // Insomnia export format
  const resources = data.resources || data._type === 'export' ? data.resources : [data]
  
  const requests = resources.filter((r: { _type: string }) => r._type === 'request')
  const folders = resources.filter((r: { _type: string }) => r._type === 'request_group')
  
  const items: CollectionItem[] = requests.map((req: {
    _id: string
    name: string
    method: string
    url: string
    headers: Array<{ name: string; value: string; disabled?: boolean }>
    body?: { mimeType: string; text?: string }
  }) => ({
    id: uuidv4(),
    type: 'request' as const,
    name: req.name,
    request: {
      id: uuidv4(),
      name: req.name,
      method: (req.method || 'GET') as HttpRequest['method'],
      url: req.url || '',
      params: [],
      headers: (req.headers || []).map((h: { name: string; value: string; disabled?: boolean }) => ({
        id: uuidv4(),
        key: h.name,
        value: h.value,
        enabled: !h.disabled
      })),
      cookies: [],
      body: req.body ? {
        type: req.body.mimeType?.includes('json') ? 'json' as const : 'text' as const,
        raw: req.body.text
      } : { type: 'none' as const },
      auth: { type: 'none' as const }
    }
  }))
  
  return {
    id: uuidv4(),
    name: data.name || 'Insomnia Import',
    description: 'Imported from Insomnia',
    items,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

// Diamond native format export
export function exportToDiamond(collection: Collection): string {
  return JSON.stringify(collection, null, 2)
}

// Diamond native format import
export function importFromDiamond(json: string): Collection {
  const data = JSON.parse(json)
  // Ensure IDs are present
  if (!data.id) data.id = uuidv4()
  if (!data.createdAt) data.createdAt = Date.now()
  if (!data.updatedAt) data.updatedAt = Date.now()
  return data as Collection
}
