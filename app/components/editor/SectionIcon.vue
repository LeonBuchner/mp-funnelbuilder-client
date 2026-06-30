<!--
  SectionIcon: Kleines farbiges Icon pro Sektions-Typ.
  Dient als visueller Anker in der Sektions-Liste.
-->
<script setup lang="ts">
import type { SectionKey } from '~/composables/useSectionTemplates'

defineProps<{
  sectionKey: SectionKey
}>()
</script>

<template>
  <!-- Titelbereich: Headline + Text-Streifen -->
  <svg
    v-if="sectionKey === 'titelbereich'"
    class="h-5 w-5"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="18" height="18" rx="3" fill="#eff4ff" />
    <rect x="3" y="5" width="14" height="3" rx="1" fill="#3579fa" />
    <rect x="4" y="10" width="12" height="2" rx="1" fill="#93c5fd" />
    <rect x="5" y="14" width="10" height="2" rx="1" fill="#93c5fd" />
  </svg>

  <!-- Produkt: Bild oben + Streifen unten -->
  <svg
    v-else-if="sectionKey === 'produkt'"
    class="h-5 w-5"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="18" height="18" rx="3" fill="#f0fdf4" />
    <rect x="3" y="3" width="14" height="8" rx="1" fill="#86efac" />
    <rect x="3" y="13" width="8" height="2" rx="1" fill="#16a34a" />
    <rect x="3" y="16" width="14" height="1.5" rx="1" fill="#d1fae5" />
  </svg>

  <!-- Handlungsaufforderung: Button-ähnlich -->
  <svg
    v-else-if="sectionKey === 'handlungsaufforderung'"
    class="h-5 w-5"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="18" height="18" rx="3" fill="#eff4ff" />
    <rect x="3" y="5" width="10" height="3" rx="1" fill="#3579fa" />
    <rect x="3" y="10" width="14" height="1.5" rx="1" fill="#bfdbfe" />
    <rect x="3" y="13" width="14" height="4" rx="2" fill="#3579fa" />
  </svg>

  <!-- Über uns: Bild links + Text rechts -->
  <svg
    v-else-if="sectionKey === 'ueber-uns'"
    class="h-5 w-5"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="18" height="18" rx="3" fill="#faf5ff" />
    <rect x="3" y="3" width="14" height="7" rx="1" fill="#e9d5ff" />
    <rect x="3" y="12" width="9" height="2" rx="1" fill="#7c3aed" />
    <rect x="3" y="15.5" width="14" height="1.5" rx="1" fill="#ddd6fe" />
  </svg>

  <!-- Quiz: Fortschrittsbalken + Auswahl-Blöcke -->
  <svg
    v-else-if="sectionKey === 'quiz'"
    class="h-5 w-5"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="18" height="18" rx="3" fill="#eff4ff" />
    <rect x="3" y="4" width="14" height="2" rx="1" fill="#e5e7eb" />
    <rect x="3" y="4" width="8" height="2" rx="1" fill="#3579fa" />
    <rect x="3" y="9" width="14" height="3" rx="1" fill="#1c4687" />
    <rect x="3" y="14" width="14" height="3" rx="1" fill="#1c4687" />
  </svg>

  <!-- Team: Personen-Icon -->
  <svg
    v-else-if="sectionKey === 'team'"
    class="h-5 w-5"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="18" height="18" rx="3" fill="#fff7ed" />
    <rect x="3" y="3" width="8" height="2" rx="1" fill="#ea580c" />
    <rect x="3" y="7" width="6" height="7" rx="1" fill="#fed7aa" />
    <rect x="11" y="9" width="6" height="2" rx="1" fill="#ea580c" />
    <rect x="11" y="13" width="6" height="1.5" rx="1" fill="#fdba74" />
  </svg>

  <!-- Kundenstimmen: Anführungszeichen + Sterne -->
  <svg
    v-else-if="sectionKey === 'kundenstimmen'"
    class="h-5 w-5"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="18" height="18" rx="3" fill="#fffbeb" />
    <text x="3" y="13" font-size="11" fill="#f59e0b" font-family="Georgia,serif">&ldquo;</text>
    <rect x="9" y="4" width="8" height="1.5" rx="1" fill="#f59e0b" />
    <rect x="3" y="14" width="14" height="1.5" rx="1" fill="#fde68a" />
    <rect x="3" y="16.5" width="8" height="1.5" rx="1" fill="#fde68a" />
  </svg>

  <!-- Vertrauen: Schild / Logos-Reihe -->
  <svg
    v-else-if="sectionKey === 'vertrauen'"
    class="h-5 w-5"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="18" height="18" rx="3" fill="#f0fdf4" />
    <rect x="3" y="3" width="10" height="2" rx="1" fill="#16a34a" />
    <rect x="3" y="7" width="3.5" height="3.5" rx="1" fill="#e5e7eb" />
    <rect x="8" y="7" width="3.5" height="3.5" rx="1" fill="#e5e7eb" />
    <rect x="13" y="7" width="3.5" height="3.5" rx="1" fill="#e5e7eb" />
    <rect x="3" y="13" width="14" height="1.5" rx="1" fill="#bbf7d0" />
    <rect x="5" y="15.5" width="10" height="1.5" rx="1" fill="#bbf7d0" />
  </svg>

  <!-- Fallback -->
  <span
    v-else
    class="h-5 w-5 rounded bg-ui-border"
    aria-hidden="true"
  />
</template>
