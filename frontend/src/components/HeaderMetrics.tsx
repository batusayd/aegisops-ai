"use client";

import React, { useState } from "react";
import {
  Activity,
  Cpu,
  Database,
  DollarSign,
  Gauge,
  Layers,
  Radio,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { GlobalTelemetrySummary } from "@/lib/types";

interface HeaderMetricsProps {
  telemetry: GlobalTelemetrySummary;
  wsConnected: boolean;
  kbChunkCount: number;
  qdrantEngine: string;
  onRunFullShowcase: () => void;
  isRunningShowcase: boolean;
}

export default function HeaderMetrics({
  telemetry,
  wsConnected,
  kbChunkCount,
  qdrantEngine,
  onRunFullShowcase,
  isRunningShowcase,
}: HeaderMetricsProps) {
  const [showCallLog, setShowCallLog] = useState(false);

  // Present scaled enterprise projection alongside exact micro-call USD for crisp video legibility
  const exactSaved = telemetry.total_cost_saved_usd;
  const exactActual = telemetry.total_actual_cost_usd;
  const exactBaseline = telemetry.total_baseline_cost_usd;
  const projected10kSaved = (exactSaved * 10000).toFixed(2);

  return (
    <header className="border-b border-slate-800/80 bg-[#0A0F1D]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        {/* Top Row: Brand & System Status Pills */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/70">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">
                  AegisOps AI — Omnichannel Operations &amp; Support Hub
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Mission Control v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-Model LLM Router • Qdrant Vector RAG • Cryptographic HITL Approval Engine • Multilingual (PL/EN/TR) Moderation
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live WebSocket Status */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                wsConnected
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30"
              }`}
            >
              <Radio
                className={`h-3.5 w-3.5 ${
                  wsConnected ? "text-emerald-400 animate-pulse" : "text-amber-400"
                }`}
              />
              <span>{wsConnected ? "WebSocket Live Stream" : "REST Sync Active"}</span>
            </div>

            {/* Qdrant Vector DB Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              <Database className="h-3.5 w-3.5 text-cyan-400" />
              <span>
                Qdrant RAG: <strong>{kbChunkCount}</strong> Policy Chunks
              </span>
            </div>

            {/* One-Click Full Demo Button */}
            <button
              onClick={onRunFullShowcase}
              disabled={isRunningShowcase}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30 transition disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isRunningShowcase
                ? "Running Full AI Showcase..."
                : "⚡ Run Full System Demo Scenario"}
            </button>
          </div>
        </div>

        {/* Bottom Row: Router Cost & Latency Telemetry Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          {/* Metric 1: Model Router Distribution */}
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                <span>AI Router Tier Split</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-white">
                  {telemetry.total_calls}
                </span>
                <span className="text-xs text-slate-400">total LLM calls</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px]">
                <span className="text-emerald-400 font-medium">
                  ⚡ Fast ({telemetry.active_fast_model}): {telemetry.fast_tier_calls}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-violet-400 font-medium">
                  🧠 Reasoning ({telemetry.active_reasoning_model}): {telemetry.reasoning_tier_calls}
                </span>
              </div>
            </div>
          </div>

          {/* Metric 2: Cost Saved vs Single-Model Baseline */}
          <div className="bg-[#0F172A]/90 border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                <span>Cost Saved vs. Single-Model (gpt-4o)</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-emerald-400">
                  {telemetry.cost_savings_percentage.toFixed(1)}% Saved
                </span>
                <span className="text-xs font-mono text-slate-300">
                  (-${exactSaved.toFixed(5)} USD)
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Actual: <span className="text-slate-200 font-mono">${exactActual.toFixed(5)}</span> vs Baseline:{" "}
                <span className="line-through text-slate-500 font-mono">${exactBaseline.toFixed(5)}</span>{" "}
                <span className="text-emerald-400/90 font-medium">
                  (${projected10kSaved} / 10k runs)
                </span>
              </div>
            </div>
          </div>

          {/* Metric 3: Latency Saved vs Single-Model */}
          <div className="bg-[#0F172A]/90 border border-cyan-500/30 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-300">
                <Gauge className="h-3.5 w-3.5 text-cyan-400" />
                <span>Latency Saved vs. Single-Model</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-cyan-400">
                  {(telemetry.total_latency_saved_ms / 1000).toFixed(2)}s
                </span>
                <span className="text-xs text-slate-400">
                  total saved ({Math.round(telemetry.total_latency_saved_ms)} ms)
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Router Avg: <span className="text-cyan-300 font-mono">{telemetry.avg_latency_ms} ms</span> vs Single-Model:{" "}
                <span className="text-slate-500 font-mono">{telemetry.avg_baseline_latency_ms} ms</span>
              </div>
            </div>
          </div>

          {/* Metric 4: Token Throughput & Live Call Log Toggle */}
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Activity className="h-3.5 w-3.5 text-violet-400" />
                <span>Token Throughput &amp; Audit</span>
              </div>
              <button
                onClick={() => setShowCallLog(!showCallLog)}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition"
              >
                <span>{showCallLog ? "Hide Call Log" : "Inspect Calls"}</span>
                {showCallLog ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-white font-mono">
                {(telemetry.total_input_tokens + telemetry.total_output_tokens).toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">tokens processed</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              In: <span className="text-slate-300 font-mono">{telemetry.total_input_tokens.toLocaleString()}</span> • Out:{" "}
              <span className="text-slate-300 font-mono">{telemetry.total_output_tokens.toLocaleString()}</span> • Engine:{" "}
              <span className="text-indigo-300">{qdrantEngine.split(" ")[0]}</span>
            </div>
          </div>
        </div>

        {/* Collapsible Live Router Call Telemetry Drawer */}
        {showCallLog && (
          <div className="mt-3 bg-[#090D16] border border-slate-800 rounded-xl p-3.5 max-h-56 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Live Multi-Model Router Call Ledger (Newest First)
              </span>
              <span className="text-[11px] text-slate-500">
                Baseline comparison model: <code className="text-slate-300">gpt-4o</code>
              </span>
            </div>
            {telemetry.recent_calls.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                No LLM calls recorded yet. Click any Demo Scenario button to watch the router in action.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-1.5 pr-3">Call ID</th>
                      <th className="py-1.5 pr-3">Task Type</th>
                      <th className="py-1.5 pr-3">Router Tier</th>
                      <th className="py-1.5 pr-3">Model</th>
                      <th className="py-1.5 pr-3">Tokens (In/Out)</th>
                      <th className="py-1.5 pr-3">Latency (Saved)</th>
                      <th className="py-1.5">Actual Cost (Saved)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {telemetry.recent_calls.map((c) => (
                      <tr key={c.call_id} className="hover:bg-slate-900/50">
                        <td className="py-1.5 pr-3 text-slate-400">{c.call_id}</td>
                        <td className="py-1.5 pr-3 font-sans font-medium text-slate-200">
                          {c.task_type}
                        </td>
                        <td className="py-1.5 pr-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              c.tier === "FAST_ROUTER"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "bg-violet-500/15 text-violet-300 border border-violet-500/30"
                            }`}
                          >
                            {c.tier}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 text-indigo-300">{c.model_used}</td>
                        <td className="py-1.5 pr-3 text-slate-300">
                          {c.input_tokens} / {c.output_tokens}
                        </td>
                        <td className="py-1.5 pr-3 text-cyan-300">
                          {c.latency_ms}ms{" "}
                          {c.latency_saved_ms > 0 && (
                            <span className="text-emerald-400">
                              (-{c.latency_saved_ms}ms)
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-emerald-300">
                          ${c.actual_cost_usd.toFixed(6)}{" "}
                          {c.cost_saved_usd > 0 && (
                            <span className="text-emerald-400">
                              (saved ${c.cost_saved_usd.toFixed(6)})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
