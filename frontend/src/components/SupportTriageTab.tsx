"use client";

import React, { useState } from "react";
import {
  BookOpen,
  CreditCard,
  GraduationCap,
  PlusCircle,
  RefreshCw,
  Search,
  ServerCrash,
  ShieldAlert,
  Sparkles,
  Send,
} from "lucide-react";
import {
  DispatchedEmailRecord,
  KBCitation,
  KBChunkInfo,
  TicketRecord,
  TicketWebhookPayload,
} from "@/lib/types";
import PipelineVisualizer from "./PipelineVisualizer";
import HitlApprovalQueue from "./HitlApprovalQueue";
import OutboundEmailModal from "./OutboundEmailModal";
import { api } from "@/lib/api";

interface SupportTriageTabProps {
  tickets: TicketRecord[];
  selectedTicket: TicketRecord | null;
  onSelectTicket: (ticket: TicketRecord) => void;
  dispatchedEmails: DispatchedEmailRecord[];
  confidenceThreshold: number;
  onUpdateThreshold: (val: number) => Promise<void>;
  onRunScenario: (
    scenario:
      | "duplicate_billing"
      | "high_value_escalation"
      | "enterprise_saml_500"
      | "academic_retroactive_refund"
      | "all"
  ) => Promise<void>;
  onIngestCustomTicket: (payload: TicketWebhookPayload) => Promise<void>;
  onReviewInline: (
    ticketId: string,
    action: "APPROVE" | "REJECT" | "ESCALATE",
    editedReply?: string,
    editedSubject?: string,
    operatorNotes?: string
  ) => Promise<void>;
  onExecuteMagicLink: (token: string) => Promise<void>;
  kbChunks: KBChunkInfo[];
  onRefreshKB: () => Promise<void>;
}

