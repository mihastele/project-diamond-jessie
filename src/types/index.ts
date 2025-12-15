export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

export type BodyType = 'none' | 'json' | 'xml' | 'text' | 'form-data' | 'x-www-form-urlencoded' | 'binary' | 'file'

export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key' | 'oauth2'

export interface KeyValue {
  id: string
  key: string
  value: string
  enabled: boolean
  description?: string
}

export interface RequestBody {
  type: BodyType
  raw?: string
  formData?: KeyValue[]
  urlEncoded?: KeyValue[]
  binaryPath?: string
}

export interface AuthConfig {
  type: AuthType
  bearer?: {
    token: string
  }
  basic?: {
    username: string
    password: string
  }
  apiKey?: {
    key: string
    value: string
    addTo: 'header' | 'query'
  }
  oauth2?: {
    grantType: 'authorization_code' | 'client_credentials'
    authUrl?: string
    tokenUrl?: string
    clientId?: string
    clientSecret?: string
    scope?: string
    pkce?: boolean
    accessToken?: string
    refreshToken?: string
  }
}

export interface HttpRequest {
  id: string
  name: string
  method: HttpMethod
  url: string
  params: KeyValue[]
  headers: KeyValue[]
  cookies: KeyValue[]
  body: RequestBody
  auth: AuthConfig
  preRequestScript?: string
  testScript?: string
  description?: string
  tags?: string[]
}

export interface TimingInfo {
  dns: number
  connect: number
  tls: number
  send: number
  wait: number
  receive: number
  total: number
}

export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  bodySize: number
  timing: TimingInfo
  timestamp: number
}

export interface RequestTab {
  id: string
  request: HttpRequest
  response?: HttpResponse
  isLoading: boolean
  isDirty: boolean
}

export interface Collection {
  id: string
  name: string
  description?: string
  items: CollectionItem[]
  variables?: Variable[]
  auth?: AuthConfig
  preRequestScript?: string
  testScript?: string
  tags?: string[]
  createdAt: number
  updatedAt: number
}

export interface CollectionItem {
  id: string
  type: 'request' | 'folder'
  name: string
  request?: HttpRequest
  children?: CollectionItem[]
  description?: string
}

export interface Variable {
  id: string
  key: string
  value: string
  type: 'text' | 'secret'
  enabled: boolean
  description?: string
}

export interface Environment {
  id: string
  name: string
  variables: Variable[]
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface HistoryEntry {
  id: string
  request: HttpRequest
  response: HttpResponse
  timestamp: number
  workspaceId: string
}

export interface Workspace {
  id: string
  name: string
  description?: string
  collections: Collection[]
  environments: Environment[]
  activeEnvironmentId?: string
  globalVariables: Variable[]
  history: HistoryEntry[]
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  fontFamily: string
  autoSave: boolean
  timeout: number
  followRedirects: boolean
  validateSSL: boolean
  proxyEnabled: boolean
  proxyUrl?: string
  shortcuts: Record<string, string>
}

export interface TestResult {
  name: string
  passed: boolean
  message?: string
  duration: number
}

export interface CollectionRunResult {
  collectionId: string
  environmentId?: string
  requests: {
    requestId: string
    request: HttpRequest
    response?: HttpResponse
    tests: TestResult[]
    error?: string
  }[]
  summary: {
    total: number
    passed: number
    failed: number
    duration: number
  }
  timestamp: number
}
