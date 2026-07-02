<script setup lang="ts">
/**
 * Double-Opt-in-Bestaetigungsseite: /f/{slug}/opt-in/{token}
 *
 * Ruft POST /api/public/opt-in/confirm { token } auf.
 * Zeigt Erfolg oder Fehler in Du-Form.
 * Nutzt renderer-Layout (konsistent mit dem Funnel-Design).
 *
 * SSR-Hinweis: Der API-Aufruf laeuft clientseitig (onMounted), da der Token
 * sensibel ist und ein SSR-Aufruf keine Vorteile bietet (Seite ist ohnehin
 * nicht crawlbar/indexierbar).
 */
import { ref, onMounted } from 'vue'
import { usePublicApi } from '~/composables/usePublicApi'

definePageMeta({ layout: 'renderer' })

useSeoMeta({
  title: 'E-Mail bestätigen',
  description: 'Bestätige Deine E-Mail-Adresse für den Funnel.',
  robots: 'noindex, nofollow',
})

const route = useRoute()
const token = route.params.token as string

const api = usePublicApi()

const status = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref<string>('')

onMounted(async () => {
  try {
    await api('/opt-in/confirm', {
      method: 'POST',
      body: { token },
    })
    status.value = 'success'
  }
  catch (err: unknown) {
    type ApiError = {
      data?: { message?: string }
      statusCode?: number
      status?: number
    }
    const e = err as ApiError
    status.value = 'error'
    errorMessage.value
      = e?.data?.message
      ?? 'Der Bestätigungslink ist ungültig oder bereits abgelaufen.'
  }
})
</script>

<template>
  <div class="flex w-full flex-1 items-center justify-center px-6 py-12">
    <!-- Ladeanimation -->
    <div
      v-if="status === 'loading'"
      class="flex flex-col items-center gap-3 text-center"
      role="status"
      aria-live="polite"
    >
      <div
        class="h-8 w-8 animate-spin rounded-full border-2 border-[#3579fa] border-t-transparent"
        aria-hidden="true"
      />
      <p class="text-sm text-gray-600">
        Deine Anmeldung wird bestätigt...
      </p>
    </div>

    <!-- Erfolg -->
    <div
      v-else-if="status === 'success'"
      class="flex max-w-sm flex-col items-center gap-4 text-center"
      role="status"
      aria-live="polite"
    >
      <div
        class="flex h-16 w-16 items-center justify-center rounded-full"
        style="background-color: #f0fdf4;"
        aria-hidden="true"
      >
        <svg
          class="h-8 w-8"
          style="color: #166534;"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 class="text-xl font-semibold text-gray-900">
        Deine E-Mail-Adresse ist bestätigt!
      </h1>
      <p class="text-sm leading-relaxed text-gray-600">
        Vielen Dank. Deine Anmeldung ist jetzt abgeschlossen. Du kannst dieses Fenster schliessen.
      </p>
    </div>

    <!-- Fehler -->
    <div
      v-else
      class="flex max-w-sm flex-col items-center gap-4 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div
        class="flex h-16 w-16 items-center justify-center rounded-full"
        style="background-color: #fef2f2;"
        aria-hidden="true"
      >
        <svg
          class="h-8 w-8"
          style="color: #991b1b;"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 class="text-xl font-semibold text-gray-900">
        Bestätigung nicht möglich
      </h1>
      <p class="text-sm leading-relaxed text-gray-600">
        {{ errorMessage }}
      </p>
      <p class="text-xs text-gray-500">
        Falls Du Hilfe benötigst, wende Dich bitte an den Anbieter dieses Formulars.
      </p>
    </div>
  </div>
</template>
