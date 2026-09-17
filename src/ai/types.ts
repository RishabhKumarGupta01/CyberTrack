/**
 * CryptoTrace Intelligence Platform — Grounded Investigator AI Assistant Types
 * 
 * CORE ANTI-HALLUCINATION DIRECTIVE:
 * The AI must NEVER invent blockchain facts.
 * Every response must strictly cite underlying transactions, graph hops,
 * risk factors, or evidence records, with explicit visual & structural
 * separation between verified facts and model interpretations.
 */

export type InvestigatorQueryType =
  | 'FUND_FLOW'              // "Where did the funds go?"
  | 'SHORTEST_PATH_VASP'     // "What is the shortest path to a probable VASP?"
  | 'WALLET_RISK'            // "Why is this wallet high risk?"
  | 'SUSPICIOUS_INDICATORS'  // "What are the suspicious indicators?"
  | 'CASE_SUMMARY'           // "Summarize this investigation."
  | 'GENERAL';

/**
 * 🟢 Verified On-Chain Fact
 * Immutable realities extracted directly from blockchain blocks, transactions, or graph state.
 * Never hallucinated or generated from model parametric memory.
 */
export interface VerifiedOnChainFact {
  id: string;
  fact_type: 'TRANSACTION' | 'BALANCE' | 'BLOCK' | 'HOP' | 'TERMINAL_DESTINATION' | 'CONTRACT';
  description: string;
  tx_hash?: string;
  block_number?: number;
  timestamp?: string;
  amount?: string;
  asset?: string;
  amount_usd?: number;
  from_address?: string;
  to_address?: string;
  chain?: string;
}

/**
 * 🟣 Model-Generated Interpretation
 * Analytical inferences, probabilistic attributions, and risk evaluations.
 * Explicitly distinguished from immutable facts to preserve evidentiary integrity.
 */
export interface ModelInterpretation {
  id: string;
  interpretation_type:
    | 'PROBABLE_VASP_ATTRIBUTION'
    | 'BEHAVIORAL_INFERENCE'
    | 'RISK_SCORING'
    | 'INVESTIGATIVE_HYPOTHESIS';
  claim: string;
  confidence_score?: number; // 0 to 100%
  basis_heuristic: string; // e.g. "Deposit Sweep Pattern", "Co-Spending Input Tie"
  legal_qualification: string; // e.g. "Probable VASP", "Likely associated", "Behavioral risk signal"
}

/**
 * Clickable Citation linking to exact platform records
 */
export interface EvidenceCitation {
  id: string;
  citation_type: 'TRANSACTION' | 'EVIDENCE' | 'CASE' | 'ENTITY' | 'WALLET';
  identifier: string; // e.g. 0x..., EVD-2023-0842-01, INV-2023-0842
  label: string;
  route_url: string;
}

/**
 * Transparent audit trail of the backend tool invoked
 */
export interface ToolExecutionAudit {
  tool_name: string;
  parameters: Record<string, unknown>;
  execution_time_ms: number;
  grounded_records_count: number;
  raw_data_summary: string;
}

/**
 * Complete Grounded Response returned by the AI Assistant
 */
export interface GroundedAssistantResponse {
  query: string;
  query_type: InvestigatorQueryType;
  summary_explanation: string;
  verified_facts: VerifiedOnChainFact[];
  model_interpretations: ModelInterpretation[];
  citations: EvidenceCitation[];
  tool_audit: ToolExecutionAudit;
  timestamp: string;
  legal_disclaimer: string;
}

/**
 * Chat Message Wrapper for the conversational UI
 */
export interface AssistantChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  response?: GroundedAssistantResponse;
  timestamp: string;
}
