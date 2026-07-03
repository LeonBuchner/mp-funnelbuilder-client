<script setup lang="ts">
import type { InputTextBlock, InputEmailBlock, InputPhoneBlock } from '~/types/funnel'

type InputBlock = InputTextBlock | InputEmailBlock | InputPhoneBlock

const props = withDefaults(
  defineProps<{
    block: InputBlock
    mode: 'editor' | 'live'
    modelValue?: string
    /** Fehlermeldung vom Renderer (nach Validierung). Setzt aria-invalid und
     *  aria-describedby auf das Eingabefeld fuer Screenreader-Kontext. */
    error?: string
  }>(),
  { modelValue: undefined, error: undefined },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isPhone = computed(() => props.block.type === 'input_phone')

const inputType = computed<string>(() => {
  switch (props.block.type) {
    case 'input_email':
      return 'email'
    case 'input_phone':
      return 'tel'
    default:
      return 'text'
  }
})

const placeholder = computed<string>(() => {
  if (props.block.type === 'input_phone') return ''
  return props.block.placeholder ?? ''
})

// ---------------------------------------------------------------------------
// Telefon: Ländervorwahl
// ---------------------------------------------------------------------------

/** Statische Liste DE/AT/CH mit Flagge und Vorwahl */
const countryCodes = [
  { code: 'DE', flag: '🇩🇪', dialCode: '+49' },
  { code: 'AT', flag: '🇦🇹', dialCode: '+43' },
  { code: 'CH', flag: '🇨🇭', dialCode: '+41' },
] as const

type CountryCode = typeof countryCodes[number]['code']

const selectedCountry = ref<CountryCode>(
  (props.block.type === 'input_phone'
    ? props.block.defaultCountryCode
    : 'DE') as CountryCode,
)

const selectedCountryData = computed(
  () => countryCodes.find(c => c.code === selectedCountry.value) ?? countryCodes[0]!,
)

function handleInput(event: Event): void {
  if (props.mode === 'live') {
    const raw = (event.target as HTMLInputElement).value
    const val = isPhone.value
      ? `${selectedCountryData.value.dialCode}${raw}`
      : raw
    emit('update:modelValue', val)
  }
}

function handleCountryChange(event: Event): void {
  if (props.mode === 'live') {
    selectedCountry.value = (event.target as HTMLSelectElement).value as CountryCode
    // Wert neu emittieren, damit die Vorwahl aktualisiert wird
    const inputEl = (event.target as HTMLSelectElement)
      .closest('.phone-wrapper')
      ?.querySelector('input')
    const raw = inputEl ? (inputEl as HTMLInputElement).value : ''
    emit('update:modelValue', `${selectedCountryData.value.dialCode}${raw}`)
  }
}
</script>

<template>
  <div class="w-full">
    <!-- Label -->
    <label
      :for="block.id"
      class="mb-1.5 block text-sm font-medium"
      :style="{ color: 'var(--funnel-text)' }"
    >
      {{ block.label }}
      <span
        v-if="block.required"
        class="ml-0.5 text-red-500"
        aria-label="Pflichtfeld"
      >*</span>
    </label>

    <!-- Telefon: Ländervorwahl + Eingabe -->
    <div
      v-if="isPhone"
      class="phone-wrapper flex overflow-hidden rounded-[var(--funnel-radius)] border border-gray-200 bg-white transition-colors focus-within:border-[var(--funnel-accent)] focus-within:ring-2 focus-within:ring-[var(--funnel-accent)]"
    >
      <!-- Ländervorwahl-Dropdown -->
      <label
        :for="`${block.id}-country`"
        class="sr-only"
      >Ländervorwahl</label>
      <select
        :id="`${block.id}-country`"
        :value="selectedCountry"
        :disabled="mode === 'editor'"
        class="flex-shrink-0 border-r border-gray-200 bg-transparent py-2.5 pl-3 pr-2 text-sm focus:outline-none"
        :style="{ color: 'var(--funnel-text)' }"
        @change="handleCountryChange"
      >
        <option
          v-for="country in countryCodes"
          :key="country.code"
          :value="country.code"
        >
          {{ country.flag }} {{ country.dialCode }}
        </option>
      </select>

      <!-- Rufnummer-Eingabe -->
      <input
        :id="block.id"
        type="tel"
        :name="(block as InputPhoneBlock).fieldKey"
        placeholder="Rufnummer"
        :readonly="mode === 'editor'"
        :required="block.required ?? false"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `field-error-${block.id}` : undefined"
        class="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none"
        :style="{ color: 'var(--funnel-text)' }"
        @input="handleInput"
      >
    </div>

    <!-- Text / E-Mail -->
    <input
      v-else
      :id="block.id"
      :type="inputType"
      :name="block.fieldKey"
      :placeholder="placeholder"
      :value="modelValue ?? ''"
      :readonly="mode === 'editor'"
      :required="block.required ?? false"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `field-error-${block.id}` : undefined"
      class="w-full rounded-[var(--funnel-radius)] border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder-gray-400 transition-colors focus:border-[var(--funnel-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--funnel-accent)]"
      :class="{ 'border-red-400': error }"
      :style="{ color: 'var(--funnel-text)' }"
      @input="handleInput"
    >
  </div>
</template>
