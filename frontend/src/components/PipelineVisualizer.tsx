"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  FileText,
  MailCheck,
  ShieldAlert,
  Sparkles,
  UserCheck,
  XCircle,
} from "lucide-react";
import { TicketRecord } from "@/lib/types";

interface PipelineVisualizerProps {
  ticket: TicketRecord | null;
}

export default function PipelineVisualizer({ ticket }: PipelineVisualizerProps) {
  if (!ticket) {
    return (
      <div className="bg-[#0E1422] border border-slate-800/80 rounded-2xl p-6 text-center">
        <p className="text-sm text-slate-400">
          Select a ticket or trigger a Demo Scenario above to inspect the live Router → Qdrant RAG → HITL State Machine pipeline.
        </p>
      </div>
    );
  }

  const clsMetric = ticket.llm_metrics.find(
    (m) => m.task_type === "INTENT_CLASSIFICATION"
  );
  const draftMetric = ticket.llm_metrics.find(
    (m) => m.task_type === "RAG_RESPONSE_DRAFT"
  );

  const isApproved = ticket.state === "APPROVED_AND_SENT";
  const isRejected = ticket.state === "REJECTED";
  const isEscalated = ticket.state === "ESCALATED";
  const isPending = ticket.state === "PENDING_APPROVAL";

  const stages = [
    {
      id: "INGESTED",
      title: "1. Webhook Ingested",
      subtitle: `${ticket.payload.channel} • ${ticket.payload.customer_email}`,
      badge: ticket.ticket_id,
      done: true,
      active: ticket.state === "INGESTED",
      icon: FileText,
      color: "indigo",
    },
    {
      id: "CLASSIFIED",
      title: "2. Fast Router Triage",
      subtitle: ticket.classification
        ? `${ticket.classification.category} • ${ticket.classification.urgency}`
        : "Classifying...",
      badge: clsMetric
        ? `${clsMetric.model_used} (${clsMetric.latency_ms}ms)`
        : "gpt-4o-mini",
      done: Boolean(ticket.classification),
      active: ticket.state === "CLASSIFIED",
      icon: Cpu,
      color: "emerald",
    },
    {
      id: "RAG_SEARCH",
      title: "3. Qdrant Vector RAG",
      subtitle:
        ticket.retrieved_chunks.length > 0
          ? ticket.retrieved_chunks.map((c) => c.section_ref).join(", ")
          : "Searching policy vectors...",
      badge:
        ticket.retrieved_chunks.length > 0
          ? `Top Score: ${(ticket.retrieved_chunks[0].similarity_score * 100).toFixed(0)}%`
          : "Cosine Search",
      done: ticket.retrieved_chunks.length > 0,
      active: false,
      icon: Database,
      color: "cyan",
    },
    {
      id: "DRAFTED",
      title: "4. Reasoning Draft",
      subtitle: ticket.rag_draft
        ? `${ticket.rag_draft.citations.length} Policy Citations Included`
        : "Drafting response...",
      badge: ticket.rag_draft
        ? `Confidence: ${(ticket.rag_draft.confidence_score * 100).toFixed(0)}% (${
            draftMetric ? `${draftMetric.latency_ms}ms` : "gpt-4o"
          })`
        : "gpt-4o",
      done: Boolean(ticket.rag_draft),
      active: ticket.state === "DRAFTED",
      icon: Sparkles,
      color: "violet",
    },
    {
      id: "HITL_DECISION",
      title: "5. HITL Approval Engine",
      subtitle: isApproved
        ? `Dispatched (${ticket.dispatched_email?.approval_method})`
        : isEscalated
        ? "Escalated to Senior Specialist"
        : isRejected
        ? "Draft Rejected by Operator"
        : ticket.mandatory_human_review
        ? "⚠️ Mandatory Human Review Required"
        : "Awaiting Operator Approval / Magic Link",
      badge: ticket.state,
      done: isApproved || isEscalated || isRejected,
      active: isPending,
      icon: isApproved
        ? MailCheck
        : isRejected
        ? XCircle
        : ticket.mandatory_human_review
        ? ShieldAlert
        : UserCheck,
      color: isApproved
        ? "emerald"
        : isRejected
        ? "rose"
        : isEscalated
        ? "amber"
        : ticket.mandatory_human_review
        ? "amber"
        : "indigo",
    },
  ];

  return (
    <div className="bg-[#0E1422] border border-slate-800/90 rounded-2xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            Live State Machine Visualizer
          </span>
          <h3 className="text-sm font-semibold text-white">
            {ticket.ticket_id} — {ticket.payload.subject}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span>
            Current State:{" "}
            <strong className="text-slate-100 font-mono">{ticket.state}</strong>
          </span>
        </div>
      </div>

      {/* 5-Stage Pipeline Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {stages.map((stage) => {
          const IconComponent = stage.icon;
          const borderClass = stage.active
            ? "border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/30"
            : stage.done
            ? "border-emerald-500/35 bg-slate-900/80"
            : "border-slate-800 bg-slate-900/40 opacity-60";

          return (
            <div
              key={stage.id}
              className={`rounded-xl p-3.5 border transition flex flex-col justify-between ${borderClass}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <IconComponent
                      className={`h-4 w-4 ${
                        stage.active
                          ? "text-amber-400 animate-pulse"
                          : stage.done
                          ? "text-emerald-400"
                          : "text-slate-500"
                      }`}
                    />
                    <span className="text-xs font-semibold text-white">
                      {stage.title}
                    </span>
                  </div>
                  {stage.done && !stage.active && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                  {stage.subtitle}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/20 truncate">
                  {stage.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Retrieved Qdrant Chunks & Classification Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
        {/* Structured Intent Classification Card */}
        {ticket.classification && (
          <div className="bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Pydantic IntentClassification
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Lang: {ticket.classification.detected_language}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {ticket.classification.category}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  ticket.classification.urgency === "HIGH" ||
                  ticket.classification.urgency === "CRITICAL"
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                Urgency: {ticket.classification.urgency}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300">
                Sentiment: {ticket.classification.sentiment}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {ticket.classification.triage_reasoning}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {ticket.classification.key_entities.map((ent, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800"
                >
                  {ent}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Retrieved Qdrant Vector Chunks */}
        <div className="lg:col-span-2 bg-[#090D16] border border-slate-800/90 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
              Qdrant Vector Search Retrieved Context (Top {ticket.retrieved_chunks.length} Policy Chunks)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Collection: omnichannel_kb_v1
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {ticket.retrieved_chunks.map((chunk) => (
              <div
                key={chunk.chunk_id}
                className="bg-[#0E1422] border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/25">
                      {chunk.section_ref}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {(chunk.similarity_score * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 truncate">
                    {chunk.title}
                  </p>
                  <p className="text-[11px] text-slate-400 line-clamp-3 mt-1 leading-relaxed">
                    {chunk.snippet}
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                  Source: {chunk.source_file}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
