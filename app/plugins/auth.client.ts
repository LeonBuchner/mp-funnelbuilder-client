/**
 * Client-Plugin: Stellt sicher, dass ein vorhandener Token beim App-Start
 * gegen das Backend geprüft wird (GET /auth/me).
 *
 * Läuft nur im Browser (kein SSR), damit localStorage zugreifbar ist.
 * Bei abgelaufenem oder ungültigem Token ruft fetchMe() intern logout() auf.
 *
 * Auf oeffentlichen Renderer-Routen (/f/) wird der Auth-Check uebersprungen:
 * Diese Seiten benoetigen keine Authentifizierung und profitieren davon,
 * den initialen Netzwerk-Request zu vermeiden.
 */
export default defineNuxtPlugin(async () => {
  // Oeffentliche Funnel-Renderer-Routen benoetigen keinen Auth-Check.
  const route = useRoute()
  if (route.path.startsWith('/f/')) return

  const authStore = useAuthStore()
  if (authStore.token) {
    try {
      await authStore.fetchMe()
    } catch {
      // fetchMe() behandelt 401 intern mit logout().
      // Andere Fehler (Netzwerk etc.) ignorieren wir beim Start.
    }
  }
})
