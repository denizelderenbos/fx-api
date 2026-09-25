import { SyncRunSchema } from '#database/schema'

export const SYNC_SOURCES = ['hist', '90d', 'daily'] as const
export type SyncSource = (typeof SYNC_SOURCES)[number]

export const SYNC_STATUSES = ['ok', 'failed'] as const
export type SyncStatus = (typeof SYNC_STATUSES)[number]

/**
 * One execution of an ECB sync. A row is created when the run starts;
 * status stays null until it finishes.
 */
export default class SyncRun extends SyncRunSchema {
  declare source: SyncSource
  declare status: SyncStatus | null
}