export default function SupportTriageTab({
  tickets,
  selectedTicket,
  onSelectTicket,
  dispatchedEmails,
  confidenceThreshold,
  onUpdateThreshold,
  onRunScenario,
  onIngestCustomTicket,
  onReviewInline,
  onExecuteMagicLink,
  kbChunks,
  onRefreshKB,
}: SupportTriageTabProps) {
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [showCustomWebhook, setShowCustomWebhook] = useState(false);
  const [showKBInspector, setShowKBInspector] = useState(false);

  // Custom ticket form state
  const [custName, setCustName] = useState("Aleksander Wiśniewski");
  const [custEmail, setCustEmail] = useState("a.wisniewski@pw.edu.pl");
  const [subject, setSubject] = useState(
    "Academic .edu.pl Discount & Webhook 401 HMAC Question"
  );
  const [body, setBody] = useState(
    "Hello! I am a graduate researcher at Warsaw University of Technology (pw.edu.pl). We were charged $49 for the Pro plan yesterday—can we get the 80% academic discount ($9.80/mo) and retroactive $39.20 refund?"
  );

  // Live KB search state
  const [kbQuery, setKbQuery] = useState("SAML 500 clock skew X.509 certificate");
  const [kbSearchResults, setKbSearchResults] = useState<KBCitation[]>([]);
  const [searchingKB, setSearchingKB] = useState(false);

  const triggerScenario = async (
    scenario:
      | "duplicate_billing"
      | "high_value_escalation"
      | "enterprise_saml_500"
      | "academic_retroactive_refund"
      | "all"
  ) => {
    setLoadingScenario(scenario);
    try {
      await onRunScenario(scenario);
    } finally {
      setLoadingScenario(null);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingScenario("custom");
    try {
      await onIngestCustomTicket({
        customer_name: custName,
        customer_email: custEmail,
        subject,
        body,
        channel: "WEBHOOK",
      });
      setShowCustomWebhook(false);
    } finally {
      setLoadingScenario(null);
    }
  };

  const handleSearchKB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbQuery.trim()) return;
    setSearchingKB(true);
    try {
      const res = await api.searchKB(kbQuery, 3);
      setKbSearchResults(res);
    } finally {
      setSearchingKB(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. One-Click Demo Scenario Launcher Bar */}
      <div className="bg-[#0E1422] border border-slate-800/90 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Workflow A — One-Click Support Webhook Simulator (Seeded RAG Scenarios)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Click any preset below to trigger live Fast-Tier Intent Routing → Qdrant Vector Retrieval → Reasoning Draft → HITL Queue
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCustomWebhook(!showCustomWebhook)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <PlusCircle className="h-3.5 w-3.5 text-indigo-400" />
              <span>Custom Webhook Payload</span>
            </button>
            <button
              onClick={() => setShowKBInspector(!showKBInspector)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition"
            >
              <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
              <span>Inspect Qdrant KB ({kbChunks.length} Chunks)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Scenario 1: Duplicate Billing */}
          <button
            onClick={() => triggerScenario("duplicate_billing")}
            disabled={loadingScenario !== null}
            className="text-left p-3 rounded-xl bg-[#090D16] hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500/50 transition group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-300 mb-1">
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                1. Duplicate Billing
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Conf ~96%
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium line-clamp-1">
              Charged twice ($49 x 2) + $25 Credit
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Cite: POL-REF-2026#SEC-2.1
            </p>
          </button>

          {/* Scenario 2: High-Value >$500 Escalation */}
          <button
            onClick={() => triggerScenario("high_value_escalation")}
            disabled={loadingScenario !== null}
            className="text-left p-3 rounded-xl bg-[#090D16] hover:bg-amber-950/25 border border-amber-500/30 hover:border-amber-500/60 transition group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-1">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                2. &gt;$500 Dispute (HITL!)
              </span>
              <span className="text-[10px] font-mono bg-amber-500/15 px-1.5 py-0.5 rounded">
                Conf 64% ⚠️
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium line-clamp-1">
              $1,450 SLA Refund &amp; Chargeback Threat
            </p>
            <p className="text-[10px] text-amber-400/80 font-mono mt-1">
              Triggers Mandatory Review Badge
            </p>
          </button>

          {/* Scenario 3: Enterprise SAML 500 */}
          <button
            onClick={() => triggerScenario("enterprise_saml_500")}
            disabled={loadingScenario !== null}
            className="text-left p-3 rounded-xl bg-[#090D16] hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500/50 transition group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-cyan-300 mb-1">
              <span className="flex items-center gap-1.5">
                <ServerCrash className="h-3.5 w-3.5" />
                3. Okta SAML 500 Outage
              </span>
              <span className="text-[10px] font-mono bg-rose-500/15 text-rose-300 px-1.5 py-0.5 rounded">
                HIGH Urgency
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium line-clamp-1">
              180s Clock Skew &amp; X.509 Rotation
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Cite: TECH-KB-101
            </p>
          </button>

          {/* Scenario 4: Academic .edu.tr Retroactive Refund */}
          <button
            onClick={() => triggerScenario("academic_retroactive_refund")}
            disabled={loadingScenario !== null}
            className="text-left p-3 rounded-xl bg-[#090D16] hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500/50 transition group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-violet-300 mb-1">
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                4. Student .edu.tr Refund
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded">
                Conf ~94%
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium line-clamp-1">
              80% Academic Tier + $39.20 Refund
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Cite: EDU-FAQ-04 &amp; EDU-FAQ-03
            </p>
          </button>

          {/* Scenario 5: Run All 4 Batch */}
          <button
            onClick={() => triggerScenario("all")}
            disabled={loadingScenario !== null}
            className="text-left p-3 rounded-xl bg-gradient-to-br from-indigo-600/25 via-violet-600/20 to-cyan-600/20 hover:from-indigo-600/35 hover:to-cyan-600/30 border border-indigo-500/40 transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span>⚡ Run All 4 Scenarios</span>
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            </div>
            <p className="text-[11px] text-indigo-200 mt-1">
              {loadingScenario
                ? `Executing (${loadingScenario})...`
                : "Populates entire triage & HITL queue"}
            </p>
          </button>
        </div>

        {/* Optional Custom Webhook Form Drawer */}
        {showCustomWebhook && (
          <form
            onSubmit={handleCustomSubmit}
            className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3"
          >
            <div className="md:col-span-3">
              <label className="block text-[11px] text-slate-400 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] text-slate-400 mb-1">
                Customer Email
              </label>
              <input
                type="email"
                value={custEmail}
                onChange={(e) => setCustEmail(e.target.value)}
                className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
            </div>
            <div className="md:col-span-6">
              <label className="block text-[11px] text-slate-400 mb-1">
                Ticket Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
            </div>
            <div className="md:col-span-10">
              <label className="block text-[11px] text-slate-400 mb-1">
                Ticket Body
              </label>
              <textarea
                rows={2}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={loadingScenario !== null}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Webhook</span>
              </button>
            </div>
          </form>
        )}

        {/* Optional Qdrant Vector Knowledge Base Inspector Drawer */}
        {showKBInspector && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-cyan-300">
                Qdrant Vector Knowledge Base Inspector (`seed/*.md` + PyMuPDF `fitz`)
              </span>
              <button
                onClick={onRefreshKB}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Re-Index Seed KB</span>
              </button>
            </div>

            <form onSubmit={handleSearchKB} className="flex gap-2">
              <input
                type="text"
                value={kbQuery}
                onChange={(e) => setKbQuery(e.target.value)}
                placeholder="Test semantic vector search against Qdrant (e.g., 'duplicate charge $25 credit' or 'SAML 500 clock skew')..."
                className="flex-1 bg-[#090D16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <button
                type="submit"
                disabled={searchingKB}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                <Search className="h-3.5 w-3.5" />
                <span>{searchingKB ? "Searching..." : "Vector Search"}</span>
              </button>
            </form>

            {kbSearchResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {kbSearchResults.map((hit) => (
                  <div
                    key={hit.chunk_id}
                    className="bg-[#090D16] border border-cyan-500/30 rounded-lg p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] text-cyan-300 mb-1">
                      <span>{hit.section_ref}</span>
                      <span className="text-emerald-400">
                        Score: {(hit.similarity_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="font-semibold text-white">{hit.title}</div>
                    <p className="text-[11px] text-slate-400 line-clamp-3 mt-1">
                      {hit.snippet}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Live Pipeline Visualizer */}
      <PipelineVisualizer ticket={selectedTicket} />

      {/* 3. Smart HITL Approval Queue & Inline Draft Editor */}
      <HitlApprovalQueue
        tickets={tickets}
        selectedTicket={selectedTicket}
        onSelectTicket={onSelectTicket}
        confidenceThreshold={confidenceThreshold}
        onUpdateThreshold={onUpdateThreshold}
        onReviewInline={onReviewInline}
        onExecuteMagicLink={onExecuteMagicLink}
      />

      {/* 4. Dispatched Outbound Email Preview Log */}
      <OutboundEmailModal dispatchedEmails={dispatchedEmails} />
    </div>
  );
}
