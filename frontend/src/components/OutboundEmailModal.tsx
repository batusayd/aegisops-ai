"use client";

import React from "react";
import { CheckCircle2, Lock, MailCheck, ShieldCheck, UserCheck } from "lucide-react";
import { DispatchedEmailRecord } from "@/lib/types";

interface OutboundEmailModalProps {
  dispatchedEmails: DispatchedEmailRecord[];
}

export default function OutboundEmailModal({
  dispatchedEmails,
}: OutboundEmailModalProps) {
  return (
    <div className="bg-[#0E1422] border border-slate-800/90 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <MailCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Simulated Outbound Email Dispatch Log &amp; Cryptographic Audit Trail
            </h3>
            <p className="text-xs text-slate-400">
              Final customer emails dispatched via Inline Dashboard Approval or 1-Click Signed Magic Link
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          {dispatchedEmails.length} Dispatched
        </span>
      </div>

      {dispatchedEmails.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">
            No emails dispatched yet. Approve any ticket in the HITL Queue above (or click its Magic Link token) to render the final outbound email card here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dispatchedEmails.map((email) => (
            <div
              key={email.dispatch_id}
              className="bg-[#090D16] border border-emerald-500/35 rounded-xl p-4 space-y-3 shadow-lg shadow-emerald-950/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {email.dispatch_id}
                  </span>
                  <span className="text-xs font-mono text-indigo-300">
                    ({email.ticket_id})
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      email.approval_method === "MAGIC_LINK_TOKEN"
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                        : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                    }`}
                  >
                    {email.approval_method === "MAGIC_LINK_TOKEN"
                      ? "🔑 1-Click Magic Link"
                      : "✍️ Dashboard Inline"}
                  </span>
                  {email.edited_before_send && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Edited by Operator
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>
                    To:{" "}
                    <strong className="text-slate-200">
                      {email.to_name} &lt;{email.to_email}&gt;
                    </strong>
                  </span>
                  <span className="font-mono text-[11px]">
                    From: {email.from_email}
                  </span>
                </div>
                <div className="font-semibold text-white pt-0.5">
                  Subject: {email.subject}
                </div>
              </div>

              <div className="bg-[#0E1422] border border-slate-800/90 rounded-lg p-3 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {email.final_body}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Approved by: {email.approved_by}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  <Lock className="h-3 w-3 text-indigo-400" />
                  <span>
                    SHA-256: {email.cryptographic_audit_hash.slice(0, 20)}...
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
