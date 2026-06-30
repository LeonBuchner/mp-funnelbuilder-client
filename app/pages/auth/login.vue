<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
})

useSeoMeta({
  title: 'Anmelden - MP Funnel-Builder',
  description: 'Melde Dich an und verwalte Deine Funnels.',
})

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const isPending = ref(false)
const errorMessage = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})

async function handleSubmit(): Promise<void> {
  isPending.value = true
  errorMessage.value = null
  fieldErrors.value = {}

  try {
    await authStore.login(email.value, password.value)
    await router.push('/admin')
  } catch (error: unknown) {
    const err = error as {
      data?: { message?: string; errors?: Record<string, string[]> }
    }
    if (err?.data?.errors) {
      fieldErrors.value = err.data.errors
    }
    errorMessage.value =
      err?.data?.message ?? 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.'
  } finally {
    isPending.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-1 text-2xl font-bold text-mp-text">
      Anmelden
    </h1>
    <p class="mb-6 text-sm text-mp-muted">
      Gib Deine Zugangsdaten ein, um fortzufahren.
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

      <!-- E-Mail -->
      <div class="mb-4">
        <label
          for="login-email"
          class="mb-1 block text-sm font-medium text-mp-text"
        >
          E-Mail-Adresse
        </label>
        <input
          id="login-email"
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          required
          placeholder="deine@email.de"
          :aria-invalid="!!fieldErrors['email']?.length || undefined"
          :aria-describedby="fieldErrors['email']?.length ? 'login-email-error' : undefined"
          class="w-full rounded-lg border border-mp-border px-3 py-2 text-sm text-mp-text placeholder:text-mp-muted focus:border-mp-accent focus:outline-none focus:ring-2 focus:ring-mp-accent/30"
          :class="{ 'border-red-400': fieldErrors['email']?.length }"
        >
        <p
          v-if="fieldErrors['email']?.length"
          id="login-email-error"
          role="alert"
          class="mt-1 text-xs text-red-600"
        >
          {{ fieldErrors['email']![0] }}
        </p>
      </div>

      <!-- Passwort -->
      <div class="mb-6">
        <label
          for="login-password"
          class="mb-1 block text-sm font-medium text-mp-text"
        >
          Passwort
        </label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          required
          placeholder="••••••••"
          :aria-invalid="!!fieldErrors['password']?.length || undefined"
          :aria-describedby="fieldErrors['password']?.length ? 'login-password-error' : undefined"
          class="w-full rounded-lg border border-mp-border px-3 py-2 text-sm text-mp-text placeholder:text-mp-muted focus:border-mp-accent focus:outline-none focus:ring-2 focus:ring-mp-accent/30"
          :class="{ 'border-red-400': fieldErrors['password']?.length }"
        >
        <p
          v-if="fieldErrors['password']?.length"
          id="login-password-error"
          role="alert"
          class="mt-1 text-xs text-red-600"
        >
          {{ fieldErrors['password']![0] }}
        </p>
      </div>

      <!-- Absenden -->
      <button
        type="submit"
        :disabled="isPending"
        class="w-full rounded-lg bg-mp-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-mp-accent-hover focus:outline-none focus:ring-2 focus:ring-mp-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span v-if="isPending">Wird angemeldet...</span>
        <span v-else>Anmelden</span>
      </button>
    </form>

    <!-- Link zu Passwort vergessen -->
    <p class="mt-5 text-center text-sm text-mp-muted">
      <NuxtLink
        to="/auth/forgot-password"
        class="rounded text-mp-accent underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-mp-accent/50"
      >
        Passwort vergessen?
      </NuxtLink>
    </p>
  </div>
</template>
