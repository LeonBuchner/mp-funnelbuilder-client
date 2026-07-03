<script setup lang="ts">
/**
 * BlockOptinOtp: OTP-Verifikation fuer den Funnel-Renderer.
 *
 * Ablauf:
 *   1. E-Mail eingeben (oder Vorausfuellung aus vorhandener E-Mail-Antwort)
 *   2. "Code anfordern" -> POST /otp/send
 *   3. N Einzelslots eingeben (digits Stellen)
 *   4. "Code bestätigen" -> POST /otp/verify
 *   5. Bei Erfolg: otp_verified_token wird per emit an den Renderer uebergeben
 *
 * A11y: Slot-Gruppe mit <fieldset>/<legend>, aria-labelledby, Fehler mit role=alert.
 * SSR-sicher: kein DOM-Zugriff im Setup, nur in Handlers/onMounted.
 */
import { ref, computed, nextTick, watch } from 'vue'
import type { OptinOtpBlock } from '~/types/funnel'
import { usePublicApi } from '~/composables/usePublicApi'

const props = withDefaults(
  defineProps<{
    block: OptinOtpBlock
    mode: 'editor' | 'live'
    /** Vorausgefuellte E-Mail-Adresse aus einer vorherigen Antwort. */
    modelValue?: string
    error?: string
    /** session_id des Renderers */
    sessionId?: string
    /** Funnel-Hash fuer API-Aufrufe */
    hash?: string
  }>(),
  { modelValue: '', error: undefined, sessionId: '', hash: '' },
)

const emit = defineEmits<{
  (e: 'update:modelValue' | 'otp-verified', value: string): void
}>()

const api = usePublicApi()

// ---------------------------------------------------------------------------
// Zustand
// ---------------------------------------------------------------------------

const digits = computed<number>(() => props.block.digits ?? 6)

const email = ref<string>(props.modelValue ?? '')
const slots = ref<string[]>(Array.from({ length: digits.value }, () => ''))
const slotRefs = ref<(HTMLInputElement | null)[]>([])

const phase = ref<'email' | 'code'>('email')
const isSending = ref<boolean>(false)
const isVerifying = ref<boolean>(false)
const isVerified = ref<boolean>(false)

const sendError = ref<string | null>(null)
const verifyError = ref<string | null>(null)

// E-Mail-Vorausfuellung bei Prop-Aenderung
watch(() => props.modelValue, (v) => {
  if (v && !email.value) email.value = v
}, { immediate: true })

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getOtpCode(): string {
  return slots.value.join('')
}

// ---------------------------------------------------------------------------
// OTP senden
// ---------------------------------------------------------------------------

async function sendCode(): Promise<void> {
  if (props.mode === 'editor') return
  if (!isValidEmail(email.value)) {
    sendError.value = 'Bitte gib eine gültige E-Mail-Adresse ein.'
    return
  }
  sendError.value = null
  isSending.value = true
  try {
    await api(`/f/${props.hash}/otp/send`, {
      method: 'POST',
      body: {
        email: email.value,
        session_id: props.sessionId,
      },
    })
    // E-Mail-Wert als Antwort im Renderer speichern
    emit('update:modelValue', email.value)
    phase.value = 'code'
    slots.value = Array.from({ length: digits.value }, () => '')
    // Fokus auf ersten Slot setzen
    await nextTick()
    slotRefs.value[0]?.focus()
  }
  catch {
    sendError.value = 'Code konnte nicht gesendet werden. Bitte versuche es erneut.'
  }
  finally {
    isSending.value = false
  }
}

// ---------------------------------------------------------------------------
// Slot-Handling (Tastatureingabe in Einzelfeldern)
// ---------------------------------------------------------------------------

function handleSlotInput(index: number, event: Event): void {
  const input = event.target as HTMLInputElement
  // Nur Ziffern zulaessen
  const digit = input.value.replace(/\D/g, '').slice(-1)
  slots.value[index] = digit
  input.value = digit
  // Auto-Advance: naechstes Feld fokussieren
  if (digit && index < digits.value - 1) {
    nextTick(() => slotRefs.value[index + 1]?.focus())
  }
}

