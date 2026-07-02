/**
 * API-Composable fuer Geraeteverteilungs-Metriken (M4.7).
 *
 * GET /funnels/{funnelId}/metrics/devices
 * -> [{ device_type, count, percent }]
 *
 * Exportiert reine Hilfsfunktionen fuer Unit-Tests.
 */

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export interface DeviceMetric {
  device_type: string
  count: number
  percent: number
}

// ---------------------------------------------------------------------------
// Reine Hilfsfunktionen (testbar ohne Nuxt)
// ---------------------------------------------------------------------------

/**
 * Gibt ein lesbares deutsches Label fuer einen Geraetetyp zurueck.
 */
export function getDeviceLabel(deviceType: string): string {
  const labels: Record<string, string> = {
    desktop: 'Desktop',
    mobile: 'Mobil',
    tablet: 'Tablet',
    unknown: 'Unbekannt',
  }
  return labels[deviceType] ?? deviceType
}

/**
 * Normalisiert die Prozentwerte auf exakt 100 %.
 * Der letzte Eintrag bekommt den Rest, um Rundungsfehler auszugleichen.
 * Leere Liste: gibt [] zurueck.
 */
export function normalizeDevicePercents(devices: DeviceMetric[]): DeviceMetric[] {
  if (devices.length === 0) return []
  const total = devices.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) return devices.map((d) => ({ ...d, percent: 0 }))

  let remaining = 100
  return devices.map((d, i) => {
    if (i === devices.length - 1) {
      return { ...d, percent: remaining }
    }
    const p = Math.round((d.count / total) * 100)
    remaining -= p
    return { ...d, percent: p }
  })
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useMetricsDevices() {
  const api = useApi()

  /**
   * Laedt die Geraeteverteilung fuer einen Funnel.
   * GET /funnels/{funnelId}/metrics/devices
   */
  async function get(funnelId: string): Promise<DeviceMetric[]> {
    return api<DeviceMetric[]>(`/funnels/${funnelId}/metrics/devices`)
  }

  return { get }
}
