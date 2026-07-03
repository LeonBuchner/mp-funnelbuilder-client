<!--
  CustomDomainSection - Verwaltung der Custom-Domain eines Workspaces (M5.3).

  Nur für mp_admin sichtbar (muss vom Elternelement sichergestellt werden).

  Zustände:
    1. Laden (isLoading, keine Domain bekannt)
    2. Feature nicht verfügbar (featureAvailable === false)
    3. Keine Domain gesetzt -> Eingabefeld + "Domain hinzufügen"
    4. Domain gesetzt, nicht verifiziert -> TXT-Record + Anleitung + "Jetzt prüfen" + "Entfernen"
    5. Domain verifiziert -> grüner Status + SSL-Badge + "Entfernen"

  a11y: Felder mit Labels, Copy-Button mit aria-label + Live-Feedback,
        Status-Badges mit Textinhalt (nicht nur Farbe), Bestätigung über
        AdminConfirmModal (eigener Focus-Trap, teleportiert zu body).
-->
<script setup lang="ts">
import type { SslStatus } from '~/types/api'

const props = defineProps<{
  /** UUID des Workspaces (aus workspaceStore.activeWorkspace.id) */
  workspaceUuid: string
}>()

const toast = useToast()
const { domain, isLoading, featureAvailable, fetchDomain, addDomain, removeDomain, verifyDomain }
  = useCustomDomain()

// ---------------------------------------------------------------------------
// Initiales Laden
// ---------------------------------------------------------------------------
onMounted(() => {
  fetchDomain(props.workspaceUuid).catch(() => {
    // Unerwartete Fehler (z. B. 500) werden hier still geschluckt.
    // Das Composable hat isLoading bereits auf false gesetzt.
  })
})

// ---------------------------------------------------------------------------
// Domain hinzufügen
// ---------------------------------------------------------------------------
const newDomainInput = ref('')
const addError = ref<string | null>(null)
const isAdding = ref(false)

async function handleAddDomain(): Promise<void> {
  const trimmed = newDomainInput.value.trim()
  if (!trimmed) {
    addError.value = 'Bitte eine Domain eingeben.'
    return
  }
  addError.value = null
  isAdding.value = true
  try {
    await addDomain(props.workspaceUuid, trimmed)
    newDomainInput.value = ''
    toast.success(`Domain ${trimmed} wurde hinzugefügt.`)
  }
  catch (error: unknown) {
    const err = error as { status?: number; statusCode?: number; data?: { message?: string; errors?: Record<string, string[]> } }
    const status = err?.status ?? err?.statusCode
    if (status === 422) {
      const errors = err.data?.errors
      addError.value = errors?.['domain']?.[0]
        ?? err.data?.message
        ?? 'Die Domain ist ungültig oder bereits vergeben.'
    }
    else if (!featureAvailable.value) {
      // 404 -> Feature deaktiviert, featureAvailable wurde im Composable gesetzt
    }
    else {
      addError.value = 'Domain konnte nicht hinzugefügt werden. Bitte versuche es erneut.'
    }
  }
  finally {
    isAdding.value = false
  }
}

// ---------------------------------------------------------------------------
// Domain verifizieren
// ---------------------------------------------------------------------------
const verifyError = ref<string | null>(null)
const isVerifying = ref(false)

async function handleVerifyDomain(): Promise<void> {
  verifyError.value = null
  isVerifying.value = true
  try {
    await verifyDomain(props.workspaceUuid)
    toast.success('Domain erfolgreich verifiziert.')
  }
  catch (error: unknown) {
    const err = error as { status?: number; statusCode?: number; data?: { message?: string; errors?: Record<string, string[]> } }
    const status = err?.status ?? err?.statusCode
    if (status === 422) {
      verifyError.value = err.data?.errors?.['domain']?.[0]
        ?? err.data?.message
        ?? 'Der TXT-Record wurde noch nicht gefunden. Warte ein paar Minuten und versuche es erneut.'
    }
    else if (!featureAvailable.value) {
      // Feature deaktiviert
    }
    else {
      verifyError.value = 'Prüfung fehlgeschlagen. Bitte versuche es erneut.'
    }
  }
  finally {
    isVerifying.value = false
  }
}

// ---------------------------------------------------------------------------
// Domain entfernen (mit Bestaetigung)
// ---------------------------------------------------------------------------
const showRemoveConfirm = ref(false)
const isRemoving = ref(false)

