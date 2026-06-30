/**
 * Zentraler $fetch-Wrapper fuer alle API-Aufrufe.
 *
 * Liest den Bearer-Token aus dem localStorage ('mp_token'), das VueUse
 * useLocalStorage in auth.ts unter demselben Schlüssel ablegt. VueUse legt
 * String-Werte ROH ab (ohne JSON-Anführungszeichen), deshalb lesen wir den
 * Token robust: erst als JSON versuchen, sonst den Rohwert nehmen.
 * Kein direkter Auth-Store-Import -> keine zirkuläre Abhängigkeit.
 */
export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = (config.public.apiBase as string) || 'http://localhost:8000/api/admin'

  return $fetch.create({
    baseURL,
    onRequest({ options }) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      headers.set('Accept', 'application/json')

      // Token aus localStorage lesen (läuft nur im Browser).
      if (import.meta.client) {
        const raw = localStorage.getItem('mp_token')
        if (raw) {
          let token = raw
          try {
            const parsed: unknown = JSON.parse(raw)
            if (typeof parsed === 'string') {
              token = parsed
            }
          } catch {
            // raw ist bereits der reine Token-String, kein JSON
          }
          if (token) {
            headers.set('Authorization', `Bearer ${token}`)
          }
        }
      }

      options.headers = headers
    },
  })
}
