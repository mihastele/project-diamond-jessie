import { invoke } from '@tauri-apps/api/core'

export interface HttpRequestPayload {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
  bodyType?: string
  timeoutMs?: number
  followRedirects?: boolean
  validateSsl?: boolean
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

export interface HttpResponsePayload {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  bodySize: number
  timing: TimingInfo
  timestamp: number
}

// Check if we're running in Tauri
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

// Send HTTP request using Tauri backend (bypasses CORS) or fallback to fetch
export async function sendHttpRequest(payload: HttpRequestPayload): Promise<HttpResponsePayload> {
  if (isTauri()) {
    // Use Tauri backend - no CORS restrictions
    return await invoke<HttpResponsePayload>('send_request', { request: payload })
  } else {
    // Fallback to browser fetch for web preview (will have CORS limitations)
    return await sendHttpRequestFetch(payload)
  }
}

// Browser fetch fallback (for development/web preview)
async function sendHttpRequestFetch(payload: HttpRequestPayload): Promise<HttpResponsePayload> {
  const startTime = performance.now()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), payload.timeoutMs || 30000)
    
    const response = await fetch(payload.url, {
      method: payload.method,
      headers: payload.headers,
      body: ['GET', 'HEAD', 'OPTIONS'].includes(payload.method) ? undefined : payload.body,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    const endTime = performance.now()
    const responseBody = await response.text()
    
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      bodySize: new Blob([responseBody]).size,
      timing: {
        dns: 0,
        connect: 0,
        tls: 0,
        send: 0,
        wait: endTime - startTime,
        receive: 0,
        total: endTime - startTime
      },
      timestamp: Date.now()
    }
  } catch (error) {
    const endTime = performance.now()
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    
    // Return error response
    return {
      status: 0,
      statusText: error instanceof Error ? error.message : 'Request failed',
      headers: {},
      body: error instanceof Error ? `Error: ${error.message}\n\nNote: If this is a CORS error, run the app in Tauri mode for full functionality.` : 'Unknown error',
      bodySize: 0,
      timing: {
        dns: 0,
        connect: 0,
        tls: 0,
        send: 0,
        wait: endTime - startTime,
        receive: 0,
        total: endTime - startTime
      },
      timestamp: Date.now()
    }
  }
}
