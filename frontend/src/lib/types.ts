export type ModelTier = "FAST_ROUTER" | "REASONING_DRAFT";

export interface LLMCallMetrics {
  call_id: string;
  task_type: string;
  tier: ModelTier;
  model_used: string;
  baseline_model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  baseline_latency_ms: number;
  latency_saved_ms: number;
  actual_cost_usd: number;
  baseline_cost_usd: number;
  cost_saved_usd: number;
  is_fallback_simulation: boolean;
  timestamp: string;
}

export interface GlobalTelemetrySummary {
  total_calls: number;
  fast_tier_calls: number;
  reasoning_tier_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_actual_cost_usd: number;
  total_baseline_cost_usd: number;
  total_cost_saved_usd: number;
  cost_savings_percentage: number;
  avg_latency_ms: number;
  avg_baseline_latency_ms: number;
  total_latency_saved_ms: number;
  active_fast_model: string;
  active_reasoning_model: string;
  recent_calls: LLMCallMetrics[];
}

export type TicketState =
  | "INGESTED"
  | "CLASSIFIED"
  | "DRAFTED"
  | "PENDING_APPROVAL"
  | "APPROVED_AND_SENT"
  | "REJECTED"
  | "ESCALATED";

export type TicketCategory =
  | "BILLING_REFUND"
  | "TECHNICAL_SUPPORT"
  | "ACADEMIC_PROGRAM"
  | "ACCOUNT_SECURITY"
  | "GENERAL_INQUIRY";

export type UrgencyLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SentimentType = "POSITIVE" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";

export interface IntentClassification {
  category: TicketCategory;
  urgency: UrgencyLevel;
  sentiment: SentimentType;
  requires_human_escalation: boolean;
  detected_language: string;
  key_entities: string[];
  triage_reasoning: string;
}

export interface KBCitation {
  chunk_id: string;
  doc_id: string;
  source_file: string;
  section_ref: string;
  title: string;
  snippet: string;
  similarity_score: number;
}

export interface RAGDraftOutput {
  draft_reply: string;
  citations: string[];
  confidence_score: number;
  suggested_subject: string;
  resolution_summary: string;
}

export interface TicketWebhookPayload {
  customer_name: string;
  customer_email: string;
  subject: string;
  body: string;
  channel: "EMAIL" | "WEBHOOK" | "PORTAL" | "DEMO_SIMULATOR";
  metadata?: Record<string, unknown>;
}

export interface StateTransitionLog {
  from_state: TicketState | null;
  to_state: TicketState;
  timestamp: string;
  actor: string;
  note: string;
}

export interface DispatchedEmailRecord {
  dispatch_id: string;
  ticket_id: string;
  to_name: string;
  to_email: string;
  from_email: string;
  subject: string;
  final_body: string;
  citations_included: string[];
  approved_by: string;
  approval_method: "DASHBOARD_INLINE" | "MAGIC_LINK_TOKEN" | "AUTO_APPROVED";
  edited_before_send: boolean;
  dispatched_at: string;
  cryptographic_audit_hash: string;
}

export interface TicketRecord {
  ticket_id: string;
  created_at: string;
  updated_at: string;
  state: TicketState;
  state_history: StateTransitionLog[];
  payload: TicketWebhookPayload;
  classification: IntentClassification | null;
  retrieved_chunks: KBCitation[];
  rag_draft: RAGDraftOutput | null;
  mandatory_human_review: boolean;
  mandatory_review_reasons: string[];
  confidence_threshold_applied: number;
  action_token_approve: string | null;
  action_token_reject: string | null;
  approve_magic_link: string | null;
  reject_magic_link: string | null;
  dispatched_email: DispatchedEmailRecord | null;
  operator_notes: string | null;
  reviewed_by: string | null;
  llm_metrics: LLMCallMetrics[];
}

export type SupportedLanguage = "EN" | "PL" | "TR";

export interface ModerationResult {
  is_safe: boolean;
  toxicity_score: number;
  flagged_reason: string | null;
  categories_triggered: string[];
  action_taken: "ALLOWED" | "FLAGGED_WARNING" | "BLOCKED_QUARANTINED";
}

export interface TranslationBundle {
  original_language: SupportedLanguage;
  en: string;
  pl: string;
  tr: string;
  context_resolution_note: string;
}

export interface ChatMessageRecord {
  message_id: string;
  created_at: string;
  author_name: string;
  author_handle: string;
  author_role: string;
  channel: string;
  original_language: SupportedLanguage;
  original_content: string;
  moderation: ModerationResult;
  translations: TranslationBundle;
  sliding_window_context_size: number;
  sliding_window_preview: string[];
  llm_metrics: LLMCallMetrics[];
}

export interface DailyDigestReport {
  digest_id: string;
  generated_at: string;
  trigger_type: "MANUAL_TRIGGER" | "APSCHEDULER_CRON";
  period_label: string;
  total_messages_analyzed: number;
  safe_messages_count: number;
  flagged_messages_count: number;
  language_breakdown: Record<string, number>;
  executive_summary: string;
  top_technical_topics: string[];
  unresolved_member_questions: string[];
  moderation_incidents_summary: string;
  recommended_engineering_actions: string[];
  llm_metrics: LLMCallMetrics | null;
}

export interface KBChunkInfo {
  chunk_id: string;
  doc_id: string;
  source_file: string;
  section_ref: string;
  title: string;
  content: string;
}
