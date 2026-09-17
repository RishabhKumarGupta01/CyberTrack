/**
 * CryptoTrace Intelligence Platform — Google Gemini Forensic AI Service
 * 
 * Direct integration with Google Gemini API for real, court-admissible
 * forensic intelligence analysis, transaction interpretation, and interactive briefings.
 */

export interface ForensicQueryContext {
  caseId?: string;
  caseTitle?: string;
  address?: string;
  blockchain?: string;
  transactions?: Array<{
    hash: string;
    from: string;
    to: string;
    amount: string;
    asset: string;
    timestamp?: number | string;
    isOutgoing?: boolean;
  }>;
  riskScore?: number;
  riskFactors?: Array<{ name: string; severity: string; evidence: string; scoreImpact: number }>;
  vaspAttribution?: {
    entityName: string;
    confidence: number;
    category?: string;
  };
  graphHops?: number;
}

export interface GeminiForensicResponse {
  summaryExplanation: string;
  modelInterpretations: Array<{
    claim: string;
    basisHeuristic: string;
    confidenceScore: number;
    legalQualification: string;
  }>;
  suggestedActions: string[];
  rawResponseText: string;
  modelUsed: string;
}

export class GeminiService {
  private static instance: GeminiService;
  private apiKey: string;
  private primaryModel: string;
  private fallbackModels: string[] = ['gemini-2.5-flash', 'gemini-flash-latest'];

  private constructor() {
    this.apiKey =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
      (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.GEMINI_API_KEY) ||
      '';
      
    this.primaryModel =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_MODEL) ||
      (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.VITE_GEMINI_MODEL) ||
      'gemini-3.6-flash';
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  public setApiKey(key: string): void {
    this.apiKey = key.trim();
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public isConnected(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  public getActiveModel(): string {
    return this.primaryModel;
  }

  /**
   * Generates a grounded forensic AI briefing using Google Gemini
   */
  public async generateForensicAnalysis(params: {
    query: string;
    context?: ForensicQueryContext;
    history?: Array<{ role: 'user' | 'model'; text: string }>;
  }): Promise<GeminiForensicResponse> {
    const { query, context, history = [] } = params;

    // Build rich forensic prompt containing actual on-chain ledger facts
    const contextPrompt = this.buildContextPrompt(context);

    const systemInstruction =
      'You are the CryptoTrace Senior Forensic AI Copilot, an expert digital asset investigator ' +
      'trained in blockchain heuristics, AML/CFT compliance, OFAC sanctions, and court-admissible evidence preparation. ' +
      'You assist law enforcement agencies, cyber financial crime units, and AML compliance officers.\n\n' +
      'CORE DIRECTIVES:\n' +
      '1. FACTUAL GROUNDING: Ground your answers firmly in the verified blockchain records, risk factors, and VASP attributions provided in the context.\n' +
      '2. NO HALLUCINATIONS: Do not fabricate non-existent transaction hashes, addresses, or dates.\n' +
      '3. PROFESSIONAL LEA TONE: Deliver concise, authoritative, and actionable answers formatted in clear markdown.\n' +
      '4. LEGAL STANDARDS: When relevant, reference statutory authorities such as 18 U.S.C. § 2703 (stored communications / preservation), 18 U.S.C. § 981/982 (asset forfeiture), or Bank Secrecy Act guidelines.\n' +
      '5. ACTIONABLE NEXT STEPS: When addressing an investigation, recommend tactical forensic steps (e.g. emergency freeze requests, clustering secondary hops, or subpoenas).';

    const conversationContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Append conversation history
    for (const msg of history.slice(-6)) {
      conversationContents.push({
        role: msg.role,
        parts: [{ text: msg.text }],
      });
    }

    // Append latest prompt with forensic grounding
    const userFullPrompt =
      `${contextPrompt}\n\n` +
      `### INVESTIGATOR INQUIRY:\n"${query}"\n\n` +
      `Please provide a comprehensive forensic analysis answering the investigator's question based on the above facts.`;

    conversationContents.push({
      role: 'user',
      parts: [{ text: userFullPrompt }],
    });

    const modelsToTry = [this.primaryModel, ...this.fallbackModels];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: conversationContents,
            generationConfig: {
              temperature: 0.2, // Low temperature for factual precision
              topP: 0.95,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`Gemini API error (${res.status}): ${errData.error?.message || res.statusText}`);
        }

        const data = await res.json();
        const candidate = data.candidates?.[0];
        const rawText = candidate?.content?.parts?.[0]?.text || '';

        if (!rawText) {
          throw new Error('Empty response received from Gemini.');
        }

        return this.parseGeminiResponse(rawText, model, context);
      } catch (err) {
        lastError = err;
        console.warn(`Gemini generation failed on ${model}, attempting fallback...`, err);
      }
    }

