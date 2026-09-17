import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { investigatorAI } from '../ai/InvestigatorAIAssistant';
import { AssistantChatMessage, GroundedAssistantResponse } from '../ai/types';
import { SupabaseService } from '../services/supabaseService';
import { Case } from '../types';

export const InvestigatorAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [activeCases, setActiveCases] = useState<Case[]>([]);
  const [messages, setMessages] = useState<AssistantChatMessage[]>(investigatorAI.getChatHistory());
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState('');
  const [activeAddress, setActiveAddress] = useState('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load real active cases from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    const loadCases = async () => {
      try {
        const fetched = await SupabaseService.getCases();
        if (isMounted && fetched && fetched.length > 0) {
          setActiveCases(fetched);
          setActiveCaseId(fetched[0].caseId);
          setActiveAddress(fetched[0].targetAddress || '');
        }
      } catch (err) {
        console.warn('Failed to load active cases in InvestigatorAssistant:', err);
      }
    };
    loadCases();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || isProcessing) return;

    const trimmed = queryText.trim();
    setInputValue('');
    setIsProcessing(true);

    // Optimistically update message feed
    setMessages([
      ...investigatorAI.getChatHistory(),
      {
        id: `msg-pending-${Date.now()}`,
        sender: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      await investigatorAI.ask(trimmed, {
        caseId: activeCaseId,
        address: activeAddress,
      });

      setMessages([...investigatorAI.getChatHistory()]);
    } catch (err) {
      console.error('Error querying assistant:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearChat = () => {
    investigatorAI.clearHistory();
    setMessages([...investigatorAI.getChatHistory()]);
  };

  const presetQueries = [
    { label: 'Where did the funds go?', icon: 'account_tree' },
    { label: 'What is the shortest path to a probable VASP?', icon: 'route' },
    { label: 'Why is this wallet high risk?', icon: 'shield_with_heart' },
    { label: 'What are the suspicious indicators?', icon: 'warning' },
    { label: 'Summarize this investigation.', icon: 'description' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-outline-variant pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] mb-1">
            <span className="font-sans text-outline uppercase tracking-widest">Intelligence Operations</span>
            <span className="text-outline">/</span>
            <span className="font-sans text-primary uppercase tracking-widest">Investigator AI Copilot</span>
          </div>
          <h2 className="text-[22px] font-semibold text-on-surface leading-tight tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[26px]">smart_toy</span>
            Grounded Investigator AI Assistant
          </h2>
          <p className="text-on-surface-variant mt-1 text-xs max-w-3xl">
            Strict anti-hallucination architecture. Real-time reasoning powered by Google Gemini 3.6 Flash, grounded in deterministic forensic graph engines, risk scoring algorithms, and verified entity registries.
          </p>
        </div>

        {/* Status Badge & Clear History */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container border border-primary/40 text-xs font-mono shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-on-surface font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary">auto_awesome</span>
              GEMINI 3.6 FLASH CONNECTED
            </span>
          </div>

          <button
            onClick={handleClearChat}
            className="btn-secondary px-3 py-1.5 text-xs rounded font-mono flex items-center gap-1.5"
            title="Reset conversation"
          >
            <span className="material-symbols-outlined text-[15px]">restart_alt</span>
            Reset Session
          </button>
        </div>
      </div>

      {/* Case & Target Address Context Strip */}
      <div className="surface-level-1 border border-outline-variant rounded-lg p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-outline uppercase text-[10px] tracking-wider">Active Case Context:</span>
            <select
              value={activeCaseId}
              onChange={(e) => {
                const selected = e.target.value;
                setActiveCaseId(selected);
                const matched = activeCases.find((c) => c.caseId === selected);
                if (matched) {
                  setActiveAddress(matched.targetAddress);
                }
              }}
              className="bg-surface-container border border-outline-variant text-on-surface rounded px-2.5 py-1 text-xs font-mono font-bold focus:border-primary outline-none"
            >
              {activeCases.map((c, idx) => (
                <option key={c.caseId || c.id || idx} value={c.caseId}>
                  {c.caseId} — {c.title}
                </option>
              ))}
              {activeCases.length === 0 && (
                <option value="">No Active Cases</option>
              )}
            </select>
          </div>

          <div className="w-px h-5 bg-outline-variant hidden md:block"></div>

          <div className="flex items-center gap-2">
            <span className="text-outline uppercase text-[10px] tracking-wider">Subject Target Address:</span>
            <input
              type="text"
              value={activeAddress}
              onChange={(e) => setActiveAddress(e.target.value.trim())}
              placeholder="Enter target wallet address to query..."
              className="bg-surface-container border border-outline-variant text-on-surface rounded px-2.5 py-1 text-xs font-mono focus:border-primary outline-none min-w-[280px]"
            />
          </div>
        </div>

        <div className="text-[11px] font-mono text-outline flex items-center gap-2">
          <span>AI Engine:</span>
          <span className="text-primary font-bold">Google Gemini 3.6 Flash</span>
          <span className="text-outline">• Grounding: Graph + Risk + EIL</span>
        </div>
      </div>

      {/* Preset Query Action Chips */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-sans text-outline uppercase tracking-wider px-1">
          Suggested Investigator Queries (Court-Admissible Grounded Responses):
        </div>
        <div className="flex flex-wrap gap-2">
          {presetQueries.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(item.label)}
              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-primary/20 hover:text-primary border border-outline-variant transition-all text-xs font-mono flex items-center gap-2 group shadow-sm"
              title={`Execute query: "${item.label}"`}
            >
              <span className="material-symbols-outlined text-[15px] text-primary group-hover:scale-110 transition-transform">
                {item.icon}
              </span>
              <span>"{item.label}"</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Conversation Canvas */}
      <div className="surface-level-1 border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[580px]">
        {/* Messages Stream */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[700px]">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const response = msg.response;

            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end items-start gap-3">
                  <div className="max-w-2xl bg-primary-container text-on-primary-container p-4 rounded-xl rounded-tr-none shadow-sm space-y-1">
                    <div className="flex items-center justify-between gap-4 text-[10px] font-mono opacity-80 border-b border-black/10 pb-1">
                      <span className="font-bold uppercase tracking-wider">Investigator Prompt</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs font-sans text-on-surface font-medium leading-relaxed pt-1">
                      {msg.content}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  </div>
                </div>
              );
            }

            // Assistant Response Card
            return (
              <div key={msg.id} className="flex justify-start items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center text-primary shrink-0 mt-1">
                  <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                </div>

                <div className="flex-1 max-w-4xl space-y-4">
                  {/* Main Response Box */}
                  <div className="surface-level-2 border border-outline-variant rounded-xl rounded-tl-none p-5 shadow-sm space-y-4">
                    {/* Header Strip: Intent Badge & Execution Audit */}
                    {response && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30">
                            INTENT: {response.query_type}
                          </span>
                          <span className="text-[11px] font-mono text-outline">
                            Tool: <span className="text-on-surface font-semibold">{response.tool_audit.tool_name}</span> ({response.tool_audit.execution_time_ms}ms)
                          </span>
                        </div>

                        <button
                          onClick={() => setExpandedAuditId(expandedAuditId === msg.id ? null : msg.id)}
                          className="text-[10px] font-mono text-outline hover:text-primary flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">terminal</span>
                          {expandedAuditId === msg.id ? 'Hide Raw Tool Audit' : 'Inspect Tool Audit'}
                        </button>
                      </div>
                    )}

                    {/* Collapsible Raw Tool Execution Audit */}
                    {response && expandedAuditId === msg.id && (
                      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded p-3 font-mono text-[10px] text-on-surface-variant space-y-1">
                        <div className="text-primary font-bold">TOOL EXECUTION AUDIT TRAIL:</div>
                        <div>Method: {response.tool_audit.tool_name}()</div>
                        <div>Parameters: {JSON.stringify(response.tool_audit.parameters)}</div>
                        <div>Grounded Records Processed: {response.tool_audit.grounded_records_count}</div>
                        <div className="pt-1 text-outline">Raw Payload: {response.tool_audit.raw_data_summary}</div>
                      </div>
                    )}

                    {/* Executive Explanation */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-sans text-outline uppercase tracking-wider">
                        Forensic Explanation:
                      </div>
                      <p className="text-xs text-on-surface font-sans leading-relaxed whitespace-pre-line">
                        {response ? response.summary_explanation : msg.content}
                      </p>
                    </div>

                    {/* ============================================================== */}
                    {/* 🟢 VERIFIED ON-CHAIN FACTS (Immutable Realities) */}
                    {/* ============================================================== */}
                    {response && response.verified_facts.length > 0 && (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.03] p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                            <span className="material-symbols-outlined text-[16px]">verified</span>
                            <span>VERIFIED ON-CHAIN FACTS (Immutable Ledger Proof)</span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400/80">
                            {response.verified_facts.length} Verified Evidence Records
                          </span>
                        </div>

                        <div className="divide-y divide-emerald-500/10 space-y-2 pt-1 font-mono text-xs">
                          {response.verified_facts.map((fact) => (
                            <div key={fact.id} className="pt-2 first:pt-0 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  [{fact.fact_type}]
                                </span>
                                {fact.amount && (
                                  <span className="text-emerald-300 font-semibold">
                                    {fact.amount} {fact.asset || ''}
                                    {fact.amount_usd && ` (~$${fact.amount_usd.toLocaleString()})`}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-on-surface font-sans leading-snug">
                                {fact.description}
                              </p>
                              {fact.tx_hash && (
                                <div className="text-[10px] text-outline flex items-center gap-1.5">
                                  <span>Tx:</span>
                                  <span
                                    onClick={() => navigate(`/graph/${activeCaseId}`)}
                                    className="text-primary hover:underline cursor-pointer font-bold"
                                  >
                                    {fact.tx_hash}
                                  </span>
                                  {fact.block_number && <span>| Block #{fact.block_number}</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ============================================================== */}
                    {/* 🟣 MODEL-GENERATED INTERPRETATIONS (Probabilistic Hypotheses) */}
                    {/* ============================================================== */}
                    {response && response.model_interpretations.length > 0 && (
                      <div className="rounded-lg border border-purple-500/30 bg-purple-500/[0.03] p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                            <span className="material-symbols-outlined text-[16px]">psychology</span>
                            <span>MODEL-GENERATED INTERPRETATIONS (Probabilistic Models & Inferences)</span>
                          </div>
                          <span className="text-[10px] font-mono text-purple-400/80">
                            Subject to Courtroom Legal Disclaimer
                          </span>
                        </div>

                        <div className="divide-y divide-purple-500/10 space-y-2 pt-1 font-mono text-xs">
                          {response.model_interpretations.map((interp) => (
                            <div key={interp.id} className="pt-2 first:pt-0 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-purple-300 font-bold flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                  [{interp.interpretation_type}]
                                </span>
                                {interp.confidence_score !== undefined && (
                                  <span className="text-purple-300 font-semibold">
                                    Confidence: {interp.confidence_score}%
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-on-surface font-sans leading-snug">
                                {interp.claim}
                              </p>
                              <div className="text-[10px] text-outline flex items-center gap-3">
                                <span>Heuristic: <strong className="text-on-surface-variant">{interp.basis_heuristic}</strong></span>
                                <span>•</span>
                                <span>Standard: <strong className="text-amber-400">{interp.legal_qualification}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evidence & Transaction Citations */}
                    {response && response.citations.length > 0 && (
                      <div className="pt-2 border-t border-outline-variant/40 space-y-1.5">
                        <div className="text-[10px] font-mono text-outline uppercase tracking-wider">
                          Underlying Records & Evidence Citations:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {response.citations.map((cite) => (
                            <button
                              key={cite.id}
                              onClick={() => navigate(cite.route_url)}
                              className="px-2.5 py-1 rounded bg-surface-container hover:bg-primary/20 hover:text-primary border border-outline-variant text-[11px] font-mono flex items-center gap-1.5 transition-colors group"
                              title={`Inspect ${cite.label}`}
                            >
                              <span className="material-symbols-outlined text-[13px] text-primary group-hover:scale-110 transition-transform">
                                link
                              </span>
                              <span>{cite.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Legal Notice Footer */}
                    {response && (
                      <div className="text-[10px] font-sans text-outline italic pt-1">
                        {response.legal_disclaimer}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex items-center gap-3 text-xs font-mono text-primary animate-pulse">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
              </div>
              <span>Querying Google Gemini 3.6 Flash & evaluating on-chain ledger state...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Query Input Bar */}
        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery(inputValue);
            }}
            className="flex items-center gap-3"
          >
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                auto_awesome
              </span>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask Gemini AI: analyze wallet, trace fund flow, explain AML risks, draft subpoena, or query case intelligence..."
                className="w-full bg-surface-container border border-outline-variant rounded-lg py-2.5 pl-10 pr-4 text-xs font-mono text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-outline"
              />
            </div>

            <button
              type="submit"
              disabled={!inputValue.trim() || isProcessing}
              className="btn-primary px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Submit Query</span>
              <span className="material-symbols-outlined text-[16px]">send</span>
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] font-mono text-outline mt-2 px-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live Gemini 3.6 Flash Connection Active
            </span>
            <span>Evidentiary Standard: 18 U.S.C. § 2703 Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
