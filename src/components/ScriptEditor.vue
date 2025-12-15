<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  script: string
  type: 'pre-request' | 'test'
}>()

const emit = defineEmits<{
  update: [script: string]
}>()

const localScript = ref(props.script || '')

watch(() => props.script, (newVal) => {
  if (newVal !== localScript.value) {
    localScript.value = newVal || ''
  }
})

function updateScript(value: string) {
  localScript.value = value
  emit('update', value)
}

const snippets = props.type === 'pre-request' ? [
  {
    name: 'Set Variable',
    code: `// Set an environment variable
dm.environment.set("variableName", "value");`
  },
  {
    name: 'Get Variable',
    code: `// Get an environment variable
const value = dm.environment.get("variableName");
console.log(value);`
  },
  {
    name: 'Add Header',
    code: `// Add a header to the request
dm.request.headers.add("X-Custom-Header", "value");`
  },
  {
    name: 'Generate UUID',
    code: `// Generate a UUID and set as variable
const uuid = dm.utils.uuid();
dm.environment.set("requestId", uuid);`
  },
  {
    name: 'Timestamp',
    code: `// Set current timestamp
dm.environment.set("timestamp", Date.now().toString());`
  }
] : [
  {
    name: 'Status Code Check',
    code: `// Check response status
dm.test("Status code is 200", () => {
  dm.expect(dm.response.status).to.equal(200);
});`
  },
  {
    name: 'Response Time',
    code: `// Check response time
dm.test("Response time is less than 500ms", () => {
  dm.expect(dm.response.timing.total).to.be.lessThan(500);
});`
  },
  {
    name: 'JSON Body Check',
    code: `// Check JSON response body
dm.test("Response has expected data", () => {
  const json = dm.response.json();
  dm.expect(json).to.have.property("id");
  dm.expect(json.success).to.be.true;
});`
  },
  {
    name: 'Header Check',
    code: `// Check response header
dm.test("Content-Type is JSON", () => {
  dm.expect(dm.response.headers["content-type"]).to.include("application/json");
});`
  },
  {
    name: 'Save to Variable',
    code: `// Save response data to variable
const json = dm.response.json();
dm.environment.set("userId", json.id);`
  },
  {
    name: 'Array Length',
    code: `// Check array length
dm.test("Returns at least 5 items", () => {
  const json = dm.response.json();
  dm.expect(json.items).to.be.an("array");
  dm.expect(json.items.length).to.be.at.least(5);
});`
  }
]

function insertSnippet(code: string) {
  const newScript = localScript.value 
    ? localScript.value + '\n\n' + code 
    : code
  localScript.value = newScript
  emit('update', newScript)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between p-2 border-b dark:border-surface-700">
      <span class="text-sm font-medium">
        {{ type === 'pre-request' ? 'Pre-request Script' : 'Tests' }}
      </span>
      <div class="relative group">
        <button class="btn btn-secondary text-xs">
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Snippets
        </button>
        <div class="absolute right-0 top-full mt-1 bg-white dark:bg-surface-800 rounded-lg shadow-lg border dark:border-surface-700 py-1 min-w-56 z-10 hidden group-hover:block">
          <button
            v-for="snippet in snippets"
            :key="snippet.name"
            @click="insertSnippet(snippet.code)"
            class="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            {{ snippet.name }}
          </button>
        </div>
      </div>
    </div>
    
    <div class="p-2 bg-surface-50 dark:bg-surface-900 text-xs text-surface-500 border-b dark:border-surface-700">
      <template v-if="type === 'pre-request'">
        Scripts run before the request is sent. Use <code class="px-1 py-0.5 bg-surface-200 dark:bg-surface-700 rounded">dm</code> object for API.
      </template>
      <template v-else>
        Write tests using <code class="px-1 py-0.5 bg-surface-200 dark:bg-surface-700 rounded">dm.test()</code> and <code class="px-1 py-0.5 bg-surface-200 dark:bg-surface-700 rounded">dm.expect()</code>.
      </template>
    </div>
    
    <textarea
      :value="localScript"
      @input="updateScript(($event.target as HTMLTextAreaElement).value)"
      :placeholder="type === 'pre-request' 
        ? '// Pre-request scripts run before sending the request\n// Use dm.environment.set() to set variables\n// Use dm.request to modify the request'
        : '// Test scripts run after receiving the response\n// Use dm.test() to define tests\n// Use dm.expect() for assertions'"
      class="flex-1 input font-mono text-sm resize-none rounded-none border-0"
      spellcheck="false"
    />
    
    <div class="p-2 border-t dark:border-surface-700 text-xs text-surface-400">
      <details>
        <summary class="cursor-pointer hover:text-surface-600">API Reference</summary>
        <div class="mt-2 space-y-1 pl-2">
          <div><code>dm.environment.get(key)</code> - Get variable</div>
          <div><code>dm.environment.set(key, value)</code> - Set variable</div>
          <div><code>dm.globals.get(key)</code> - Get global variable</div>
          <div><code>dm.request.headers</code> - Request headers</div>
          <div><code>dm.response.status</code> - Response status code</div>
          <div><code>dm.response.json()</code> - Parse JSON response</div>
          <div><code>dm.response.headers</code> - Response headers</div>
          <div><code>dm.test(name, fn)</code> - Define a test</div>
          <div><code>dm.expect(value)</code> - Assertion</div>
        </div>
      </details>
    </div>
  </div>
</template>
