"use client";

import React, { useState } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  FileBarChart2,
  Globe,
  Layers,
  MessageSquarePlus,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  ChatMessageRecord,
  DailyDigestReport,
  SupportedLanguage,
} from "@/lib/types";

interface MultilingualChatTabProps {
  messages: ChatMessageRecord[];
  digests: DailyDigestReport[];
  onSendMessage: (payload: {
    author_name: string;
    author_handle: string;
    author_role: string;
    language: SupportedLanguage;
    content: string;
  }) => Promise<void>;
  onRunChatDemo: (
    mode: "full_conversation" | "toxic_test_only"
  ) => Promise<void>;
  onTriggerDigest: () => Promise<void>;
}

const PRESET_PERSONAS: Array<{
  name: string;
  handle: string;
  role: string;
  lang: SupportedLanguage;
  sample: string;
  flag: string;
}> = [
  {
    name: "Marek Kowalski",
    handle: "@marek_sre_waw",
    role: "DevOps Lead (Warsaw)",
    lang: "PL",
    flag: "🇵🇱",
    sample:
      "Cześć wszystkim, widzimy ten błąd 500 przy logowaniu SAML przez Okta na naszym klastrze stagingowym — czy to kwestia certyfikatu X.509 czy przesunięcia zegara NTP?",
  },
  {
    name: "Elif Demir",
    handle: "@elif_cloud_ist",
    role: "Staff Platform Eng (Istanbul)",
    lang: "TR",
    flag: "🇹🇷",
    sample:
      "Aynı sorunu dün yaşadık! Admin Console -> Security altında Clock Skew Tolerance değerini 180 saniyeye ayarlamak sorunu anında çözdü.",
  },
  {
    name: "Sarah Jenkins",
    handle: "@sjenkins_uk",
    role: "Solutions Architect (London)",
    lang: "EN",
    flag: "🇬🇧",
    sample:
      "Thanks Elif! That fixed our SSO login too. By the way, does anyone know if switching our webhook script to the `/api/v1/tickets/batch` endpoint avoids the HTTP 429 rate limit?",
  },
];

