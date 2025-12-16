import { v4 as uuidv4 } from 'uuid'
import type { 
  Collection, 
  CollectionItem, 
  HttpRequest, 
  AuthConfig,
  RequestBody
} from '@/types'

// Postman Collection v2.1 types
interface PostmanCollection {
  info: {
    _postman_id?: string
    name: string
    description?: string
    schema: string
  }
  item: PostmanItem[]
  auth?: PostmanAuth
  variable?: PostmanVariable[]
}

interface PostmanItem {
  name: string
  item?: PostmanItem[] // For folders
  request?: PostmanRequest
  response?: any[]
}

interface PostmanRequest {
  method: string
  header: PostmanHeader[]
  body?: PostmanBody
  url: PostmanUrl | string
  auth?: PostmanAuth
  description?: string
}

interface PostmanHeader {
  key: string
  value: string
  disabled?: boolean
  description?: string
}

interface PostmanBody {
  mode: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql'
  raw?: string
  urlencoded?: PostmanUrlEncoded[]
  formdata?: PostmanFormData[]
  graphql?: {
    query: string
    variables?: string
  }
  options?: {
    raw?: {
      language?: string
    }
  }
}

interface PostmanUrlEncoded {
  key: string
  value: string
  disabled?: boolean
  description?: string
}

interface PostmanFormData {
  key: string
  value?: string
  type: 'text' | 'file'
  src?: string
  disabled?: boolean
  description?: string
}

interface PostmanUrl {
  raw: string
  protocol?: string
  host?: string[]
  path?: string[]
  query?: PostmanQuery[]
}

interface PostmanQuery {
  key: string
  value: string
  disabled?: boolean
  description?: string
}

interface PostmanAuth {
  type: 'bearer' | 'basic' | 'apikey' | 'oauth2' | 'noauth'
  bearer?: { key: string; value: string }[]
  basic?: { key: string; value: string }[]
  apikey?: { key: string; value: string }[]
}

interface PostmanVariable {
  key: string
  value: string
  type?: string
}