function handleSlotKeydown(index: number, event: KeyboardEvent): void {
  if (event.key === 'Backspace' && !slots.value[index] && index > 0) {
    // Leeres Feld + Backspace -> vorheriges Feld leeren und fokussieren
    slots.value[index - 1] = ''
    nextTick(() => slotRefs.value[index - 1]?.focus())
  }
  // Paste-Handling
  if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
    // Wird durch handleSlotPaste behandelt
  }
}

function handleSlotPaste(index: number, event: ClipboardEvent): void {
  event.preventDefault()
  const pasted = event.clipboardData?.getData('text') ?? ''
  const digitsOnly = pasted.replace(/\D/g, '').slice(0, digits.value)
  digitsOnly.split('').forEach((char, i) => {
    if (index + i < digits.value) {
      slots.value[index + i] = char
    }
  })
  // Fokus auf das Feld nach dem letzten eingefuegten Zeichen
  const nextIndex = Math.min(index + digitsOnly.length, digits.value - 1)
  nextTick(() => slotRefs.value[nextIndex]?.focus())
}

// ---------------------------------------------------------------------------
// OTP verifizieren
// ---------------------------------------------------------------------------

async function verifyCode(): Promise<void> {
  if (props.mode === 'editor') return
  const code = getOtpCode()
  if (code.length < digits.value) {
    verifyError.value = `Bitte gib alle ${digits.value} Ziffern ein.`
    return
  }
  verifyError.value = null
  isVerifying.value = true
  try {
    const response = await api<{ otp_verified_token: string }>(`/f/${props.hash}/otp/verify`, {
      method: 'POST',
      body: {
        email: email.value,
        session_id: props.sessionId,
        otp: code,
      },
    })
    isVerified.value = true
    emit('otp-verified', response.otp_verified_token)
  }
  catch (err: unknown) {
    type ApiError = {
      data?: { errors?: { otp?: string[] }; message?: string }
    }
    const e = err as ApiError
    const msg = e?.data?.errors?.otp?.[0] ?? e?.data?.message
    verifyError.value = msg ?? 'Der Code ist ungültig oder abgelaufen. Bitte fordere einen neuen Code an.'
  }
  finally {
    isVerifying.value = false
  }
}

function resetToEmail(): void {
  phase.value = 'email'
  slots.value = Array.from({ length: digits.value }, () => '')
  verifyError.value = null
  sendError.value = null
}

