/**
 * Oeffentlicher API-Fetch-Wrapper fuer den Funnel-Renderer.
 *
 * Kein Bearer-Token, kein Auth-Header.
 * Basis-URL: NUXT_PUBLIC_API_BASE_PUBLIC (default: http://localhost:8000/api/public)
 *
 * Verwendung:
 *   const api = usePublicApi()
 *   const data = await api<PublicFunnel>('/f/uuid-des-funnels')
 *   await api('/f/uuid/leads', { method: 'POST', body: submitPayload })
 */
export function usePublicApi() {
  const config = useRuntimeConfig()
  const baseURL =
    (config.public.publicApiBase as string) || 'http://localhost:8000/api/public'

  return $fetch.create({
    baseURL,
    onRequest({ options }) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      headers.set('Accept', 'application/json')
      options.headers = headers
    },
  })
}