// Import Postman collection to Diamond format
export function importPostmanCollection(json: string): Collection {
  const postman: PostmanCollection = JSON.parse(json)
  
  const collection: Collection = {
    id: uuidv4(),
    name: postman.info.name,
    description: postman.info.description,
    items: convertPostmanItems(postman.item),
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  
  return collection
}

function convertPostmanItems(items: PostmanItem[]): CollectionItem[] {
  return items.map(item => {
    if (item.item) {
      // It's a folder
      return {
        id: uuidv4(),
        type: 'folder' as const,
        name: item.name,
        children: convertPostmanItems(item.item)
      }
    } else if (item.request) {
      // It's a request
      return {
        id: uuidv4(),
        type: 'request' as const,
        name: item.name,
        request: convertPostmanRequest(item.request, item.name),
        requestType: 'http' as const
      }
    }
    return {
      id: uuidv4(),
      type: 'request' as const,
      name: item.name,
      request: createEmptyRequest(item.name),
      requestType: 'http' as const
    }
  })
}

function convertPostmanRequest(req: PostmanRequest, name: string): HttpRequest {
  const url = typeof req.url === 'string' ? req.url : req.url?.raw || ''
  const params = typeof req.url === 'object' && req.url.query 
    ? req.url.query.map(q => ({
        id: uuidv4(),
        key: q.key,
        value: q.value,
        enabled: !q.disabled,
        description: q.description
      }))
    : []
  
  return {
    id: uuidv4(),
    name,
    method: (req.method || 'GET') as any,
    url,
    params,
    headers: req.header?.map(h => ({
      id: uuidv4(),
      key: h.key,
      value: h.value,
      enabled: !h.disabled,
      description: h.description
    })) || [],
    cookies: [],
    body: convertPostmanBody(req.body),
    auth: convertPostmanAuth(req.auth),
    description: req.description
  }
}

function convertPostmanBody(body?: PostmanBody): RequestBody {
  if (!body) {
    return { type: 'none' }
  }
  
  switch (body.mode) {
    case 'raw':
      const language = body.options?.raw?.language
      let type: RequestBody['type'] = 'text'
      if (language === 'json') type = 'json'
      else if (language === 'xml') type = 'xml'
      return { type, raw: body.raw }
    
    case 'urlencoded':
      return {
        type: 'x-www-form-urlencoded',
        urlEncoded: body.urlencoded?.map(u => ({
          id: uuidv4(),
          key: u.key,
          value: u.value,
          enabled: !u.disabled,
          description: u.description
        }))
      }
    
    case 'formdata':
      return {
        type: 'form-data',
        formData: body.formdata?.map(f => ({
          id: uuidv4(),
          key: f.key,
          value: f.value || '',
          enabled: !f.disabled,
          description: f.description
        }))
      }
    
    case 'graphql':
      return {
        type: 'json',
        raw: JSON.stringify({
          query: body.graphql?.query,
          variables: body.graphql?.variables ? JSON.parse(body.graphql.variables) : undefined
        })
      }
    
    default:
      return { type: 'none' }
  }
}

function convertPostmanAuth(auth?: PostmanAuth): AuthConfig {
  if (!auth || auth.type === 'noauth') {
    return { type: 'none' }
  }
  
  switch (auth.type) {
    case 'bearer':
      const bearerToken = auth.bearer?.find(b => b.key === 'token')?.value || ''
      return { type: 'bearer', bearer: { token: bearerToken } }
    
    case 'basic':
      const username = auth.basic?.find(b => b.key === 'username')?.value || ''
      const password = auth.basic?.find(b => b.key === 'password')?.value || ''
      return { type: 'basic', basic: { username, password } }
    
    case 'apikey':
      const apiKey = auth.apikey?.find(a => a.key === 'key')?.value || ''
      const apiValue = auth.apikey?.find(a => a.key === 'value')?.value || ''
      const addTo = auth.apikey?.find(a => a.key === 'in')?.value === 'query' ? 'query' : 'header'
      return { type: 'api-key', apiKey: { key: apiKey, value: apiValue, addTo } }
    
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

// Export Diamond collection to Postman format
export function exportToPostman(collection: Collection): string {
  const postman: PostmanCollection = {
    info: {
      _postman_id: collection.id,
      name: collection.name,
      description: collection.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: convertToPostmanItems(collection.items)
  }
  
  return JSON.stringify(postman, null, 2)
}

function convertToPostmanItems(items: CollectionItem[]): PostmanItem[] {
  return items.map(item => {
    if (item.type === 'folder') {
      return {
        name: item.name,
        item: item.children ? convertToPostmanItems(item.children) : []
      }
    } else if (item.request) {
      return {
        name: item.name,
        request: convertToPostmanRequest(item.request)
      }
    }
    return { name: item.name }
  })
}

function convertToPostmanRequest(req: HttpRequest): PostmanRequest {
  const url: PostmanUrl = {
    raw: req.url,
    query: req.params
      .filter(p => p.enabled)
      .map(p => ({
        key: p.key,
        value: p.value,
        disabled: !p.enabled,
        description: p.description
      }))
  }
  
  return {
    method: req.method,
    header: req.headers.map(h => ({
      key: h.key,
      value: h.value,
      disabled: !h.enabled,
      description: h.description
    })),
    body: convertToPostmanBody(req.body),
    url,
    auth: convertToPostmanAuth(req.auth),
    description: req.description
  }
}

function convertToPostmanBody(body: RequestBody): PostmanBody | undefined {
  if (body.type === 'none') {
    return undefined
  }
  
  switch (body.type) {
    case 'json':
      return {
        mode: 'raw',
        raw: body.raw,
        options: { raw: { language: 'json' } }
      }
    
    case 'xml':
      return {
        mode: 'raw',
        raw: body.raw,
        options: { raw: { language: 'xml' } }
      }
    
    case 'text':
      return {
        mode: 'raw',
        raw: body.raw
      }
    
    case 'x-www-form-urlencoded':
      return {
        mode: 'urlencoded',
        urlencoded: body.urlEncoded?.map(u => ({
          key: u.key,
          value: u.value,
          disabled: !u.enabled,
          description: u.description
        }))
      }
    
    case 'form-data':
      return {
        mode: 'formdata',
        formdata: body.formData?.map(f => ({
          key: f.key,
          value: f.value,
          type: 'text' as const,
          disabled: !f.enabled,
          description: f.description
        }))
      }
    
    default:
      return undefined
  }
}

function convertToPostmanAuth(auth: AuthConfig): PostmanAuth | undefined {
  if (auth.type === 'none') {
    return { type: 'noauth' }
  }
  
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
    
    case 'api-key':
      return {
        type: 'apikey',
        apikey: [
          { key: 'key', value: auth.apiKey?.key || '' },
          { key: 'value', value: auth.apiKey?.value || '' },
          { key: 'in', value: auth.apiKey?.addTo || 'header' }
        ]
      }
    
    default:
      return { type: 'noauth' }
  }
}
