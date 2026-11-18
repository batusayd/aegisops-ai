"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  ExternalLink,
  KeyRound,
  Send,
  ShieldAlert,
  Sliders,
  Sparkles,
  ThumbsDown,
  ArrowUpRight,
} from "lucide-react";
import { TicketRecord } from "@/lib/types";
import { API_BASE_URL } from "@/lib/api";

interface HitlApprovalQueueProps {
  tickets: TicketRecord[];
  selectedTicket: TicketRecord | null;
  onSelectTicket: (ticket: TicketRecord) => void;
  confidenceThreshold: number;
  onUpdateThreshold: (newThreshold: number) => Promise<void>;
  onReviewInline: (
    ticketId: string,
    action: "APPROVE" | "REJECT" | "ESCALATE",
    editedReply?: string,
    editedSubject?: string,
    operatorNotes?: string
  ) => Promise<void>;
  onExecuteMagicLink: (token: string) => Promise<void>;
}

export default function HitlApprovalQueue({
  tickets,
  selectedTicket,
  onSelectTicket,
  confidenceThreshold,
  onUpdateThreshold,
  onReviewInline,
  onExecuteMagicLink,
}: HitlApprovalQueueProps) {
  const [editedReply, setEditedReply] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [operatorNotes, setOperatorNotes] = useState("");
  const [localThreshold, setLocalThreshold] = useState(confidenceThreshold);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLocalThreshold(confidenceThreshold);
  }, [confidenceThreshold]);

  useEffect(() => {
    if (selectedTicket?.rag_draft) {
      setEditedReply(selectedTicket.rag_draft.draft_reply);
      setEditedSubject(selectedTicket.rag_draft.suggested_subject);
      setOperatorNotes(selectedTicket.operator_notes || "");
    } else {
      setEditedReply("");
      setEditedSubject("");
      setOperatorNotes("");
    }
  }, [selectedTicket]);

  const handleThresholdCommit = async (val: number) => {
    setLocalThreshold(val);
    await onUpdateThreshold(val);
  };

  const handleAction = async (action: "APPROVE" | "REJECT" | "ESCALATE") => {
    if (!selectedTicket) return;
    setSubmitting(true);
    try {
      await onReviewInline(
        selectedTicket.ticket_id,
        action,
        editedReply,
        editedSubject,
        operatorNotes
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleMagicLinkClick = async (token: string | null) => {
    if (!token) return;
    setSubmitting(true);
    try {
      await onExecuteMagicLink(token);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column (5 cols): HITL Queue List & Dynamic Confidence Threshold Slider */}
      <div className="lg:col-span-5 bg-[#0E1422] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>HITL Approval Queue</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {tickets.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Confidence-routed support drafts with cryptographic action tokens
              </p>
            </div>
          </div>

          {/* Interactive Confidence Threshold Controller */}
          <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                Mandatory Review Confidence Threshold
              </span>
              <span className="font-mono font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30">
                {(localThreshold * 100).toFixed(0)}% ({localThreshold.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={0.95}
              step={0.05}
              value={localThreshold}
              onChange={(e) => handleThresholdCommit(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Tickets with <code className="text-slate-200">confidence &lt; {localThreshold.toFixed(2)}</code> or{" "}
              <code className="text-slate-200">urgency == HIGH</code> trigger{" "}
              <span className="text-amber-300 font-medium">⚠️ Mandatory Human Review</span>.
            </p>
          </div>

          {/* Ticket Queue Cards */}
          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {tickets.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">
                  Queue is empty. Click a Demo Scenario button above to ingest tickets.
                </p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicket?.ticket_id === t.ticket_id;
                const conf = t.rag_draft?.confidence_score ?? 0;

                return (
                  <button
                    key={t.ticket_id}
                    onClick={() => onSelectTicket(t)}
                    className={`w-full text-left p-3.5 rounded-xl border transition space-y-2 ${
                      isSelected
                        ? "bg-indigo-950/35 border-indigo-500/60 ring-1 ring-indigo-500/30"
                        : "bg-[#090D16] border-slate-800/90 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-300">
                          {t.ticket_id}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            t.state === "APPROVED_AND_SENT"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : t.state === "PENDING_APPROVAL"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : t.state === "ESCALATED"
                              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          }`}
                        >
                          {t.state}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono font-semibold ${
                          conf < localThreshold
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        Conf: {(conf * 100).toFixed(0)}%
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-white line-clamp-1">
                      {t.payload.subject}
                    </p>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {t.payload.customer_name} ({t.payload.customer_email})
                    </p>

                    {/* Mandatory Human Review Badge */}
                    {t.mandatory_human_review ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">
                          ⚠️ Mandatory Human Review ({t.mandatory_review_reasons[0]})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>High-Confidence Draft Ready for 1-Click Approval</span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Column (7 cols): Inline Response Editor & Cryptographic Magic-Link Inspector */}
      <div className="lg:col-span-7 bg-[#0E1422] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between">
        {!selectedTicket || !selectedTicket.rag_draft ? (
          <div className="my-auto text-center py-16">
            <Sparkles className="h-8 w-8 text-indigo-400 mx-auto mb-3 opacity-60" />
            <h4 className="text-sm font-semibold text-slate-200">
              No Ticket Draft Selected
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Select a ticket from the HITL Approval Queue on the left to edit its cited RAG response inline or test one-click Magic-Link approval.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header & Mandatory Review Banner */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    {selectedTicket.ticket_id}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-300 font-medium">
                    To: {selectedTicket.payload.customer_name} &lt;
                    {selectedTicket.payload.customer_email}&gt;
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedTicket.payload.subject}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {selectedTicket.rag_draft.citations.map((cit) => (
                  <span
                    key={cit}
                    className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  >
                    Cite: {cit}
                  </span>
                ))}
              </div>
            </div>

            {/* Customer Original Message Box */}
            <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Incoming Customer Ticket Message
              </div>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedTicket.payload.body}
              </p>
            </div>

            {/* Mandatory Human Review Warning Banner if triggered */}
            {selectedTicket.mandatory_human_review && (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3.5 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-amber-300">
                    ⚠️ Mandatory Human-in-the-Loop Escalation Active
                  </div>
                  <ul className="list-disc list-inside text-amber-200/90 space-y-0.5 text-[11px]">
                    {selectedTicket.mandatory_review_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-slate-300 pt-1">
                    <strong>AI Policy Note:</strong>{" "}
                    {selectedTicket.rag_draft.resolution_summary}
                  </p>
                </div>
              </div>
            )}

            {/* Inline Subject & Draft Editor */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Outbound Email Subject Line
                </label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  disabled={selectedTicket.state === "APPROVED_AND_SENT"}
                  className="w-full bg-[#090D16] border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Edit3 className="h-3.5 w-3.5" />
                    Inline Editable RAG Response Draft (Grounded in Qdrant KB)
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Confidence:{" "}
                    <strong className="text-white">
                      {(selectedTicket.rag_draft.confidence_score * 100).toFixed(1)}%
                    </strong>
                  </span>
                </div>
                <textarea
                  rows={9}
                  value={editedReply}
                  onChange={(e) => setEditedReply(e.target.value)}
                  disabled={selectedTicket.state === "APPROVED_AND_SENT"}
                  className="w-full bg-[#090D16] border border-slate-800 focus:border-indigo-500 rounded-xl p-3.5 text-xs text-slate-100 font-mono leading-relaxed outline-none resize-y"
                />
              </div>
            </div>

            {/* Cryptographic Signed Action Magic Links Box */}
            <div className="bg-[#090D16] border border-indigo-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
                  Cryptographic One-Click Action Magic Links (HMAC-SHA256 JWT)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Zero external chat dependency
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Operators can approve/reject directly from an email/webhook notification via{" "}
                <code className="text-indigo-300">/api/tickets/action?token=...</code>:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() =>
                    handleMagicLinkClick(selectedTicket.action_token_approve)
                  }
                  disabled={
                    submitting || selectedTicket.state === "APPROVED_AND_SENT"
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 transition disabled:opacity-40"
                >
                  <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
                  ⚡ Trigger 1-Click Magic-Link Approve Token
                </button>

                {selectedTicket.action_token_approve && (
                  <a
                    href={`${API_BASE_URL}/api/tickets/action?token=${encodeURIComponent(
                      selectedTicket.action_token_approve
                    )}&format=html`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
                  >
                    <span>Open Verification Badge in Browser</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Primary Operator Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => handleAction("APPROVE")}
                  disabled={
                    submitting || selectedTicket.state === "APPROVED_AND_SENT"
                  }
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  {selectedTicket.state === "APPROVED_AND_SENT"
                    ? "✓ Approved & Dispatched"
                    : "Approve & Dispatch Email"}
                </button>

                <button
                  onClick={() => handleAction("ESCALATE")}
                  disabled={
                    submitting || selectedTicket.state === "APPROVED_AND_SENT"
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition disabled:opacity-40"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Escalate to Tier-3 Specialist
                </button>

                <button
                  onClick={() => handleAction("REJECT")}
                  disabled={
                    submitting || selectedTicket.state === "APPROVED_AND_SENT"
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition disabled:opacity-40"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  Reject Draft
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