async function handleRemoveDomain(): Promise<void> {
  isRemoving.value = true
  try {
    await removeDomain(props.workspaceUuid)
    showRemoveConfirm.value = false
    toast.success('Custom-Domain wurde entfernt.')
  }
  catch {
    toast.error('Domain konnte nicht entfernt werden.')
  }
  finally {
    isRemoving.value = false
  }
}

// ---------------------------------------------------------------------------
// TXT-Record in Zwischenablage kopieren
// ---------------------------------------------------------------------------
const copyFeedback = ref<'idle' | 'success' | 'error'>('idle')
let copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null

async function copyTxtRecord(): Promise<void> {
  const record = domain.value?.acme_txt_record
  if (!record) return
  try {
    await navigator.clipboard.writeText(record)
    copyFeedback.value = 'success'
  }
  catch {
    copyFeedback.value = 'error'
  }
  finally {
    if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = setTimeout(() => {
      copyFeedback.value = 'idle'
    }, 2500)
  }
}

onUnmounted(() => {
  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
})

// ---------------------------------------------------------------------------
// SSL-Status-Badge
// ---------------------------------------------------------------------------
interface SslBadge {
  label: string
  classes: string
}

function getSslBadge(status: SslStatus): SslBadge {
  const map: Record<SslStatus, SslBadge> = {
    pending: { label: 'SSL ausstehend', classes: 'bg-gray-100 text-gray-700' },
    provisioning: { label: 'SSL wird ausgestellt', classes: 'bg-blue-50 text-blue-800' },
    active: { label: 'SSL aktiv', classes: 'bg-green-50 text-green-800' },
    failed: { label: 'SSL fehlgeschlagen', classes: 'bg-red-50 text-red-800' },
  }
  return map[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' }
}
</script>

<template>
  <section aria-labelledby="custom-domain-section-title">
    <!-- Trennlinie -->
    <div class="border-t border-ui-border" />

    <div class="px-6 py-5">
      <h3
        id="custom-domain-section-title"
        class="mb-1 text-sm font-semibold text-ui-text"
      >
        Custom-Domain
      </h3>
      <p class="mb-4 text-xs text-ui-muted">
        Veröffentliche Deine Funnels unter einer eigenen Domain (z. B. aktion.deine-domain.de).
      </p>

      <!-- Laden -->
      <div
        v-if="isLoading && !domain"
        class="flex items-center gap-2 text-xs text-ui-muted"
        aria-live="polite"
        aria-busy="true"
      >
        <svg
          class="h-3.5 w-3.5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Wird geladen...
      </div>

      <!-- Feature nicht verfügbar -->
      <div
        v-else-if="!featureAvailable"
        class="rounded-lg border border-ui-border bg-ui-bg px-4 py-3 text-xs text-ui-muted"
        role="status"
      >
        Custom-Domains sind auf diesem System nicht aktiviert.
      </div>

      <!-- Keine Domain gesetzt -->
      <div
        v-else-if="!domain"
        class="space-y-3"
      >
        <div>
          <label
            for="custom-domain-input"
            class="mb-1.5 block text-xs font-medium text-ui-text"
          >
            Deine Domain
          </label>
          <input
            id="custom-domain-input"
            v-model="newDomainInput"
            type="text"
            placeholder="aktion.deine-domain.de"
            autocomplete="off"
            :aria-invalid="addError ? 'true' : undefined"
            :aria-describedby="addError ? 'custom-domain-add-error' : undefined"
            class="w-full rounded-lg border bg-white px-3 py-2 text-sm text-ui-text placeholder:text-ui-muted focus:outline-none focus:ring-2 focus:ring-ui-accent"
            :class="addError ? 'border-red-400 focus:border-red-400' : 'border-ui-border focus:border-ui-accent'"
            @keydown.enter.prevent="handleAddDomain"
          >
          <p
            v-if="addError"
            id="custom-domain-add-error"
            class="mt-1.5 text-xs text-red-600"
            role="alert"
          >
            {{ addError }}
          </p>
        </div>

        <button
          type="button"
          :disabled="isAdding"
          class="flex items-center gap-1.5 rounded-lg bg-ui-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-ui-accent-hover disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ui-accent"
          @click="handleAddDomain"
        >
          <svg
            v-if="isAdding"
            class="h-3 w-3 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {{ isAdding ? 'Wird hinzugefügt...' : 'Domain hinzufügen' }}
        </button>
      </div>

      <!-- Domain gesetzt -->
      <div
        v-else
        class="space-y-4"
      >
        <!-- Domain + Status -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-ui-text">{{ domain.domain }}</span>

          <!-- Verifiziert-Badge -->
          <span
            v-if="domain.verified_at"
            class="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800"
          >
            <svg
              class="h-3 w-3"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            Verifiziert
          </span>

          <!-- Nicht-verifiziert-Badge -->
          <span
            v-else
            class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
          >
            Nicht verifiziert
          </span>

          <!-- SSL-Status-Badge -->
          <span
            :class="getSslBadge(domain.ssl_status).classes"
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          >
            {{ getSslBadge(domain.ssl_status).label }}
          </span>
        </div>

        <!-- TXT-Record-Anleitung (nur wenn noch nicht verifiziert) -->
        <div
          v-if="!domain.verified_at"
          class="rounded-lg border border-ui-border bg-ui-bg p-4 space-y-3"
        >
          <p class="text-xs text-ui-text font-medium">
            DNS-Verifikation
          </p>
          <p class="text-xs text-ui-muted">
            Lege bei Deinem DNS-Anbieter einen TXT-Record für
            <strong class="font-medium text-ui-text">{{ domain.domain }}</strong>
            mit folgendem Wert an, dann klick "Jetzt prüfen".
          </p>

          <!-- TXT-Record -->
          <div class="flex items-center gap-2">
            <label
              for="custom-domain-txt-record"
              class="sr-only"
            >TXT-Record-Wert</label>
            <input
              id="custom-domain-txt-record"
              :value="domain.acme_txt_record"
              type="text"
              readonly
              class="min-w-0 flex-1 rounded-lg border border-ui-border bg-white px-3 py-2 font-mono text-xs text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent"
              aria-label="TXT-Record zum Kopieren"
            >
            <button
              type="button"
              :aria-label="copyFeedback === 'success' ? 'Kopiert!' : 'TXT-Record in Zwischenablage kopieren'"
              class="flex-shrink-0 rounded-lg border border-ui-border bg-white px-3 py-2 text-xs font-medium text-ui-text transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
              :class="{ 'border-green-400 text-green-700': copyFeedback === 'success', 'border-red-400 text-red-700': copyFeedback === 'error' }"
              @click="copyTxtRecord"
            >
              <span aria-hidden="true">
                <svg
                  v-if="copyFeedback === 'success'"
                  class="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                <svg
                  v-else
                  class="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect
                    x="9"
                    y="9"
                    width="13"
                    height="13"
                    rx="2"
                    ry="2"
                  />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </span>
              <!-- Sichtbarer Feedback-Text -->
              <span class="ml-1">
                {{ copyFeedback === 'success' ? 'Kopiert' : copyFeedback === 'error' ? 'Fehler' : 'Kopieren' }}
              </span>
            </button>
          </div>

          <!-- Live-Feedback für Screenreader -->
          <div
            aria-live="polite"
            class="sr-only"
          >
            <span v-if="copyFeedback === 'success'">TXT-Record in Zwischenablage kopiert.</span>
            <span v-else-if="copyFeedback === 'error'">Kopieren fehlgeschlagen. Bitte manuell kopieren.</span>
          </div>

          <!-- Pruefen-Button + Fehler -->
          <div class="space-y-2">
            <button
              type="button"
              :disabled="isVerifying"
              class="flex items-center gap-1.5 rounded-lg border border-ui-accent px-3 py-1.5 text-xs font-medium text-ui-accent transition-colors hover:bg-ui-accent/5 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
              @click="handleVerifyDomain"
            >
              <svg
                v-if="isVerifying"
                class="h-3 w-3 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {{ isVerifying ? 'Wird geprüft...' : 'Jetzt prüfen' }}
            </button>

            <p
              v-if="verifyError"
              class="text-xs text-red-600"
              role="alert"
            >
              {{ verifyError }}
            </p>
          </div>
        </div>

        <!-- Entfernen-Button -->
        <div>
          <button
            type="button"
            class="text-xs text-ui-muted underline-offset-2 hover:text-red-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent rounded"
            @click="showRemoveConfirm = true"
          >
            Domain entfernen
          </button>
        </div>
      </div>
    </div>

    <!-- Bestaetigung: Domain entfernen -->
    <AdminConfirmModal
      v-if="showRemoveConfirm"
      title="Domain entfernen?"
      :message="`Die Domain ${domain?.domain ?? ''} wird entfernt. Aktive Funnels sind danach nicht mehr unter dieser Domain erreichbar.`"
      confirm-label="Entfernen"
      variant="danger"
      :is-loading="isRemoving"
      @confirm="handleRemoveDomain"
      @cancel="showRemoveConfirm = false"
    />
  </section>
</template>
