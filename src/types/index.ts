// ============================================================================
// ERNESTO Type System
// Complete type definitions for all system components
// ============================================================================

// ── UI & Chat types ──

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: MessageAction[];
}

export interface MessageAction {
  type: 'kb_saved' | 'memory_promoted' | 'conflict_detected' | 'warning';
  label: string;
  metadata?: Record<string, unknown>;
}

// ── File & Import types ──

export type FileType = 'xlsx' | 'xls' | 'xlsm' | 'csv' | 'pdf';

export type ImportStatus =
  | 'queued'
  | 'analyzing'
  | 'analyzed'
  | 'mapping'
  | 'mapped'
  | 'previewing'
  | 'previewed'
  | 'committing'
  | 'committed'
  | 'error';

export type ZoningType = 'ZON' | 'SUB';

export type ServiceDirection = 'domestic' | 'export' | 'import' | 'triangulation';

export interface FileEntry {
  id: string;
  file: File;
  base64: string;
  carrierHint: string;
  status: ImportStatus;
  error?: string;
  analysisResult?: AnalysisResult;
  mappingResult?: MappingResult;
  dryRunResult?: DryRunResult;
  commitResult?: CommitResult;
  chatMessages: ChatMessage[];
  sheetImages?: string[];
}

// Legacy ImportFile (kept for compatibility)
export interface ImportFile {
  id: string;
  name: string;
  size: number;
  type: 'excel' | 'pdf' | 'csv';
  status: 'queued' | 'analyzing' | 'analyzed' | 'error';
  progress: number;
  carrierHint?: string;
  error?: string;
  summary?: FileSummary;
}

export interface FileSummary {
  carrier: string;
  zones: number;
  prices: number;
  confidence: number;
}

// ── Analysis ──

export interface AnalysisResult {
  job_id: string;
  document_id?: string;
  report: string;
  summary: AnalysisSummary;
  structured_data?: StructuredPriceData;
  file_type: FileType;
}

export interface AnalysisSummary {
  carrier: string;
  file_description: string;
  total_zones: number;
  zoning_type: ZoningType | 'UNKNOWN';
  weight_brackets: string;
  currency: string;
  total_data_rows: number;
  supplements_found: string[];
  tables_found: number;
  has_zone_mapping: boolean;
  anomalies: string[];
  confidence: number;
  direction?: ServiceDirection;
  requires_ce_split?: boolean;
}

export interface StructuredPriceData {
  carrier?: string;
  zoning_type?: ZoningType;
  currency?: string;
  weight_unit?: 'kg' | 'lb' | 'mpl' | 'ldm';
  weight_brackets?: number[];
  zones?: Array<{
    zone_number: number;
    zone_label?: string;
    countries?: string[];
  }>;
  zone_mapping?: Array<{
    country_iso: string;
    country_name?: string;
    zone_number: number;
    zone_label?: string;
  }>;
  sub_zone_mapping?: Array<{
    country_iso: string;
    cap_from?: string;
    cap_to?: string;
    province?: string;
    city?: string;
    zone_number: number;
  }>;
  price_table?: Array<{
    zone: number;
    weight_min?: number;
    weight_max: number;
    price: number;
  }>;
  supplements?: Array<{
    supplement_code: string;
    supplement_name: string;
    calc_type: string;
    value: number;
    min_value?: number;
    max_value?: number;
    applies_to_zones?: string;
    notes?: string;
  }>;
  pallet_types?: Array<{
    code: string;
    name: string;
    max_length?: number;
    max_width?: number;
    max_height?: number;
    max_weight?: number;
  }>;
  mpl_brackets?: number[];
  sheets?: Array<{
    sheet_name: string;
    purpose?: string;
    extracted_data?: Record<string, unknown>;
    target_table?: string;
    status?: string;
  }>;
  anomalies?: string[];
  ce_data?: Partial<StructuredPriceData>;
  extra_ce_data?: Partial<StructuredPriceData>;
}

// ── Mapping ──

export interface MappingResult {
  job_id: string;
  mapping: AIMapping;
}

export interface AIMapping {
  carrier: string;
  zoning_type: ZoningType;
  currency: string;
  weight_unit: 'kg' | 'lb' | 'mpl' | 'ldm';
  columns: ColumnMapping[];
  supplements_detected: string[];
  confidence: number;
  notes?: string;
}

export interface ColumnMapping {
  index: number;
  header: string;
  mapped_to:
    | 'zone_id'
    | 'zone_label'
    | 'country'
    | 'cap_from'
    | 'cap_to'
    | 'province'
    | 'city'
    | 'weight'
    | 'price'
    | 'supplement'
    | 'ignore';
  weight_value?: number;
  supplement_code?: string;
}

// ── Dry Run & Commit ──

export interface DryRunResult {
  job_id: string;
  stats: ImportStats;
  warnings: ImportWarning[];
  preview: {
    zones: Record<string, unknown>[];
    prices: Record<string, unknown>[];
    supplements: Record<string, unknown>[];
  };
}

export interface ImportStats {
  total_rows: number;
  zones_count: number;
  prices_count: number;
  supplements_count: number;
  weight_range: { min: number; max: number };
  zone_range: { min: number; max: number };
}

