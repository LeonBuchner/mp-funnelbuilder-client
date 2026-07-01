/**
 * Unit-Tests fuer die isLastAdmin-Util (WV.6).
 *
 * Geprueft wird:
 * - Gibt true zurueck wenn der gegebene User der einzige Admin ist.
 * - Gibt false zurueck wenn mehrere Admins vorhanden sind.
 * - Gibt false zurueck wenn der User kein Admin ist.
 * - Gibt false zurueck bei leerer Mitgliederliste.
 * - Gibt false zurueck wenn der User nicht in der Liste ist.
 */
import { describe, it, expect } from 'vitest'
import type { WorkspaceMember } from '../../app/types/api'
import { isLastAdmin } from '../../app/utils/isLastAdmin'

// ---------------------------------------------------------------------------
// Testdaten
// ---------------------------------------------------------------------------

function makeMember(overrides: Partial<WorkspaceMember>): WorkspaceMember {
  return {
    id: 'default-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'mp_team',
    accepted_at: '2026-01-01T00:00:00Z',
    is_current_user: false,
    ...overrides,
  }
}

const adminA = makeMember({ id: 'admin-a', role: 'mp_admin' })
const adminB = makeMember({ id: 'admin-b', role: 'mp_admin' })
const teamMember = makeMember({ id: 'team-1', role: 'mp_team' })
const clientMember = makeMember({ id: 'client-1', role: 'client' })

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('isLastAdmin', () => {
  it('gibt true zurueck wenn der User der einzige Admin ist', () => {
    const members: WorkspaceMember[] = [adminA, teamMember, clientMember]
    expect(isLastAdmin(members, 'admin-a')).toBe(true)
  })

  it('gibt false zurueck wenn zwei Admins vorhanden sind', () => {
    const members: WorkspaceMember[] = [adminA, adminB, teamMember]
    expect(isLastAdmin(members, 'admin-a')).toBe(false)
    expect(isLastAdmin(members, 'admin-b')).toBe(false)
  })

  it('gibt false zurueck wenn der User kein Admin ist', () => {
    const members: WorkspaceMember[] = [adminA, teamMember, clientMember]
    expect(isLastAdmin(members, 'team-1')).toBe(false)
    expect(isLastAdmin(members, 'client-1')).toBe(false)
  })

  it('gibt false zurueck bei leerer Mitgliederliste', () => {
    expect(isLastAdmin([], 'admin-a')).toBe(false)
  })

  it('gibt false zurueck wenn der User nicht in der Liste ist', () => {
    const members: WorkspaceMember[] = [adminA, teamMember]
    expect(isLastAdmin(members, 'unbekannte-id')).toBe(false)
  })

  it('gibt false zurueck wenn es keine Admins in der Liste gibt', () => {
    const members: WorkspaceMember[] = [teamMember, clientMember]
    expect(isLastAdmin(members, 'team-1')).toBe(false)
  })

  it('gibt true zurueck auch wenn der User is_current_user=false hat', () => {
    const loneAdmin = makeMember({ id: 'solo-admin', role: 'mp_admin', is_current_user: false })
    const members: WorkspaceMember[] = [loneAdmin, teamMember]
    expect(isLastAdmin(members, 'solo-admin')).toBe(true)
  })

  it('gibt false zurueck wenn es genau einen Admin gibt, aber nicht den gefragten User', () => {
    const members: WorkspaceMember[] = [adminA, teamMember]
    expect(isLastAdmin(members, 'team-1')).toBe(false)
  })

  // Konsistenz mit Backend-Logik: nur akzeptierte Admins (accepted_at != null) zaehlen.
  it('zaehlt einen ausstehenden Admin (accepted_at=null) NICHT als aktiven Admin', () => {
    const acceptedAdmin = makeMember({ id: 'accepted-admin', role: 'mp_admin', accepted_at: '2026-01-01T00:00:00Z' })
    const pendingAdmin = makeMember({ id: 'pending-admin', role: 'mp_admin', accepted_at: null })
    const members: WorkspaceMember[] = [acceptedAdmin, pendingAdmin, teamMember]
    // acceptedAdmin ist der einzige _aktive_ Admin -> isLastAdmin = true
    expect(isLastAdmin(members, 'accepted-admin')).toBe(true)
    // pendingAdmin ist nicht aktiv -> isLastAdmin = false
    expect(isLastAdmin(members, 'pending-admin')).toBe(false)
  })

  it('gibt false zurueck wenn der einzige Admin noch nicht akzeptiert hat (accepted_at=null)', () => {
    const pendingAdmin = makeMember({ id: 'pending-admin', role: 'mp_admin', accepted_at: null })
    const members: WorkspaceMember[] = [pendingAdmin, teamMember]
    // Kein aktiver Admin -> kein "letzter Admin"
    expect(isLastAdmin(members, 'pending-admin')).toBe(false)
  })
})
