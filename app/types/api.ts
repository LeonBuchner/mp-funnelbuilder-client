/**
 * Rollen innerhalb eines Workspaces.
 * mp_admin: voller Zugriff (Marketing Planet intern)
 * mp_team: baut Funnels
 * client: liest Metriken und Leads
 */
export type WorkspaceRole = 'mp_admin' | 'mp_team' | 'client'

export interface WorkspaceSettings {
  default_locale: string
  timezone: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  logo_path: string | null
  /** Öffentliche URL des Workspace-Logos (seit WV.7). */
  logo_url: string | null
  mp_branding_enabled: boolean
  settings: WorkspaceSettings
  created_at: string
}

/**
 * Mitglied eines Workspaces (GET /workspaces/{ws}/members).
 */
export interface WorkspaceMember {
  id: string
  name: string
  email: string
  role: WorkspaceRole
  accepted_at: string | null
  is_current_user: boolean
}

export interface Membership {
  role: WorkspaceRole
  accepted_at: string | null
  workspace: Workspace
}

export interface User {
  id: string
  name: string
  email: string
  email_verified_at: string | null
  created_at: string
}

/** Antwort von POST /auth/login */
export interface LoginResponse {
  token: string
  user: User
  memberships: Membership[]
}

/** Antwort von GET /auth/me */
export interface MeResponse {
  user: User
  memberships: Membership[]
}