export interface ImportWarning {
  id?: string;
  type?:
    | 'gap'
    | 'overlap'
    | 'missing_zone'
    | 'duplicate'
    | 'invalid_price'
    | 'ce_split_needed';
  message: string;
  row_index?: number;
  severity: 'info' | 'warning' | 'error';
  field?: string;
}

export interface CommitResult {
  job_id: string;
  price_list_id: string;
  service_id?: string;
  inserted: { zones: number; prices: number; supplements: number };
}

// ── Chat ──

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: ChatAction[];
  timestamp?: string;
}

export interface ChatAction {
  type:
    | 'kb_rule_saved'
    | 'kb_rule_updated'
    | 'memory_saved'
    | 'memory_promoted'
    | 'memory_search'
    | 'document_updated'
    | 'conflict_detected'
    | 'attachment_saved'
    | 'error';
  success?: boolean;
  rule?: {
    title: string;
    carrier?: string;
    operation?: string;
    id?: string;
  };
  memory?: {
    title: string;
    category?: string;
    level?: string;
  };
  conflict?: {
    items: string[];
    type: string;
  };
  results?: unknown[];
  file_name?: string;
  change?: string;
  error?: string;
  message?: string;
}

// ── Price Data ──

export interface PriceZone {
  country_iso: string;
  zone_number: number;
  zone_label: string;
}

export interface PriceEntry {
  zone_id: string;
  weight: number;
  price: number;
  currency: string;
}

export interface Supplement {
  code: string;
  name: string;
  calc_type: 'absolute' | 'percentage';
  value: number;
}

// ── Import Data ──

export interface ImportData {
  carrier: string;
  serviceName: string;
  zoningType: 'standard' | 'custom';
  currency: string;
  zones: PriceZone[];
  prices: PriceEntry[];
  supplements: Supplement[];
  warnings: ImportWarning[];
  ceExtraCeSplit?: boolean;
}

// ── Memory (Hydra) ──

export type MemoryLevel = 'L1' | 'L2' | 'L3';

export type MemoryItemType =
  | 'rule'
  | 'pattern'
  | 'correction'
  | 'preference'
  | 'format'
  | 'procedure'
  | 'fact'
  | 'schema';

export interface MemoryItem {
  id: string;
  level: MemoryLevel;
  type: MemoryItemType;
  title: string;
  content: string;
  tags: string[];
  carrier?: string;
  confidence: number;
  usefulness: number;
  relevance: number;
  accessCount: number;
  source: string;
  approved: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  promotedFrom?: MemoryLevel;
  promotedAt?: string;
  version: number;
}

// Legacy HydraMemoryItem (kept for compatibility)
export interface HydraMemoryItem {
  id: string;
  content: string;
  level: 'L1' | 'L2' | 'L3';
  confidence: number;
  accessCount: number;
  tags: string[];
  linkedRuleId?: string;
  createdAt: Date;
  lastAccessedAt: Date;
}

// ── Knowledge Base ──

export interface KBRule {
  id: string;
  carrier_code?: string;
  operation_type: string;
  rule_type: string;
  title: string;
  content: string;
  priority: number;
  tags: string[];
  is_active: boolean;
  source: string;
  source_document_id?: string;
  memory_item_id?: string; // Link to Hydra memory
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Legacy KnowledgeBaseRule (kept for compatibility)
export interface KnowledgeBaseRule {
  id: string;
  title: string;
  content: string;
  carrier: string;
  operation: 'extract' | 'validate' | 'transform' | 'merge';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

// ── Dashboard ──

export interface ImportHistory {
  id: string;
  file_name: string;
  carrier: string;
  status: ImportStatus;
  zones_imported: number;
  prices_imported: number;
  confidence: number;
  created_at: string;
}

export interface SystemHealth {
  totalMemoryItems: number;
  l1Count: number;
  l2Count: number;
  l3Count: number;
  avgConfidence: number;
  kbRulesCount: number;
  importsCompleted: number;
  learningScore: number;
}

// Legacy MemoryHealth (kept for compatibility)
export interface MemoryHealth {
  l1Count: number;
  l2Count: number;
  l3Count: number;
  avgConfidence: number;
  healthScore: number;
}

// Legacy RecentImport (kept for compatibility)
export interface RecentImport {
  id: string;
  carrier: string;
  serviceName: string;
  status: 'success' | 'partial' | 'failed';
  confidence: number;
  timestamp: Date;
  pricesCount: number;
  zonesCount: number;
}

// ── Workflow ──

export type Step = 'upload' | 'workspace' | 'preview' | 'confirm' | 'result';

export interface ImportState {
  currentStep: Step;
  files: ImportFile[];
  data: ImportData | null;
  aiReport: string;
  pricelistName: string;
}

// ── Promotion Thresholds (Hydra Learning) ──

export const PROMOTION_THRESHOLDS = {
  L1_TO_L2: {
    accessCount: 3,
    usefulness: 40,
    confidence: 50,
  },
  L2_TO_L3: {
    accessCount: 8,
    usefulness: 70,
    confidence: 75,
    approved: true,
  },
} as const;

// ── Decay Configuration (Hydra Maintenance) ──

export const MEMORY_DECAY_CONFIG = {
  decayRatePerDay: 0.02, // 2% per day
  minRelevance: 0.1,
  decayCheckIntervalHours: 24,
} as const;
