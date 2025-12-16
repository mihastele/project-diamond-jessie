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
  requestType: RequestType
  request: HttpRequest
  graphqlRequest?: GraphQLRequest
  websocketRequest?: WebSocketRequest
  response?: HttpResponse
  graphqlResponse?: GraphQLResponse
  isLoading: boolean
  isDirty: boolean
  // Reference to saved collection item (for updates instead of duplicates)
  savedRef?: {
    collectionId: string
    itemId: string
  }
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
  requestType?: RequestType
  graphqlRequest?: GraphQLRequest
  websocketRequest?: WebSocketRequest
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

// GraphQL Types
export interface GraphQLRequest {
  id: string
  name: string
  url: string
  query: string
  variables?: string
  operationName?: string
  headers: KeyValue[]
  auth: AuthConfig
  preRequestScript?: string
  testScript?: string
  description?: string
}

export interface GraphQLResponse {
  data?: unknown
  errors?: Array<{
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: Array<string | number>
    extensions?: Record<string, unknown>
  }>
  extensions?: Record<string, unknown>
  status: number
  headers: Record<string, string>
  timing: TimingInfo
  timestamp: number
}

export interface GraphQLSchema {
  types: GraphQLType[]
  queryType?: string
  mutationType?: string
  subscriptionType?: string
}

export interface GraphQLType {
  name: string
  kind: 'SCALAR' | 'OBJECT' | 'INTERFACE' | 'UNION' | 'ENUM' | 'INPUT_OBJECT' | 'LIST' | 'NON_NULL'
  description?: string
  fields?: GraphQLField[]
  inputFields?: GraphQLInputField[]
  enumValues?: Array<{ name: string; description?: string }>
}

export interface GraphQLField {
  name: string
  description?: string
  args: GraphQLInputField[]
  type: GraphQLTypeRef
}

export interface GraphQLInputField {
  name: string
  description?: string
  type: GraphQLTypeRef
  defaultValue?: string
}

export interface GraphQLTypeRef {
  kind: string
  name?: string
  ofType?: GraphQLTypeRef
}

// WebSocket Types
export type WebSocketMessageType = 'text' | 'binary' | 'ping' | 'pong'

export interface WebSocketRequest {
  id: string
  name: string
  url: string
  protocols?: string[]
  headers: KeyValue[]
  auth: AuthConfig
  description?: string
}

export interface WebSocketMessage {
  id: string
  type: WebSocketMessageType
  direction: 'sent' | 'received'
  data: string
  timestamp: number
  size: number
}

export interface WebSocketConnection {
  id: string
  request: WebSocketRequest
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  messages: WebSocketMessage[]
  connectedAt?: number
  disconnectedAt?: number
  error?: string
}

// Protocol-agnostic request type for collections
export type RequestType = 'http' | 'graphql' | 'websocket'

export interface GenericRequest {
  id: string
  name: string
  type: RequestType
  http?: HttpRequest
  graphql?: GraphQLRequest
  websocket?: WebSocketRequest
}

// Cookie management
export interface Cookie {
  id: string
  name: string
  value: string
  domain: string
  path: string
  expires?: number
  httpOnly: boolean
  secure: boolean
  sameSite: 'Strict' | 'Lax' | 'None'
}

export interface CookieJar {
  id: string
  name: string
  cookies: Cookie[]
  createdAt: number
  updatedAt: number
}

// Import/Export types
export interface PostmanCollection {
  info: {
    _postman_id: string
    name: string
    description?: string
    schema: string
  }
  item: PostmanItem[]
  variable?: PostmanVariable[]
}

export interface PostmanItem {
  name: string
  request?: PostmanRequest
  item?: PostmanItem[]
  description?: string
}

export interface PostmanRequest {
  method: string
  header: Array<{ key: string; value: string; disabled?: boolean }>
  url: string | { raw: string; query?: Array<{ key: string; value: string }> }
  body?: {
    mode: string
    raw?: string
    formdata?: Array<{ key: string; value: string; type: string }>
    urlencoded?: Array<{ key: string; value: string }>
  }
  auth?: {
    type: string
    bearer?: Array<{ key: string; value: string }>
    basic?: Array<{ key: string; value: string }>
  }
}

export interface PostmanVariable {
  key: string
  value: string
  type?: string
}

// HAR (HTTP Archive) types
export interface HarFile {
  log: {
    version: string
    creator: { name: string; version: string }
    entries: HarEntry[]
  }
}

export interface HarEntry {
  startedDateTime: string
  time: number
  request: {
    method: string
    url: string
    httpVersion: string
    headers: Array<{ name: string; value: string }>
    queryString: Array<{ name: string; value: string }>
    postData?: {
      mimeType: string
      text?: string
      params?: Array<{ name: string; value: string }>
    }
    cookies: Array<{ name: string; value: string }>
  }
  response: {
    status: number
    statusText: string
    httpVersion: string
    headers: Array<{ name: string; value: string }>
    content: {
      size: number
      mimeType: string
      text?: string
    }
    cookies: Array<{ name: string; value: string }>
  }
  timings: {
    blocked: number
    dns: number
    connect: number
    ssl: number
    send: number
    wait: number
    receive: number
  }
}

// Script execution context
export interface ScriptContext {
  request: HttpRequest | GraphQLRequest
  response?: HttpResponse | GraphQLResponse
  environment: Record<string, string>
  globals: Record<string, string>
  cookies: Cookie[]
}

export interface ScriptResult {
  success: boolean
  logs: string[]
  errors: string[]
  tests: TestResult[]
  setVariables?: Record<string, string>
  setCookies?: Cookie[]
}

// Linked/Dependent Requests
export interface RequestDependency {
  id: string
  sourceRequestId: string
  targetRequestId: string
  dataMapping: DataMapping[]
  runBefore: boolean // If true, source runs before target
  enabled: boolean
}

export interface DataMapping {
  id: string
  sourceField: string // JSONPath or response field like "body.data.id" or "headers.Authorization"
  targetField: string // Where to inject: "params.userId", "headers.X-Token", "body.id"
  transform?: string // Optional JS expression to transform the value
}

export interface RequestChain {
  id: string
  name: string
  description?: string
  requests: ChainedRequest[]
  variables: Record<string, string> // Shared variables across the chain
  createdAt: number
  updatedAt: number
}

export interface ChainedRequest {
  id: string
  requestId: string
  order: number
  condition?: string // JS expression to determine if this request should run
  extractors: DataExtractor[]
  enabled: boolean
}

export interface DataExtractor {
  id: string
  name: string // Variable name to store the extracted value
  source: 'body' | 'headers' | 'status' | 'timing'
  path: string // JSONPath for body, header name for headers
  transform?: string // Optional JS transform
}
