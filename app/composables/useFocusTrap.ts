/**
 * Hilfsfunktion für den Fokus-Trap in modalen Dialogen (WCAG 2.1 AA).
 * Hält den Tastaturfokus innerhalb eines Containers, solange der Dialog offen ist.
 *
 * Verwendung:
 *   const { trapFocus } = useFocusTrap()
 *   // Im @keydown-Handler des Dialog-Backdrops:
 *   if (dialogInnerRef.value) trapFocus(event, dialogInnerRef.value)
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap() {
  /**
   * Beschränkt den Tab-Fokus auf focussierbare Elemente innerhalb von `container`.
   * Muss im keydown-Handler des Dialog-Wrappers aufgerufen werden.
   */
  function trapFocus(event: KeyboardEvent, container: HTMLElement): void {
    if (event.key !== 'Tab') return
    const els = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    if (els.length === 0) return
    const first = els[0]!
    const last = els[els.length - 1]!
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  return { trapFocus }
}
