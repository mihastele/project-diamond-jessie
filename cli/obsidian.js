#!/usr/bin/env node

/**
 * Obsidian CLI - Diamond API Client Test Runner
 * Run API tests from the command line for DevOps/CI integration
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
}

function colorize(text, ...colorCodes) {
  return colorCodes.join('') + text + colors.reset
}

function printHeader() {
  console.log('')
  console.log(colorize('  ◆ Obsidian CLI - Diamond Test Runner', colors.bright, colors.cyan))
  console.log(colorize('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.dim))
  console.log('')
}

function printUsage() {
  printHeader()
  console.log('  Usage:')
  console.log(colorize('    obsidian <workspace-file> [options]', colors.white))
  console.log('')
  console.log('  Options:')
  console.log('    -c, --collection <name>    Run specific collection by name')
  console.log('    -e, --environment <name>   Use specific environment')
  console.log('    -d, --delay <ms>           Delay between requests (default: 0)')
  console.log('    --stop-on-error            Stop execution on first error')
  console.log('    --json                     Output results as JSON')
  console.log('    --verbose                  Show detailed request/response info')
  console.log('    -h, --help                 Show this help message')
  console.log('')
  console.log('  Examples:')
  console.log(colorize('    obsidian ./workspace.json', colors.dim))
  console.log(colorize('    obsidian ./workspace.json -c "API Tests" -e "Production"', colors.dim))
  console.log(colorize('    obsidian ./workspace.json --json > results.json', colors.dim))
  console.log('')
}

function parseArgs(args) {
  const options = {
    workspaceFile: null,
    collection: null,
    environment: null,
    delay: 0,
    stopOnError: false,
    json: false,
    verbose: false,
    help: false
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]
    
    if (arg === '-h' || arg === '--help') {
      options.help = true
    } else if (arg === '-c' || arg === '--collection') {
      options.collection = args[++i]
    } else if (arg === '-e' || arg === '--environment') {
      options.environment = args[++i]
    } else if (arg === '-d' || arg === '--delay') {
      options.delay = parseInt(args[++i], 10) || 0
    } else if (arg === '--stop-on-error') {
      options.stopOnError = true
    } else if (arg === '--json') {
      options.json = true
    } else if (arg === '--verbose') {
      options.verbose = true
    } else if (!arg.startsWith('-') && !options.workspaceFile) {
      options.workspaceFile = arg
    }
    i++
  }

  return options
}

async function loadWorkspace(filePath) {
  const absolutePath = resolve(process.cwd(), filePath)
  
  if (!existsSync(absolutePath)) {
    throw new Error(`Workspace file not found: ${absolutePath}`)
  }

  const content = await readFile(absolutePath, 'utf-8')
  return JSON.parse(content)
}

function resolveVariables(text, variables) {
  if (!text) return text
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] ?? `{{${key}}}`
  })
}

function buildVariables(workspace, environmentName) {
  const vars = {}
  
  // Global variables
  if (workspace.globalVariables) {
    workspace.globalVariables
      .filter(v => v.enabled)
      .forEach(v => { vars[v.key] = v.value })
  }
  
  // Environment variables
  if (environmentName) {
    const env = workspace.environments?.find(e => e.name === environmentName)
    if (env) {
      env.variables
        .filter(v => v.enabled)
        .forEach(v => { vars[v.key] = v.value })
    }
  }
  
  return vars
}

function collectRequests(items, path = []) {
  const requests = []
  
  for (const item of items) {
    if (item.type === 'request' && item.request) {
      requests.push({
        item: { 
          id: item.id, 
          name: item.name, 
          request: item.request,
          requestType: item.requestType || 'http',
          graphqlRequest: item.graphqlRequest,
          websocketRequest: item.websocketRequest
        },
        path
      })
    } else if (item.type === 'folder' && item.children) {
      requests.push(...collectRequests(item.children, [...path, item.name]))
    }
  }
  
  return requests
}

function runTestScript(script, response) {
  const tests = []
  
  const dm = {
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.body,
      timing: response.timing,
      json: () => {
        try {
          return JSON.parse(response.body)
        } catch {
          return null
        }
      }
    },
    test: (name, fn) => {
      const start = Date.now()
      try {
        fn()
        tests.push({ name, passed: true, duration: Date.now() - start })
      } catch (e) {
        tests.push({
          name,
          passed: false,
          message: e instanceof Error ? e.message : 'Test failed',
          duration: Date.now() - start
        })
      }
    },
    expect: (value) => ({
      to: {
        equal: (expected) => {
          if (value !== expected) throw new Error(`Expected ${expected} but got ${value}`)
        },
        be: {
          true: () => { if (value !== true) throw new Error(`Expected true but got ${value}`) },
          false: () => { if (value !== false) throw new Error(`Expected false but got ${value}`) },
          lessThan: (n) => { if (typeof value !== 'number' || value >= n) throw new Error(`Expected less than ${n}`) },
          greaterThan: (n) => { if (typeof value !== 'number' || value <= n) throw new Error(`Expected greater than ${n}`) },
          an: (type) => {
            if (type === 'array' && !Array.isArray(value)) throw new Error('Expected an array')
          },
          at: {
            least: (n) => { if (typeof value !== 'number' || value < n) throw new Error(`Expected at least ${n}`) }
          }
        },
        have: {
          property: (prop) => {
            if (typeof value !== 'object' || value === null || !(prop in value)) {
              throw new Error(`Expected object to have property "${prop}"`)
            }
          }
        },
        include: (str) => {
          if (typeof value !== 'string' || !value.includes(str)) {
            throw new Error(`Expected "${value}" to include "${str}"`)
          }
        }
      }
    })
  }

  try {
    const fn = new Function('dm', script)
    fn(dm)
  } catch (e) {
    tests.push({
      name: 'Script Execution',
      passed: false,
      message: e instanceof Error ? e.message : 'Script error',
      duration: 0
    })
  }

  return tests
}

async function runRequest(request, variables, options) {
  const resolvedUrl = resolveVariables(request.url, variables)
  
  const headers = {}
  if (request.headers) {
    request.headers
      .filter(h => h.enabled)
      .forEach(h => {
        headers[resolveVariables(h.key, variables)] = resolveVariables(h.value, variables)
      })
  }

  let body
  if (request.body?.type !== 'none' && request.body?.raw) {
    body = resolveVariables(request.body.raw, variables)
  }

  const startTime = Date.now()

  try {
    const response = await fetch(resolvedUrl, {
      method: request.method || 'GET',
      headers,
      body
    })

    const responseBody = await response.text()
    const endTime = Date.now()

    return {
      success: true,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        bodySize: responseBody.length,
        timing: {
          total: endTime - startTime
        }
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed'
    }
  }
}

async function runCollection(collection, workspace, options) {
  const variables = buildVariables(workspace, options.environment)
  const requests = collectRequests(collection.items)
  
  const results = {
    collectionId: collection.id,
    collectionName: collection.name,
    environment: options.environment,
    requests: [],
    summary: {
      total: requests.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    },
    timestamp: Date.now()
  }

  const startTime = Date.now()

  if (!options.json) {
    console.log(colorize(`\n  Running: ${collection.name}`, colors.bright))
    console.log(colorize(`  ${requests.length} requests\n`, colors.dim))
  }

  for (let i = 0; i < requests.length; i++) {
    const { item, path } = requests[i]
    
    const requestResult = {
      requestId: item.id,
      name: item.name,
      path: path.join(' > '),
      requestType: item.requestType,
      tests: []
    }

    if (!options.json) {
      process.stdout.write(colorize(`  [${i + 1}/${requests.length}] `, colors.dim))
      process.stdout.write(colorize(`${item.request.method} `, colors.cyan))
      process.stdout.write(`${item.name} `)
    }

    const result = await runRequest(item.request, variables, options)

    if (result.success) {
      requestResult.response = result.response

      if (item.request.testScript) {
        requestResult.tests = runTestScript(item.request.testScript, result.response)
      }

      const failedTests = requestResult.tests.filter(t => !t.passed).length
      const passedTests = requestResult.tests.filter(t => t.passed).length

      if (!options.json) {
        if (result.response.status < 400) {
          process.stdout.write(colorize(`${result.response.status} `, colors.green))
        } else {
          process.stdout.write(colorize(`${result.response.status} `, colors.red))
        }
        process.stdout.write(colorize(`(${result.response.timing.total}ms)`, colors.dim))

        if (requestResult.tests.length > 0) {
          if (failedTests === 0) {
            process.stdout.write(colorize(` ✓ ${passedTests} tests`, colors.green))
          } else {
            process.stdout.write(colorize(` ✗ ${failedTests}/${requestResult.tests.length} failed`, colors.red))
          }
        }
        console.log('')

        if (options.verbose) {
          console.log(colorize(`    URL: ${resolveVariables(item.request.url, variables)}`, colors.dim))
          if (requestResult.tests.length > 0) {
            for (const test of requestResult.tests) {
              if (test.passed) {
                console.log(colorize(`    ✓ ${test.name}`, colors.green))
              } else {
                console.log(colorize(`    ✗ ${test.name}: ${test.message}`, colors.red))
              }
            }
          }
        }
      }

      if (failedTests === 0 && requestResult.tests.length > 0) {
        results.summary.passed++
      } else if (failedTests > 0) {
        results.summary.failed++
        if (options.stopOnError) {
          results.requests.push(requestResult)
          break
        }
      } else if (result.response.status < 400) {
        results.summary.passed++
      } else {
        results.summary.failed++
      }

    } else {
      requestResult.error = result.error
      results.summary.failed++

      if (!options.json) {
        console.log(colorize(`ERROR: ${result.error}`, colors.red))
      }

      if (options.stopOnError) {
        results.requests.push(requestResult)
        break
      }
    }

    results.requests.push(requestResult)

    if (options.delay > 0 && i < requests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, options.delay))
    }
  }

  results.summary.duration = Date.now() - startTime
  results.summary.skipped = results.summary.total - results.summary.passed - results.summary.failed

  return results
}

function printSummary(results) {
  console.log('')
  console.log(colorize('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.dim))
  console.log('')
  console.log(colorize('  Summary:', colors.bright))
  console.log(`    Total:    ${results.summary.total}`)
  console.log(colorize(`    Passed:   ${results.summary.passed}`, results.summary.passed > 0 ? colors.green : colors.dim))
  console.log(colorize(`    Failed:   ${results.summary.failed}`, results.summary.failed > 0 ? colors.red : colors.dim))
  console.log(`    Duration: ${results.summary.duration}ms`)
  console.log('')

  if (results.summary.failed > 0) {
    console.log(colorize('  Failed Requests:', colors.red))
    for (const req of results.requests) {
      if (req.error || req.tests?.some(t => !t.passed)) {
        console.log(colorize(`    ✗ ${req.name}`, colors.red))
        if (req.error) {
          console.log(colorize(`      Error: ${req.error}`, colors.dim))
        }
        for (const test of req.tests || []) {
          if (!test.passed) {
            console.log(colorize(`      - ${test.name}: ${test.message}`, colors.dim))
          }
        }
      }
    }
    console.log('')
  }
}

async function main() {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  if (options.help || !options.workspaceFile) {
    printUsage()
    process.exit(options.help ? 0 : 1)
  }

  try {
    const data = await loadWorkspace(options.workspaceFile)
    
    // Handle both single workspace and multi-workspace formats
    const workspaces = data.workspaces || [data]
    const activeWorkspace = data.activeWorkspaceId 
      ? workspaces.find(w => w.id === data.activeWorkspaceId) 
      : workspaces[0]

    if (!activeWorkspace) {
      throw new Error('No workspace found in file')
    }

    if (!options.json) {
      printHeader()
      console.log(colorize(`  Workspace: ${activeWorkspace.name}`, colors.white))
      if (options.environment) {
        console.log(colorize(`  Environment: ${options.environment}`, colors.white))
      }
    }

    let collections = activeWorkspace.collections || []
    
    if (options.collection) {
      collections = collections.filter(c => 
        c.name.toLowerCase().includes(options.collection.toLowerCase())
      )
      if (collections.length === 0) {
        throw new Error(`No collection found matching: ${options.collection}`)
      }
    }

    const allResults = []

    for (const collection of collections) {
      const results = await runCollection(collection, activeWorkspace, options)
      allResults.push(results)
    }

    if (options.json) {
      console.log(JSON.stringify(allResults, null, 2))
    } else {
      for (const results of allResults) {
        printSummary(results)
      }
    }

    // Exit with error code if any tests failed
    const totalFailed = allResults.reduce((sum, r) => sum + r.summary.failed, 0)
    process.exit(totalFailed > 0 ? 1 : 0)

  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: error.message }, null, 2))
    } else {
      console.error(colorize(`\n  Error: ${error.message}\n`, colors.red))
    }
    process.exit(1)
  }
}

main()
