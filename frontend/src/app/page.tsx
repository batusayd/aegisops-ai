"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Globe, LifeBuoy } from "lucide-react";
import HeaderMetrics from "@/components/HeaderMetrics";
import SupportTriageTab from "@/components/SupportTriageTab";
import MultilingualChatTab from "@/components/MultilingualChatTab";
import { api, WS_BASE_URL } from "@/lib/api";
import {
  ChatMessageRecord,
  DailyDigestReport,
  DispatchedEmailRecord,
  GlobalTelemetrySummary,
  KBChunkInfo,
  SupportedLanguage,
  TicketRecord,
  TicketWebhookPayload,
} from "@/lib/types";

const INITIAL_TELEMETRY: GlobalTelemetrySummary = {
  total_calls: 0,
  fast_tier_calls: 0,
  reasoning_tier_calls: 0,
  total_input_tokens: 0,
  total_output_tokens: 0,
  total_actual_cost_usd: 0,
  total_baseline_cost_usd: 0,
  total_cost_saved_usd: 0,
  cost_savings_percentage: 0,
  avg_latency_ms: 0,
  avg_baseline_latency_ms: 0,
  total_latency_saved_ms: 0,
  active_fast_model: "gpt-4o-mini",
  active_reasoning_model: "gpt-4o",
  recent_calls: [],
};

