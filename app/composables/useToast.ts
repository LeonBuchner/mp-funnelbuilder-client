/**
 * Schlichtes Toast-System ohne externe Bibliothek.
 * Nutzt module-level reactive State (Singleton im SPA-Kontext).
 * Toasts verschwinden automatisch nach 5 Sekunden.
 */
import { reactive } from 'vue'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

// Einmalig erzeugter State, geteilt über alle Komponenteninstanzen
const toasts = reactive<Toast[]>([])

export function useToast() {
  function add(message: string, type: Toast['type'] = 'info'): void {
    const id = crypto.randomUUID()
    toasts.push({ id, message, type })
    setTimeout(() => remove(id), 5000)
  }

  function remove(id: string): void {
    const idx = toasts.findIndex(t => t.id === id)
    if (idx >= 0) toasts.splice(idx, 1)
  }

  function success(message: string): void {
    add(message, 'success')
  }

  function error(message: string): void {
    add(message, 'error')
  }

  function info(message: string): void {
    add(message, 'info')
  }

  return { toasts, add, remove, success, error, info }
}
