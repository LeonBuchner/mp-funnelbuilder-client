<script setup lang="ts">
/**
 * ConsentBanner: Cookie-/Tracking-Zustimmungsdialog fuer den Funnel-Renderer.
 *
 * - Erscheint beim ersten Besuch, wenn noch kein localStorage-Eintrag vorhanden ist.
 * - Zwei Buttons: "Akzeptieren" / "Nur notwendige".
 * - role=dialog, aria-modal, Focus-Trap (useFocusTrap).
 * - Escape-Taste deaktiviert (Entscheidung wird erzwungen, da Tracking ohne Consent
 *   nicht geladen wird und die Funktion gewollt blockiert).
 * - SSR-sicher: Komponente wird nur gerendert wenn showConsentBanner=true (clientseitig).
 * - Schreibstil: Du-Form, Umlaute, kein Gedankenstrich.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useFocusTrap } from '~/composables/useFocusTrap'

const props = withDefaults(defineProps<{
  funnelSlug: string
  /** Datenschutz-URL des Workspaces. Fallback auf '/datenschutz' wenn nicht gesetzt. */
  privacyPolicyUrl?: string
}>(), {
  privacyPolicyUrl: '/datenschutz',
})

const emit = defineEmits<{
  (e: 'accept' | 'decline'): void
}>()

const { trapFocus } = useFocusTrap()
const dialogRef = ref<HTMLElement | null>(null)

// Fokus beim Einblenden auf den ersten Button setzen
onMounted(() => {
  const firstBtn = dialogRef.value?.querySelector<HTMLElement>('button')
  firstBtn?.focus()
})

function handleKeydown(event: KeyboardEvent): void {
  // Escape bewusst nicht schliessen: Entscheidung ist erforderlich
  if (event.key === 'Tab' && dialogRef.value) {
    trapFocus(event, dialogRef.value)
  }
}

// Globaler Keydown-Handler: nur fuer Tab-Trap noetig
onMounted(() => document.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <!--
    Backdrop: halbtransparentes Overlay, verhindert Interaktion mit dahinterliegenden Inhalten.
    inert-Attribut auf Hintergrund-Content waere ideal, aber nicht ueberall unterstuetzt.
    Focus-Trap haelt den Fokus im Dialog.
  -->
  <div
    class="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    aria-hidden="false"
  >
    <!-- Hintergrund-Dimmer -->
    <div
      class="absolute inset-0 bg-black/30"
      aria-hidden="true"
    />

    <!-- Dialog-Kasten -->
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-desc"
      class="relative z-10 mx-4 mb-4 w-full max-w-lg rounded-2xl bg-white px-6 py-6 shadow-xl sm:mb-0"
    >
      <!-- Icon -->
      <div
        class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
        style="background-color: #eff6ff;"
        aria-hidden="true"
      >
        <svg
          class="h-5 w-5"
          style="color: #3579fa;"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </div>

      <h2
        id="consent-banner-title"
        class="mb-2 text-base font-semibold text-gray-900"
      >
        Deine Privatsphäre ist uns wichtig
      </h2>

      <p
        id="consent-banner-desc"
        class="mb-5 text-sm leading-relaxed text-gray-600"
      >
        Wir nutzen Cookies und ähnliche Technologien, um diese Website zu betreiben und
        Dein Erlebnis zu verbessern. Mit Deiner Zustimmung laden wir optionale
        Analyse-Tools (z.B. Google Analytics). Ohne Deine Zustimmung verwenden wir
        nur technisch notwendige Cookies.
        <a
          :href="props.privacyPolicyUrl"
          class="underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] rounded"
          style="color: #2563eb;"
          target="_blank"
          rel="noopener"
        >
          Mehr erfahren
        </a>
      </p>

      <!-- Buttons -->
      <div class="flex flex-col gap-2 sm:flex-row-reverse">
        <!-- Akzeptieren -->
        <!-- Hintergrundfarbe #2563eb (Kontrast ~5.2:1 auf Weiss, WCAG AA konform). -->
        <!-- #3579fa wurde nicht verwendet: Kontrast nur 3.98:1, zu wenig fuer 14px-Text. -->
        <button
          type="button"
          class="flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style="background-color: #2563eb; --tw-ring-color: #2563eb;"
          @click="emit('accept')"
        >
          Akzeptieren
        </button>

        <!-- Nur notwendige -->
        <button
          type="button"
          class="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3579fa] focus-visible:ring-offset-2"
          @click="emit('decline')"
        >
          Nur notwendige
        </button>
      </div>
    </div>
  </div>
</template>