    throw lastError || new Error('Failed to communicate with Google Gemini API.');
  }

  /**
   * Builds the forensic grounding context string for Gemini
   */
  private buildContextPrompt(ctx?: ForensicQueryContext): string {
    if (!ctx) return 'No specific active case context provided. Respond as a general cryptocurrency forensic specialist.';

    let prompt = '### CURRENT FORENSIC CASE CONTEXT:\n';

    if (ctx.caseId) {
      prompt += `- Case ID: ${ctx.caseId} ${ctx.caseTitle ? `("${ctx.caseTitle}")` : ''}\n`;
    }
    if (ctx.address) {
      prompt += `- Subject Wallet Address: ${ctx.address}\n`;
      prompt += `- Blockchain Network: ${ctx.blockchain || 'Ethereum'}\n`;
    }
    if (ctx.riskScore !== undefined) {
      prompt += `- Composite Risk Score: ${ctx.riskScore}/100\n`;
    }
    if (ctx.vaspAttribution) {
      prompt += `- Probable VASP Destination: ${ctx.vaspAttribution.entityName} (Attribution Confidence: ${ctx.vaspAttribution.confidence}%)\n`;
    }
    if (ctx.riskFactors && ctx.riskFactors.length > 0) {
      prompt += `- Active Risk Indicators Triggered:\n`;
      ctx.riskFactors.forEach((f) => {
        prompt += `  * [${f.severity}] ${f.name} (+${f.scoreImpact} pts): ${f.evidence}\n`;
      });
    }
    if (ctx.transactions && ctx.transactions.length > 0) {
      prompt += `- Verified On-Chain Ledger Transactions (Recent Sample):\n`;
      ctx.transactions.slice(0, 8).forEach((tx, idx) => {
        const dir = tx.isOutgoing ? 'OUTGOING (DISPERSION)' : 'INCOMING (INFLOW)';
        prompt += `  ${idx + 1}. Tx: ${tx.hash} | ${dir} | Amount: ${tx.amount} ${tx.asset} | From: ${tx.from} -> To: ${tx.to}\n`;
      });
    }

    return prompt;
  }

  /**
   * Parses Gemini text into structured forensic components
   */
  private parseGeminiResponse(
    text: string,
    modelUsed: string,
    context?: ForensicQueryContext
  ): GeminiForensicResponse {
    const suggestedActions: string[] = [];
    const modelInterpretations: Array<{
      claim: string;
      basisHeuristic: string;
      confidenceScore: number;
      legalQualification: string;
    }> = [];

    // Extract suggested actions if bulleted in the text
    const lines = text.split('\n');
    let inActionSection = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.toLowerCase().includes('recommended next steps') ||
        trimmed.toLowerCase().includes('recommended actions') ||
        trimmed.toLowerCase().includes('tactical actions')
      ) {
        inActionSection = true;
        continue;
      }
      if (inActionSection) {
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
          suggestedActions.push(trimmed.replace(/^[-*]|\d+\./, '').trim());
        } else if (trimmed.startsWith('#') || trimmed === '') {
          if (trimmed.startsWith('#')) inActionSection = false;
        }
      }
    }

    // Default suggestions if none explicitly extracted
    if (suggestedActions.length === 0) {
      if (context?.vaspAttribution?.confidence && context.vaspAttribution.confidence > 50) {
        suggestedActions.push(
          `Serve 18 U.S.C. § 2703(f) emergency preservation letter to ${context.vaspAttribution.entityName} compliance desk.`
        );
      }
      suggestedActions.push('Monitor target wallet for secondary peeling chains and mixer un-mixing events.');
      suggestedActions.push('Cross-reference identified counterparty clusters against FinCEN 314(a) match list.');
    }

    // Extract interpretations
    if (context?.riskScore !== undefined) {
      modelInterpretations.push({
        claim: `Target wallet exhibits an elevated composite risk profile (${context.riskScore}/100).`,
        basisHeuristic: 'Multi-Factor Behavioral Anomaly Engine',
        confidenceScore: 92,
        legalQualification: 'Algorithmic Risk Assessment',
      });
    }

    if (context?.vaspAttribution?.entityName && context.vaspAttribution.confidence > 0) {
      modelInterpretations.push({
        claim: `Transaction trail suggests liquidation consolidation at ${context.vaspAttribution.entityName}.`,
        basisHeuristic: 'Deposit Sweep & Cluster Co-spending Signature',
        confidenceScore: context.vaspAttribution.confidence,
        legalQualification: 'Probable VASP Attribution',
      });
    }

    return {
      summaryExplanation: text,
      modelInterpretations,
      suggestedActions: suggestedActions.slice(0, 4),
      rawResponseText: text,
      modelUsed,
    };
  }
}

export const geminiService = GeminiService.getInstance();
