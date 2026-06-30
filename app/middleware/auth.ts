/**
 * Named route middleware: schuetzt alle /admin/**-Routen.
 * Nicht authentifizierte User werden zur Login-Seite umgeleitet.
 */
export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    return navigateTo('/auth/login')
  }
})
