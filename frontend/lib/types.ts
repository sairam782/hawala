export const SHAPES = ['cycle', 'fan-out', 'fan-in', 'scatter-gather', 'chain', 'mesh', 'other', 'lone'] as const
export type Shape = (typeof SHAPES)[number]

export interface DatasetInfo { name: string; slice_transfers: number; slice_laundering: number; groups: number; shapes: Partial<Record<Shape, number>>; units: number; ring_units: number; ordinary_units: number; notes: string[] }
export interface ShapeResult { rings: number; found: number; verdict_right: number }
export interface ModelResult { id: string; family: string; version: string; runs: number; verdict_right: number; precision: number; recall: number; tp: number; fp: number; fn: number; rings_found: number; rings_total: number; pattern_named_ok: number; false_rings: number; technical_failures: number; by_shape: Partial<Record<Shape, ShapeResult>>; cost_usd: number; latency_ms_median: number; prism_agent_name: string }
export interface RunResult { run_id?: string; model?: string; model_id?: string; family?: string; version: string; unit: string; ibm_shape?: string | null; expected?: string; verdict?: string; pattern?: string; confidence?: string | number; why?: string; flagged_transfer_ids?: string[]; tp?: number; fp?: number; fn?: number; ring_found?: boolean; correct?: boolean; technical_failure?: boolean; kb_used?: string | string[] | boolean; latency_ms?: number; cost_usd?: number; error?: string | null }
export type FailureExample = string | { why?: string; model?: string; unit?: string; [key: string]: unknown }
export type FailureCluster = FailureExample[] | { count?: number; examples?: FailureExample[]; [key: string]: unknown }
export interface BaselineResult { id?: string; name: string; precision: number; recall?: number; rings_found: number; rings_total?: number; false_rings: number; verdict_right?: number }
export interface BenchResults { dataset: DatasetInfo; versions: Record<string, string>; written: string; models: ModelResult[]; runs: RunResult[]; failures_by_shape: Record<string, FailureCluster>; baselines?: BaselineResult[] }
export interface PanelSummary { families: string[]; note: string; units_answered_by_all: number; ring_units_all_agree_ring: number; ring_units_none_say_ring: number; ring_units_split: number; ordinary_units_all_agree_ordinary: number; ordinary_units_all_say_ring: number; ordinary_units_split: number; missed_by_most: [string, string, number][] }
export interface AgreementRow { unit: string; expected: string; shape: string; ring_votes: number; families: number; said_ring: string[] }
export interface VoteRow { votes_needed: number; of: number; verdict_right: number; precision: number; recall: number; rings_found: number; rings_total: number; false_rings: number }
export interface PanelVersion { summary: PanelSummary; agreement: AgreementRow[]; vote_table: VoteRow[] }
export interface PanelData { written: string; versions: Record<string, PanelVersion> }
export type TransferRow = [string, string, string, string, number, string, string, string, string]
export interface RingMeta { shape: string; n: number }
export interface SliceData { dataset: string; columns: string[]; transfers: TransferRow[]; key: Record<string, [number, number]>; ring_meta: Record<string, RingMeta>; slice?: Record<string, unknown> }
