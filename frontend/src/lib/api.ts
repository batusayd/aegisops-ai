import {
  ChatMessageRecord,
  DailyDigestReport,
  DispatchedEmailRecord,
  GlobalTelemetrySummary,
  KBCitation,
  KBChunkInfo,
  SupportedLanguage,
  TicketRecord,
  TicketWebhookPayload,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getHealth: () => request<Record<string, unknown>>("/api/health"),
  getTelemetry: () => request<GlobalTelemetrySummary>("/api/telemetry"),

  // Workflow A: Support Triage, RAG & HITL
  getTickets: () => request<TicketRecord[]>("/api/tickets"),
  getDispatchedEmails: () =>
    request<DispatchedEmailRecord[]>("/api/tickets/dispatched"),
  ingestWebhookTicket: (payload: TicketWebhookPayload) =>
    request<TicketRecord>("/api/tickets/webhook", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  runTicketDemo: (
    scenario:
      | "duplicate_billing"
      | "high_value_escalation"
      | "enterprise_saml_500"
      | "academic_retroactive_refund"
      | "all" = "all"
  ) =>
    request<TicketRecord[]>(`/api/tickets/demo?scenario=${scenario}`, {
      method: "POST",
    }),
  reviewTicketInline: (
    ticketId: string,
    payload: {
      action: "APPROVE" | "REJECT" | "ESCALATE";
      edited_reply?: string;
      edited_subject?: string;
      operator_name?: string;
      operator_notes?: string;
    }
  ) =>
    request<TicketRecord>(`/api/tickets/${ticketId}/review`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  executeMagicLinkToken: (token: string) =>
    request<{
      status: string;
      action_executed: string;
      ticket: TicketRecord;
    }>(`/api/tickets/action?token=${encodeURIComponent(token)}`, {
      method: "POST",
    }),
  updateConfidenceThreshold: (confidence_threshold: number) =>
    request<{ confidence_threshold: number; tickets: TicketRecord[] }>(
      "/api/tickets/threshold",
      {
        method: "POST",
        body: JSON.stringify({ confidence_threshold }),
      }
    ),

  // Knowledge Base (Qdrant + PyMuPDF)
  getKBChunks: () =>
    request<{
      engine: string;
      collection: string;
      count: number;
      chunks: KBChunkInfo[];
    }>("/api/kb/chunks"),
  searchKB: (query: string, top_k = 3) =>
    request<KBCitation[]>("/api/kb/search", {
      method: "POST",
      body: JSON.stringify({ query, top_k }),
    }),
  reingestKB: () =>
    request<Record<string, unknown>>("/api/kb/ingest?reseed=true", {
      method: "POST",
    }),

  // Workflow B: Multilingual Community Chat & Moderation
  getChatMessages: () => request<ChatMessageRecord[]>("/api/chat/messages"),
  postChatMessage: (payload: {
    author_name: string;
    author_handle: string;
    author_role: string;
    language: SupportedLanguage;
    content: string;
    channel?: string;
  }) =>
    request<ChatMessageRecord>("/api/chat/message", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  runChatDemo: (mode: "full_conversation" | "toxic_test_only" = "full_conversation") =>
    request<ChatMessageRecord[]>(`/api/chat/demo?mode=${mode}`, {
      method: "POST",
    }),
  triggerDailyDigest: () =>
    request<DailyDigestReport>("/api/chat/digest", {
      method: "POST",
    }),
  getDailyDigests: () => request<DailyDigestReport[]>("/api/chat/digests"),
};