export default function MultilingualChatTab({
  messages,
  digests,
  onSendMessage,
  onRunChatDemo,
  onTriggerDigest,
}: MultilingualChatTabProps) {
  const [authorName, setAuthorName] = useState(PRESET_PERSONAS[0].name);
  const [authorHandle, setAuthorHandle] = useState(PRESET_PERSONAS[0].handle);
  const [authorRole, setAuthorRole] = useState(PRESET_PERSONAS[0].role);
  const [language, setLanguage] = useState<SupportedLanguage>("PL");
  const [content, setContent] = useState(PRESET_PERSONAS[0].sample);

  const [viewLang, setViewLang] = useState<"ALL" | SupportedLanguage>("ALL");
  const [busy, setBusy] = useState(false);
  const [generatingDigest, setGeneratingDigest] = useState(false);

  const applyPersona = (idx: number) => {
    const p = PRESET_PERSONAS[idx];
    setAuthorName(p.name);
    setAuthorHandle(p.handle);
    setAuthorRole(p.role);
    setLanguage(p.lang);
    setContent(p.sample);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    try {
      await onSendMessage({
        author_name: authorName,
        author_handle: authorHandle,
        author_role: authorRole,
        language,
        content,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRunDemo = async (
    mode: "full_conversation" | "toxic_test_only"
  ) => {
    setBusy(true);
    try {
      await onRunChatDemo(mode);
    } finally {
      setBusy(false);
    }
  };

  const handleDigest = async () => {
    setGeneratingDigest(true);
    try {
      await onTriggerDigest();
    } finally {
      setGeneratingDigest(false);
    }
  };

  const latestDigest = digests[0] || null;

  return (
    <div className="space-y-6">
      {/* Top Action & Simulator Bar */}
      <div className="bg-[#0E1422] border border-slate-800/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-cyan-400" />
            <span>
              Workflow B — Real-Time Multilingual Community Stream (PL 🇵🇱 / EN 🇬🇧 / TR 🇹🇷)
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Async Toxicity Moderation + Sliding-Window Context Translation (Last 5 Messages) + APScheduler Daily Digest
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleRunDemo("full_conversation")}
            disabled={busy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>⚡ Run 6-Msg PL/TR/EN Demo Conversation</span>
          </button>

          <button
            onClick={() => handleRunDemo("toxic_test_only")}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/35 transition disabled:opacity-50"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            <span>Simulate Toxic/Scam Outburst</span>
          </button>

          <button
            onClick={handleDigest}
            disabled={generatingDigest}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-md transition disabled:opacity-50"
          >
            <FileBarChart2 className="h-3.5 w-3.5" />
            <span>
              {generatingDigest
                ? "Synthesizing Digest..."
                : "🧠 Trigger Daily Digest (Reasoning LLM)"}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Live Multilingual Stream & Composer */}
        <div className="lg:col-span-7 space-y-4">
          {/* Interactive Message Composer */}
          <form
            onSubmit={handleSend}
            className="bg-[#0E1422] border border-slate-800/90 rounded-2xl p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <MessageSquarePlus className="h-3.5 w-3.5 text-indigo-400" />
                Simulate Live Community Message
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1">
                  Quick Personas:
                </span>
                {PRESET_PERSONAS.map((p, idx) => (
                  <button
                    type="button"
                    key={p.handle}
                    onClick={() => applyPersona(idx)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#090D16] hover:bg-slate-800 text-slate-200 border border-slate-800 transition"
                  >
                    {p.flag} {p.name.split(" ")[0]} ({p.lang})
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Author Name"
                className="bg-[#090D16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                placeholder="Role / Location"
                className="bg-[#090D16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as SupportedLanguage)
                }
                className="bg-[#090D16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-semibold"
              >
                <option value="PL">🇵🇱 Polish (PL)</option>
                <option value="TR">🇹🇷 Turkish (TR)</option>
                <option value="EN">🇬🇧 English (EN)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type message in Polish, Turkish, or English..."
                className="flex-1 bg-[#090D16] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </div>
          </form>

          {/* Stream Filter Header */}
          <div className="bg-[#0E1422] border border-slate-800/90 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Live Moderated &amp; Translated Stream (`#global-dev-support`)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-500/20 text-indigo-300">
                  {messages.length} msgs
                </span>
              </div>

              <div className="flex items-center gap-1 bg-[#090D16] p-1 rounded-lg border border-slate-800 text-[11px]">
                {(["ALL", "EN", "PL", "TR"] as const).map((langOpt) => (
                  <button
                    key={langOpt}
                    onClick={() => setViewLang(langOpt)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      viewLang === langOpt
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {langOpt === "ALL" ? "All 3 Languages" : langOpt}
                  </button>
                ))}
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">
                  No messages in stream yet. Click &ldquo;⚡ Run 6-Msg PL/TR/EN Demo Conversation&rdquo; above to watch live sliding-window translation and toxicity moderation.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {messages.map((msg) => {
                  const isBlocked =
                    msg.moderation.action_taken === "BLOCKED_QUARANTINED" ||
                    !msg.moderation.is_safe;

                  return (
                    <div
                      key={msg.message_id}
                      className={`rounded-xl p-4 border space-y-3 ${
                        isBlocked
                          ? "bg-rose-950/20 border-rose-500/50"
                          : "bg-[#090D16] border-slate-800/90"
                      }`}
                    >
                      {/* Author & Moderation Status Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Orig: {msg.original_language}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {msg.author_name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {msg.author_role}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Sliding Window Context Indicator */}
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            Window: {msg.sliding_window_context_size}/5 prior msgs
                          </span>

                          {/* Moderation Badge */}
                          {isBlocked ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                              <AlertOctagon className="h-3 w-3" />
                              QUARANTINED (Toxicity:{" "}
                              {(msg.moderation.toxicity_score * 100).toFixed(0)}%)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              SAFE ({(msg.moderation.toxicity_score * 100).toFixed(0)}%)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Original Content */}
                      <div className="text-xs text-slate-200 bg-[#0E1422] border border-slate-800/80 rounded-lg p-2.5">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                          Original [{msg.original_language}]:
                        </span>
                        {msg.original_content}
                      </div>

                      {/* Moderation Flag Warning if quarantined */}
                      {msg.moderation.flagged_reason && (
                        <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5">
                          <strong>Moderation Filter Reason:</strong>{" "}
                          {msg.moderation.flagged_reason}
                        </div>
                      )}

                      {/* Tri-Lingual Context-Aware Translations */}
                      {!isBlocked && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {(viewLang === "ALL" || viewLang === "EN") && (
                            <div className="bg-[#0E1422] border border-slate-800/80 rounded-lg p-2.5 text-xs">
                              <span className="text-[10px] font-bold text-indigo-300 block mb-1">
                                🇬🇧 English (EN)
                              </span>
                              <p className="text-slate-200 leading-relaxed text-[11px]">
                                {msg.translations.en}
                              </p>
                            </div>
                          )}
                          {(viewLang === "ALL" || viewLang === "PL") && (
                            <div className="bg-[#0E1422] border border-slate-800/80 rounded-lg p-2.5 text-xs">
                              <span className="text-[10px] font-bold text-emerald-300 block mb-1">
                                🇵🇱 Polski (PL)
                              </span>
                              <p className="text-slate-200 leading-relaxed text-[11px]">
                                {msg.translations.pl}
                              </p>
                            </div>
                          )}
                          {(viewLang === "ALL" || viewLang === "TR") && (
                            <div className="bg-[#0E1422] border border-slate-800/80 rounded-lg p-2.5 text-xs">
                              <span className="text-[10px] font-bold text-amber-300 block mb-1">
                                🇹🇷 Türkçe (TR)
                              </span>
                              <p className="text-slate-200 leading-relaxed text-[11px]">
                                {msg.translations.tr}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sliding Window Context Resolution Footnote */}
                      <div className="text-[11px] text-cyan-300/90 bg-cyan-950/25 border border-cyan-500/20 rounded-lg px-2.5 py-1.5">
                        <strong>Sliding-Window Context Note:</strong>{" "}
                        {msg.translations.context_resolution_note}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Automated Daily Digest Report Viewer */}
        <div className="lg:col-span-5 bg-[#0E1422] border border-slate-800/90 rounded-2xl p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileBarChart2 className="h-4 w-4 text-violet-400" />
                <span>Automated Daily Community Digest</span>
              </h3>
              <p className="text-xs text-slate-400">
                APScheduler Cron (`18:00 UTC`) + On-Demand Reasoning LLM Synthesis
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30">
              gpt-4o
            </span>
          </div>

          {!latestDigest ? (
            <div className="text-center py-14 border border-dashed border-slate-800 rounded-xl space-y-3">
              <FileBarChart2 className="h-8 w-8 text-violet-400 mx-auto opacity-60" />
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Click <strong>&ldquo;🧠 Trigger Daily Digest&rdquo;</strong> above to synthesize an executive report across all Polish, Turkish, and English community threads.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Digest KPI Summary Row */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase text-slate-400">
                    Analyzed
                  </div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {latestDigest.total_messages_analyzed} msgs
                  </div>
                  <div className="text-[10px] font-mono text-indigo-300">
                    EN:{latestDigest.language_breakdown.EN || 0} PL:
                    {latestDigest.language_breakdown.PL || 0} TR:
                    {latestDigest.language_breakdown.TR || 0}
                  </div>
                </div>

                <div className="bg-[#090D16] border border-emerald-500/30 rounded-xl p-3">
                  <div className="text-[10px] uppercase text-emerald-300">
                    Safe Threads
                  </div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">
                    {latestDigest.safe_messages_count}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Translated 3-way
                  </div>
                </div>

                <div className="bg-[#090D16] border border-rose-500/30 rounded-xl p-3">
                  <div className="text-[10px] uppercase text-rose-300">
                    Quarantined
                  </div>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">
                    {latestDigest.flagged_messages_count}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Blocked by guard
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="text-xs font-bold text-violet-300">
                  Executive Summary ({latestDigest.digest_id})
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {latestDigest.executive_summary}
                </p>
              </div>

              {/* Top Technical Topics */}
              <div className="bg-[#090D16] border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="text-xs font-bold text-cyan-300">
                  Top Technical Topics Discussed
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {latestDigest.top_technical_topics.map((topic, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Moderation Incidents */}
              <div className="bg-[#090D16] border border-rose-500/30 rounded-xl p-3.5 space-y-1">
                <div className="text-xs font-bold text-rose-300">
                  Safety &amp; Moderation Audit
                </div>
                <p className="text-xs text-slate-300">
                  {latestDigest.moderation_incidents_summary}
                </p>
              </div>

              {/* Recommended Engineering Actions */}
              <div className="bg-[#090D16] border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
                <div className="text-xs font-bold text-emerald-300">
                  Recommended Engineering &amp; Docs Actions
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-200">
                  {latestDigest.recommended_engineering_actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
