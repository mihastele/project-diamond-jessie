import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

// Disable browser context menu and dev tools shortcuts in production
if (import.meta.env.PROD) {
  // Prevent default context menu globally (custom menus are handled by components)
  document.addEventListener('contextmenu', (e) => {
    // Allow context menu only if the target has a custom menu handler
    const target = e.target as HTMLElement
    if (!target.closest('[data-allow-context-menu]')) {
      e.preventDefault()
    }
  })
  
  // Disable common dev tools shortcuts
  document.addEventListener('keydown', (e) => {
    // F12 - Dev tools
    if (e.key === 'F12') {
      e.preventDefault()
    }
    // Ctrl+Shift+I - Dev tools
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault()
    }
    // Ctrl+Shift+J - Console
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault()
    }
    // Ctrl+U - View source
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault()
    }
  })
}

app.use(pinia)
app.mount('#app')
