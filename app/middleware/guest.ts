/**
 * Named route middleware: schuetzt /auth/**-Seiten vor eingeloggten Usern.
 * Wer bereits angemeldet ist, kommt direkt zum Admin-Bereich.
 */
export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()
  if (authStore.isAuthenticated) {
    return navigateTo('/admin')
  }
})
