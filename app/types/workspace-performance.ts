/**
 * Typen fuer die workspace-weite Performance-API.
 *
 * GET /workspaces/{workspaceUuid}/performance?from=YYYY-MM-DD&to=YYYY-MM-DD
 */

export interface WorkspacePerformanceTotals {
  views: number
  starts: number
  leads: number
  conversion_rate: number
}

export interface WorkspacePerformanceFunnelItem {
  funnel: {
    id: string
    name: string
    status: 'draft' | 'published' | 'archived'
  }
  views: number
  starts: number
  leads: number
  conversion_rate: number
}

export interface WorkspacePerformanceTimelinePoint {
  date: string
  views: number
  leads: number
}

export interface WorkspacePerformanceData {
  totals: WorkspacePerformanceTotals
  funnels: WorkspacePerformanceFunnelItem[]
  timeline: WorkspacePerformanceTimelinePoint[]
}

export interface WorkspacePerformanceResponse {
  data: WorkspacePerformanceData
}
