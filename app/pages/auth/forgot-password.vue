<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
})

useSeoMeta({
  title: 'Passwort zurücksetzen - MP Funnel-Builder',
  description: 'Fordere einen Link an, um Dein Passwort zurückzusetzen.',
})

const email = ref('')
const isPending = ref(false)
const isSuccess = ref(false)
const errorMessage = ref<string | null>(null)

async function handleSubmit(): Promise<void> {
  isPending.value = true
  errorMessage.value = null

  try {
    const api = useApi()
    await api('/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    })
    isSuccess.value = true
  } catch {
    errorMessage.value =
      'Anfrage fehlgeschlagen. Bitte prüfe Deine Internetverbindung und versuche es erneut.'
  } finally {
    isPending.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-1 text-2xl font-bold text-mp-text">
      Passwort zurücksetzen
    </h1>
    <p class="mb-6 text-sm text-mp-muted">
      Trag Deine E-Mail-Adresse ein. Du bekommst dann einen Link, mit dem Du
      ein neues Passwort setzen kannst.
    </p>

    <!-- Erfolgsmeldung -->
    <div
      v-if="isSuccess"
      role="status"
      aria-live="polite"
      class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
    >
      Wenn ein Konto mit dieser E-Mail-Adresse existiert, haben wir Dir eine
      E-Mail mit einem Link zum Zurücksetzen Deines Passworts geschickt.
      Schau auch im Spam-Ordner nach.
    </div>

    <form
      v-else
      novalidate
      @submit.prevent="handleSubmit"
    >
      <!-- Fehlerhinweis -->
      <div
        v-if="errorMessage"
        role="alert"
        aria-live="assertive"
        class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <!-- E-Mail -->
      <div class="mb-6">
        <label
          for="forgot-email"
          class="mb-1 block text-sm font-medium text-mp-text"
        >
          E-Mail-Adresse
        </label>
        <input
          id="forgot-email"
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          required
          placeholder="deine@email.de"
          class="w-full rounded-lg border border-mp-border px-3 py-2 text-sm text-mp-text placeholder:text-mp-muted focus:border-mp-accent focus:outline-none focus:ring-2 focus:ring-mp-accent"
        >
      </div>

      <!-- Absenden -->
      <button
        type="submit"
        :disabled="isPending"
        class="w-full rounded-lg bg-mp-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-mp-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mp-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span v-if="isPending">Wird gesendet...</span>
        <span v-else>Link anfordern</span>
      </button>
    </form>

    <!-- Zurueck zum Login -->
    <p class="mt-5 text-center text-sm text-mp-muted">
      <NuxtLink
        to="/auth/login"
        class="rounded text-mp-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mp-accent"
      >
        Zurück zum Login
      </NuxtLink>
    </p>
  </div>
</template>