// Im Editor: keine interaktiven Zustände anzeigen
const isEditorMode = computed(() => props.mode === 'editor')
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Titel/Label des Blocks -->
    <p
      v-if="block.label"
      class="text-sm font-medium"
      :style="{ color: 'var(--funnel-text)' }"
    >
      {{ block.label }}
    </p>

    <!-- Phase 1: E-Mail-Eingabe -->
    <div
      v-if="phase === 'email' || isEditorMode"
      class="flex flex-col gap-2"
    >
      <label
        :for="`otp-email-${block.id}`"
        class="text-sm font-medium"
        :style="{ color: 'var(--funnel-text)' }"
      >
        {{ block.emailLabel ?? 'Deine E-Mail-Adresse' }}
        <span
          v-if="block.required"
          class="ml-0.5 text-red-500"
          aria-label="Pflichtfeld"
        >*</span>
      </label>
      <input
        :id="`otp-email-${block.id}`"
        v-model="email"
        type="email"
        inputmode="email"
        autocomplete="email"
        :placeholder="block.emailPlaceholder ?? 'beispiel@email.de'"
        :disabled="isEditorMode || isSending"
        :aria-describedby="sendError ? `otp-send-error-${block.id}` : undefined"
        :aria-invalid="sendError ? 'true' : undefined"
        class="w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2"
        :style="{
          borderColor: sendError ? '#ef4444' : 'var(--funnel-border, #e5e7eb)',
          color: 'var(--funnel-text)',
          backgroundColor: 'var(--funnel-surface, #fff)',
          '--tw-ring-color': 'var(--funnel-accent)',
        }"
        @keydown.enter.prevent="sendCode"
      >

      <!-- Fehler Code-Senden -->
      <p
        v-if="sendError"
        :id="`otp-send-error-${block.id}`"
        class="text-xs text-red-600"
        role="alert"
      >
        {{ sendError }}
      </p>

      <button
        type="button"
        :disabled="isEditorMode || isSending"
        class="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        :style="{
          backgroundColor: 'var(--funnel-primary, #1c4687)',
          color: 'var(--funnel-on-primary, #fff)',
          '--tw-ring-color': 'var(--funnel-accent)',
        }"
        @click="sendCode"
      >
        <span
          v-if="isSending"
          class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
        {{ isSending ? 'Code wird gesendet...' : 'Code anfordern' }}
      </button>
    </div>

    <!-- Phase 2: Code-Eingabe -->
    <div
      v-if="(phase === 'code' || isEditorMode) && !isVerified"
      class="flex flex-col gap-3"
    >
      <p
        v-if="!isEditorMode"
        class="text-xs"
        :style="{ color: 'var(--funnel-muted)' }"
      >
        Wir haben einen Code an <strong>{{ email }}</strong> gesendet.
        <button
          type="button"
          class="underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--funnel-accent)] rounded"
          :style="{ color: 'var(--funnel-accent)' }"
          @click="resetToEmail"
        >
          E-Mail ändern
        </button>
      </p>

      <!--
        OTP-Slot-Gruppe: <fieldset> + <legend> fuer a11y.
        Screenreader sagen: "Bestätigungscode, Stelle 1 von N, Bearbeiten".
      -->
      <fieldset
        :aria-describedby="verifyError ? `otp-verify-error-${block.id}` : undefined"
      >
        <legend class="mb-1.5 text-sm font-medium" :style="{ color: 'var(--funnel-text)' }">
          Dein Bestätigungscode
        </legend>
        <div
          class="flex gap-2"
          role="group"
          :aria-label="`${digits}-stelliger Bestätigungscode`"
        >
          <input
            v-for="(_, index) in slots"
            :key="index"
            :ref="(el) => { slotRefs[index] = el as HTMLInputElement | null }"
            type="text"
            inputmode="numeric"
            pattern="[0-9]"
            maxlength="1"
            autocomplete="one-time-code"
            :value="slots[index]"
            :aria-label="`Stelle ${index + 1} von ${digits}`"
            :disabled="isEditorMode || isVerifying"
            class="h-12 w-10 rounded-lg border text-center text-lg font-semibold transition-colors focus:outline-none focus:ring-2"
            :style="{
              borderColor: verifyError ? '#ef4444' : 'var(--funnel-border, #e5e7eb)',
              color: 'var(--funnel-text)',
              backgroundColor: 'var(--funnel-surface, #fff)',
              '--tw-ring-color': 'var(--funnel-accent)',
            }"
            @input="handleSlotInput(index, $event)"
            @keydown="handleSlotKeydown(index, $event)"
            @paste="handleSlotPaste(index, $event)"
          >
        </div>
      </fieldset>

      <!-- Fehler Code-Verifikation -->
      <p
        v-if="verifyError"
        :id="`otp-verify-error-${block.id}`"
        class="text-xs text-red-600"
        role="alert"
        aria-live="assertive"
      >
        {{ verifyError }}
      </p>

      <button
        type="button"
        :disabled="isEditorMode || isVerifying"
        class="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        :style="{
          backgroundColor: 'var(--funnel-primary, #1c4687)',
          color: 'var(--funnel-on-primary, #fff)',
          '--tw-ring-color': 'var(--funnel-accent)',
        }"
        @click="verifyCode"
      >
        <span
          v-if="isVerifying"
          class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
        {{ isVerifying ? 'Wird bestätigt...' : 'Code bestätigen' }}
      </button>

      <!-- Code erneut senden -->
      <button
        v-if="!isEditorMode"
        type="button"
        :disabled="isSending"
        class="text-xs underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--funnel-accent)] rounded"
        :style="{ color: 'var(--funnel-muted)' }"
        @click="sendCode"
      >
        Code erneut senden
      </button>
    </div>

    <!-- Erfolgs-Zustand -->
    <div
      v-if="isVerified"
      class="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
      style="background-color: #f0fdf4; color: #166534;"
      role="status"
      aria-live="polite"
    >
      <svg
        class="h-4 w-4 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2.5"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Deine E-Mail-Adresse wurde erfolgreich bestätigt.
    </div>

    <!-- Aeusserer Fehler (vom Renderer, z. B. required-Validation) -->
    <p
      v-if="error && !isVerified"
      class="text-xs text-red-600"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
