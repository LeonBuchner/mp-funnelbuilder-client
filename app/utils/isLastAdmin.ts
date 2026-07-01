import type { WorkspaceMember } from '~/types/api'

/**
 * Prüft, ob der Nutzer mit der gegebenen userId der letzte mp_admin im
 * Workspace ist. Wenn ja, darf er weder entfernt noch herabgestuft werden,
 * da sonst kein Admin mehr im Workspace verbleibt.
 *
 * Reine Funktion ohne Seiteneffekte – gezielt als Util statt Composable,
 * damit sie direkt in Vitest ohne Vue-Kontext testbar ist.
 */
export function isLastAdmin(members: WorkspaceMember[], userId: string): boolean {
  // Nur akzeptierte Admins zählen (accepted_at !== null), spiegelt die Backend-Logik wider:
  // WorkspaceMemberController prüft ebenfalls whereNotNull('accepted_at').
  const admins = members.filter(m => m.role === 'mp_admin' && m.accepted_at !== null)
  if (admins.length !== 1) return false
  return admins[0]?.id === userId
}
