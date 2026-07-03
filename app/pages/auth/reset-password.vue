<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
})

useSeoMeta({
  title: 'Neues Passwort setzen - MP Funnel-Builder',
})

const router = useRouter()
const route = useRoute()

// Token und E-Mail kommen als Query-Parameter aus der Reset-E-Mail
const resetToken = computed(() => {
  const t = route.query['token']
  return Array.isArray(t) ? (t[0] ?? '') : (t ?? '')
})
const resetEmail = computed(() => {
  const e = route.query['email']
  return Array.isArray(e) ? (e[0] ?? '') : (e ?? '')
})

const password = ref('')
const passwordConfirmation = ref('')
const isPending = ref(false)
const errorMessage = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})

async function handleSubmit(): Promise<void> {
  isPending.value = true
  errorMessage.value = null
  fieldErrors.value = {}

  try {
    const api = useApi()
    await api('/auth/reset-password', {
      method: 'POST',
      body: {
        token: resetToken.value,
        email: resetEmail.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      },
    })
    // Nach erfolgreichem Reset zum Login
    await router.push('/auth/login')
  } catch (error: unknown) {
    const err = error as {
      data?: { message?: string; errors?: Record<string, string[]> }
    }
    if (err?.data?.errors) {
      fieldErrors.value = err.data.errors
    }
    errorMessage.value =
      err?.data?.message ??
      'Passwort konnte nicht zurückgesetzt werden. Der Link ist möglicherweise abgelaufen.'
  } finally {
    isPending.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-1 text-2xl font-bold text-mp-text">
      Neues Passwort setzen
    </h1>
    <p class="mb-6 text-sm text-mp-muted">
      Wähle ein sicheres Passwort für Dein Konto.
    </p>

    <form
      novalidate
      @submit.prevent="handleSubmit"
    >
      <!-- Allgemeiner Fehlerhinweis -->
      <div
        v-if="errorMessage"
        role="alert"
        aria-live="assertive"
        class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <!-- Neues Passwort -->
      <div class="mb-4">
        <label
          for="reset-password"
          class="mb-1 block text-sm font-medium text-mp-text"
        >
          Neues Passwort
        </label>
        <input
          id="reset-password"
          v-model="password"
          type="password"
          name="password"
          autocomplete="new-password"
          required
          placeholder="Mindestens 8 Zeichen"
          :aria-invalid="!!fieldErrors['password']?.length || undefined"
          :aria-describedby="fieldErrors['password']?.length ? 'reset-password-error' : undefined"
          class="w-full rounded-lg border border-mp-border px-3 py-2 text-sm text-mp-text placeholder:text-mp-muted focus:border-mp-accent focus:outline-none focus:ring-2 focus:ring-mp-accent"
          :class="{ 'border-red-400': fieldErrors['password']?.length }"
        >
        <p
          v-if="fieldErrors['password']?.length"
          id="reset-password-error"
          role="alert"
          class="mt-1 text-xs text-red-600"
        >
          {{ fieldErrors['password']![0] }}
        </p>
      </div>

      <!-- Passwort bestätigen -->
      <div class="mb-6">
        <label
          for="reset-password-confirmation"
          class="mb-1 block text-sm font-medium text-mp-text"
        >
          Passwort bestätigen
        </label>
        <input
          id="reset-password-confirmation"
          v-model="passwordConfirmation"
          type="password"
          name="password_confirmation"
          autocomplete="new-password"
          required
          placeholder="••••••••"
          :aria-invalid="!!fieldErrors['password_confirmation']?.length || undefined"
          :aria-describedby="
            fieldErrors['password_confirmation']?.length
              ? 'reset-confirmation-error'
              : undefined
          "
          class="w-full rounded-lg border border-mp-border px-3 py-2 text-sm text-mp-text placeholder:text-mp-muted focus:border-mp-accent focus:outline-none focus:ring-2 focus:ring-mp-accent"
          :class="{ 'border-red-400': fieldErrors['password_confirmation']?.length }"
        >
        <p
          v-if="fieldErrors['password_confirmation']?.length"
          id="reset-confirmation-error"
          role="alert"
          class="mt-1 text-xs text-red-600"
        >
          {{ fieldErrors['password_confirmation']![0] }}
        </p>
      </div>

      <!-- Absenden -->
      <button
        type="submit"
        :disabled="isPending"
        class="w-full rounded-lg bg-mp-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-mp-accent-hover focus:outline-none focus:ring-2 focus:ring-mp-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span v-if="isPending">Wird gespeichert...</span>
        <span v-else>Passwort speichern</span>
      </button>
    </form>

    <!-- Zurück zum Login -->
    <p class="mt-5 text-center text-sm text-mp-muted">
      <NuxtLink
        to="/auth/login"
        class="rounded text-mp-accent underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-mp-accent"
      >
        Zurück zum Login
      </NuxtLink>
    </p>
  </div>
</template>
