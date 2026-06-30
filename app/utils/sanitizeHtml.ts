/**
 * sanitizeHtml – HTML-Bereinigung per isomorphic-dompurify.
 * Laeuft in Node (SSR-Renderer) und im Browser ohne window-Abhaengigkeit.
 *
 * Erlaubte Tags:  p, br, strong, b, em, i, u, a, span, ul, ol, li, h2, h3
 * Erlaubte Attr:  href, target, rel auf <a>
 * Automatisch:   rel="noopener noreferrer" auf jeden <a>-Tag gesetzt
 * Geblockt:      script, style, iframe, object, on*-Handler, alle anderen Tags
 */
import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u',
  'a', 'span', 'ul', 'ol', 'li', 'h2', 'h3',
]

const ALLOWED_ATTR = ['href', 'target', 'rel']

// Hook: jedes <a>-Tag erhält automatisch rel="noopener noreferrer".
// Wird einmal beim Modulaufruf registriert (ESM-Caching verhindert Doppel-Registrierung).
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if ('tagName' in node && (node as Element).tagName === 'A') {
    ;(node as Element).setAttribute('rel', 'noopener noreferrer')
  }
})

/**
 * Bereinigt einen HTML-String gegen XSS.
 * Gibt einen sicheren HTML-String zurück, der per v-html gerendert werden kann.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORCE_BODY: false,
  })
}
