/**
 * Unit-Tests fuer das useUploads-Composable.
 *
 * Gemockt: ~/composables/useApi -> gibt eine vi.fn() zurueck,
 * damit keine echten HTTP-Aufrufe stattfinden.
 *
 * Geprueft wird:
 * - upload() sendet POST mit FormData an den korrekten Endpunkt,
 *   haengt Datei und optionalen Alt-Text korrekt an und gibt das UploadItem zurueck.
 * - list() sendet GET mit page-Query-Parameter an den korrekten Endpunkt.
 * - list() verwendet Standardseite 1 wenn kein Parameter uebergeben wird.
 * - remove() sendet DELETE an den korrekten Endpunkt.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUploads } from '../../app/composables/useUploads'
import type { UploadItem, UploadListResponse } from '../../app/composables/useUploads'

// ---------------------------------------------------------------------------
// Mock: useApi
// ---------------------------------------------------------------------------

const mockApiFn = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useApi', () => ({
  useApi: () => mockApiFn,
}))

// ---------------------------------------------------------------------------
// Testdaten
// ---------------------------------------------------------------------------

const sampleItem: UploadItem = {
  id: 'upload-uuid-1',
  url: 'http://localhost:8000/storage/workspaces/ws-1/test.webp',
  width: 800,
  height: 600,
  alt_text: 'Ein Testbild',
  original_filename: 'test.jpg',
  file_size_bytes: 102400,
  created_at: '2026-01-15T10:00:00Z',
}

const sampleListResponse: UploadListResponse = {
  data: [sampleItem],
  meta: {
    current_page: 1,
    last_page: 3,
    total: 72,
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useUploads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // upload()
  // -------------------------------------------------------------------------

  it('upload() sendet POST mit FormData an den korrekten Endpunkt', async () => {
    mockApiFn.mockResolvedValueOnce({ data: sampleItem })

    const { upload } = useUploads()
    const file = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' })

    await upload('ws-uuid-1', file)

    expect(mockApiFn).toHaveBeenCalledOnce()
    const [url, options] = mockApiFn.mock.calls[0] as [string, { method: string, body: FormData }]
    expect(url).toBe('/workspaces/ws-uuid-1/uploads')
    expect(options.method).toBe('POST')
  })

  it('upload() uebergibt die Datei als FormData-Feld "file"', async () => {
    mockApiFn.mockResolvedValueOnce({ data: sampleItem })

    const { upload } = useUploads()
    const file = new File(['pixel'], 'logo.png', { type: 'image/png' })

    await upload('ws-uuid-1', file)

    const [, options] = mockApiFn.mock.calls[0] as [string, { body: FormData }]
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('file')).toBe(file)
  })

  it('upload() haengt alt_text an FormData wenn angegeben', async () => {
    mockApiFn.mockResolvedValueOnce({ data: sampleItem })

    const { upload } = useUploads()
    const file = new File(['data'], 'hero.webp', { type: 'image/webp' })

    await upload('ws-uuid-1', file, 'Unser Hero-Bild')

    const [, options] = mockApiFn.mock.calls[0] as [string, { body: FormData }]
    expect(options.body.get('alt_text')).toBe('Unser Hero-Bild')
  })

  it('upload() haengt alt_text nicht an FormData wenn nicht angegeben', async () => {
    mockApiFn.mockResolvedValueOnce({ data: sampleItem })

    const { upload } = useUploads()
    const file = new File(['data'], 'image.jpg', { type: 'image/jpeg' })

    await upload('ws-uuid-1', file)

    const [, options] = mockApiFn.mock.calls[0] as [string, { body: FormData }]
    expect(options.body.get('alt_text')).toBeNull()
  })

  it('upload() gibt das UploadItem zurueck', async () => {
    mockApiFn.mockResolvedValueOnce({ data: sampleItem })

    const { upload } = useUploads()
    const file = new File(['data'], 'image.jpg', { type: 'image/jpeg' })

    const result = await upload('ws-uuid-1', file)

    expect(result).toEqual(sampleItem)
  })

  // -------------------------------------------------------------------------
  // list()
  // -------------------------------------------------------------------------

  it('list() sendet GET an den korrekten Endpunkt', async () => {
    mockApiFn.mockResolvedValueOnce(sampleListResponse)

    const { list } = useUploads()
    await list('ws-uuid-1', 2)

    expect(mockApiFn).toHaveBeenCalledOnce()
    const [url] = mockApiFn.mock.calls[0] as [string]
    expect(url).toBe('/workspaces/ws-uuid-1/uploads')
  })

  it('list() uebergibt den page-Parameter als Query', async () => {
    mockApiFn.mockResolvedValueOnce(sampleListResponse)

    const { list } = useUploads()
    await list('ws-uuid-1', 2)

    const [, options] = mockApiFn.mock.calls[0] as [string, { query: Record<string, number> }]
    expect(options.query).toEqual({ page: 2 })
  })

  it('list() verwendet Seite 1 als Standard', async () => {
    mockApiFn.mockResolvedValueOnce(sampleListResponse)

    const { list } = useUploads()
    await list('ws-uuid-1')

    const [, options] = mockApiFn.mock.calls[0] as [string, { query: Record<string, number> }]
    expect(options.query).toEqual({ page: 1 })
  })

  it('list() gibt die paginierte Antwort mit meta zurueck', async () => {
    mockApiFn.mockResolvedValueOnce(sampleListResponse)

    const { list } = useUploads()
    const result = await list('ws-uuid-1', 1)

    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.id).toBe('upload-uuid-1')
    expect(result.meta.current_page).toBe(1)
    expect(result.meta.last_page).toBe(3)
    expect(result.meta.total).toBe(72)
  })

  // -------------------------------------------------------------------------
  // remove()
  // -------------------------------------------------------------------------

  it('remove() sendet DELETE an den korrekten Endpunkt', async () => {
    mockApiFn.mockResolvedValueOnce(undefined)

    const { remove } = useUploads()
    await remove('upload-uuid-1')

    expect(mockApiFn).toHaveBeenCalledOnce()
    const [url, options] = mockApiFn.mock.calls[0] as [string, { method: string }]
    expect(url).toBe('/uploads/upload-uuid-1')
    expect(options.method).toBe('DELETE')
  })

  it('remove() loest keinen Fehler bei erfolgreichem Loeschen', async () => {
    mockApiFn.mockResolvedValueOnce(undefined)

    const { remove } = useUploads()
    await expect(remove('upload-uuid-1')).resolves.toBeUndefined()
  })
})