export default function MissionControlDashboard() {
  const [activeTab, setActiveTab] = useState<"WORKFLOW_A" | "WORKFLOW_B">(
    "WORKFLOW_A"
  );
  const [wsConnected, setWsConnected] = useState(false);
  const [telemetry, setTelemetry] =
    useState<GlobalTelemetrySummary>(INITIAL_TELEMETRY);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [dispatchedEmails, setDispatchedEmails] = useState<
    DispatchedEmailRecord[]
  >([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.75);

  const [kbChunks, setKbChunks] = useState<KBChunkInfo[]>([]);
  const [qdrantEngine, setQdrantEngine] = useState<string>("QDRANT");

  const [chatMessages, setChatMessages] = useState<ChatMessageRecord[]>([]);
  const [digests, setDigests] = useState<DailyDigestReport[]>([]);
  const [isRunningShowcase, setIsRunningShowcase] = useState(false);

  const fetchAllState = useCallback(async () => {
    try {
      const [tel, tks, emails, kb, msgs, dgs] = await Promise.all([
        api.getTelemetry(),
        api.getTickets(),
        api.getDispatchedEmails(),
        api.getKBChunks(),
        api.getChatMessages(),
        api.getDailyDigests(),
      ]);
      setTelemetry(tel);
      setTickets(tks);
      if (tks.length > 0 && !selectedTicketId) {
        setSelectedTicketId(tks[0].ticket_id);
      }
      setDispatchedEmails(emails);
      setKbChunks(kb.chunks || []);
      setQdrantEngine(kb.engine || "QDRANT");
      setChatMessages(msgs);
      setDigests(dgs);
    } catch (err) {
      console.error("Failed to fetch initial state:", err);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    fetchAllState();
  }, [fetchAllState]);

  // Connect to Real-Time WebSocket Stream
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(WS_BASE_URL);
        ws.onopen = () => {
          setWsConnected(true);
        };
        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            const { event, data } = msg;

            if (event === "INITIAL_SNAPSHOT") {
              if (data.telemetry) setTelemetry(data.telemetry);
              if (data.tickets) {
                setTickets(data.tickets);
                if (data.tickets.length > 0) {
                  setSelectedTicketId(
                    (prev) => prev || data.tickets[0].ticket_id
                  );
                }
              }
              if (data.dispatched_emails)
                setDispatchedEmails(data.dispatched_emails);
              if (data.chat_messages) setChatMessages(data.chat_messages);
              if (data.digests) setDigests(data.digests);
              if (typeof data.confidence_threshold === "number") {
                setConfidenceThreshold(data.confidence_threshold);
              }
            } else if (event === "TELEMETRY_UPDATED") {
              setTelemetry(data as GlobalTelemetrySummary);
            } else if (event === "TICKET_UPDATED") {
              const updated = data as TicketRecord;
              setTickets((prev) => {
                const idx = prev.findIndex(
                  (t) => t.ticket_id === updated.ticket_id
                );
                if (idx === -1) return [updated, ...prev];
                const copy = [...prev];
                copy[idx] = updated;
                return copy;
              });
              setSelectedTicketId((prev) => prev || updated.ticket_id);
            } else if (event === "EMAIL_DISPATCHED") {
              const record = data as DispatchedEmailRecord;
              setDispatchedEmails((prev) => [
                record,
                ...prev.filter((e) => e.dispatch_id !== record.dispatch_id),
              ]);
            } else if (event === "CHAT_MESSAGE_PROCESSED") {
              const chatRec = data as ChatMessageRecord;
              setChatMessages((prev) =>
                prev.some((m) => m.message_id === chatRec.message_id)
                  ? prev
                  : [...prev, chatRec]
              );
            } else if (event === "DAILY_DIGEST_GENERATED") {
              const digestRec = data as DailyDigestReport;
              setDigests((prev) => [
                digestRec,
                ...prev.filter((d) => d.digest_id !== digestRec.digest_id),
              ]);
            }
          } catch (e) {
            console.error("WebSocket message parse error:", e);
          }
        };
        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 3000);
        };
        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch {
        setWsConnected(false);
      }
    };

    connectWs();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const selectedTicket =
    tickets.find((t) => t.ticket_id === selectedTicketId) || tickets[0] || null;

  // Handlers for Workflow A
  const handleRunTicketScenario = async (
    scenario:
      | "duplicate_billing"
      | "high_value_escalation"
      | "enterprise_saml_500"
      | "academic_retroactive_refund"
      | "all"
  ) => {
    const created = await api.runTicketDemo(scenario);
    if (created.length > 0) {
      setSelectedTicketId(created[0].ticket_id);
    }
    await fetchAllState();
  };

  const handleIngestCustomTicket = async (payload: TicketWebhookPayload) => {
    const created = await api.ingestWebhookTicket(payload);
    setSelectedTicketId(created.ticket_id);
    await fetchAllState();
  };

  const handleReviewInline = async (
    ticketId: string,
    action: "APPROVE" | "REJECT" | "ESCALATE",
    editedReply?: string,
    editedSubject?: string,
    operatorNotes?: string
  ) => {
    await api.reviewTicketInline(ticketId, {
      action,
      edited_reply: editedReply,
      edited_subject: editedSubject,
      operator_notes: operatorNotes,
    });
    await fetchAllState();
  };

  const handleExecuteMagicLink = async (token: string) => {
    await api.executeMagicLinkToken(token);
    await fetchAllState();
  };

  const handleUpdateThreshold = async (newThreshold: number) => {
    setConfidenceThreshold(newThreshold);
    const res = await api.updateConfidenceThreshold(newThreshold);
    setTickets(res.tickets);
  };

  const handleRefreshKB = async () => {
    await api.reingestKB();
    const kb = await api.getKBChunks();
    setKbChunks(kb.chunks || []);
  };

  // Handlers for Workflow B
  const handleSendChatMessage = async (payload: {
    author_name: string;
    author_handle: string;
    author_role: string;
    language: SupportedLanguage;
    content: string;
  }) => {
    await api.postChatMessage(payload);
    await fetchAllState();
  };

  const handleRunChatDemo = async (
    mode: "full_conversation" | "toxic_test_only"
  ) => {
    await api.runChatDemo(mode);
    await fetchAllState();
  };

  const handleTriggerDigest = async () => {
    await api.triggerDailyDigest();
    await fetchAllState();
  };

  // One-click Full Showcase across both tabs
  const handleRunFullShowcase = async () => {
    setIsRunningShowcase(true);
    try {
      const createdTickets = await api.runTicketDemo("all");
      if (createdTickets.length > 0) {
        setSelectedTicketId(createdTickets[0].ticket_id);
      }
      await api.runChatDemo("full_conversation");
      await api.triggerDailyDigest();
      await fetchAllState();
    } finally {
      setIsRunningShowcase(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070A12]">
      <HeaderMetrics
        telemetry={telemetry}
        wsConnected={wsConnected}
        kbChunkCount={kbChunks.length}
        qdrantEngine={qdrantEngine}
        onRunFullShowcase={handleRunFullShowcase}
        isRunningShowcase={isRunningShowcase}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6 space-y-6">
        {/* Mission Control Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("WORKFLOW_A")}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition border ${
                activeTab === "WORKFLOW_A"
                  ? "bg-indigo-600 text-white border-indigo-400/50 shadow-lg shadow-indigo-600/25"
                  : "bg-[#0E1422] text-slate-400 hover:text-slate-200 border-slate-800"
              }`}
            >
              <LifeBuoy className="h-4 w-4" />
              <span>Tab 1: Support Triage, Qdrant RAG &amp; HITL Agent</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30">
                {tickets.length} Tickets
              </span>
            </button>

            <button
              onClick={() => setActiveTab("WORKFLOW_B")}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition border ${
                activeTab === "WORKFLOW_B"
                  ? "bg-indigo-600 text-white border-indigo-400/50 shadow-lg shadow-indigo-600/25"
                  : "bg-[#0E1422] text-slate-400 hover:text-slate-200 border-slate-800"
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>Tab 2: Live Multilingual Chat (PL/EN/TR) &amp; Moderator</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30">
                {chatMessages.length} Msgs
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Active Confidence Threshold:{" "}
            <strong className="text-indigo-300 font-mono">
              {(confidenceThreshold * 100).toFixed(0)}%
            </strong>{" "}
            • Dispatched Emails:{" "}
            <strong className="text-emerald-400 font-mono">
              {dispatchedEmails.length}
            </strong>
          </div>
        </div>

        {/* Active Tab Content */}
        {activeTab === "WORKFLOW_A" ? (
          <SupportTriageTab
            tickets={tickets}
            selectedTicket={selectedTicket}
            onSelectTicket={(t) => setSelectedTicketId(t.ticket_id)}
            dispatchedEmails={dispatchedEmails}
            confidenceThreshold={confidenceThreshold}
            onUpdateThreshold={handleUpdateThreshold}
            onRunScenario={handleRunTicketScenario}
            onIngestCustomTicket={handleIngestCustomTicket}
            onReviewInline={handleReviewInline}
            onExecuteMagicLink={handleExecuteMagicLink}
            kbChunks={kbChunks}
            onRefreshKB={handleRefreshKB}
          />
        ) : (
          <MultilingualChatTab
            messages={chatMessages}
            digests={digests}
            onSendMessage={handleSendChatMessage}
            onRunChatDemo={handleRunChatDemo}
            onTriggerDigest={handleTriggerDigest}
          />
        )}
      </main>
    </div>
  );
}
