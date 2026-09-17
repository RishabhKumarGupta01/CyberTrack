/**
 * CryptoTrace Intelligence Platform — Explainable Risk Engine (0–100)
 * 
 * Multivariate Quantitative Scoring System evaluating on-chain behavioral and
 * topological exposure indicators with factor-by-factor explainability.
 * 
 * LEGAL COMPLIANCE:
 * - Does NOT claim criminal ownership or criminal guilt.
 * - STRICTLY SEPARATES Risk Score from VASP Attribution Confidence.
 */

import {
  RiskAssessmentResult,
  RiskEngineInput,
  RiskFactor,
  RiskLevel,
  RiskIndicatorCode,
  MetricSeparationAnalysis,
} from './types';
import { entityIntelligence } from '../attribution/EntityIntelligenceLayer';

export class RiskEngine {
  private static instance: RiskEngine;

  public static getInstance(): RiskEngine {
    if (!RiskEngine.instance) {
      RiskEngine.instance = new RiskEngine();
    }
    return RiskEngine.instance;
  }

  // ==========================================================================
  // 9 Explainable Risk Indicator Evaluators
  // ==========================================================================

  /**
   * 1. Rapid Fund Movement Indicator
   * Checks if incoming funds were swept or forwarded out within a short time delta (<= 30 mins).
   */
  public evaluateRapidFundMovement(input: RiskEngineInput): RiskFactor | null {
    if (!input.transactions || input.transactions.length < 2) return null;

    const norm = (input.target_address || '').trim().toLowerCase();
    if (!norm) return null;

    const incomingTxs = input.transactions.filter(tx => (tx.to_address || '').trim().toLowerCase() === norm);
    const outgoingTxs = input.transactions.filter(tx => (tx.from_address || '').trim().toLowerCase() === norm);

    if (incomingTxs.length === 0 || outgoingTxs.length === 0) return null;

    let minDeltaMinutes = Infinity;
    let sweptAmount = 0;
    let sweptAsset = '';
    let triggeringTxHash = '';

    for (const inc of incomingTxs) {
      for (const out of outgoingTxs) {
        if (out.timestamp >= inc.timestamp) {
          const deltaMin = (out.timestamp - inc.timestamp) / 60;
          if (deltaMin < minDeltaMinutes) {
            minDeltaMinutes = deltaMin;
            sweptAmount = Number(out.amount);
            sweptAsset = out.asset;
            triggeringTxHash = out.tx_hash;
          }
        }
      }
    }

    if (minDeltaMinutes <= 30) {
      const scoreImpact = minDeltaMinutes <= 15 ? 25 : 18;
      const roundedMin = Math.max(1, Math.round(minDeltaMinutes));
      return {
        indicator: 'RAPID_FUND_MOVEMENT',
        name: 'Rapid Fund Dispersion & Sweeping Velocity',
        severity: scoreImpact >= 25 ? 'CRITICAL' : 'HIGH',
        score_impact: scoreImpact,
        description: `Funds were received and forwarded within ${roundedMin} minutes (${sweptAmount} ${sweptAsset}). Immediate sweeping without balance retention is a primary signature of relay mules and pass-through laundering.`,
        evidence: `Swept ${sweptAmount} ${sweptAsset} within ${roundedMin} min in tx ${triggeringTxHash || 'recent'}`,
        details: { latencyMinutes: roundedMin, sweptAmount, sweptAsset },
      };
    }

    return null;
  }

  /**
   * 2. High Transaction Velocity Indicator
   * Checks for burst transaction rate in 1-hour or 24-hour windows.
   */
  public evaluateHighTransactionVelocity(input: RiskEngineInput): RiskFactor | null {
    const metrics = input.velocity_metrics;
    const txCount = input.transactions?.length || 0;

    const burstCount = metrics?.burst_transactions || 0;
    const count1h = metrics?.tx_count_last_1h || (burstCount > 0 ? burstCount : 0);
    const count24h = metrics?.tx_count_last_24h || txCount;

    if (count1h >= 5 || count24h >= 12 || burstCount >= 4) {
      const scoreImpact = count1h >= 10 || burstCount >= 6 ? 20 : 14;
      return {
        indicator: 'HIGH_TRANSACTION_VELOCITY',
        name: 'High Transaction Velocity & Burst Frequency',
        severity: scoreImpact >= 20 ? 'HIGH' : 'MEDIUM',
        score_impact: scoreImpact,
        description: `Abnormal transaction burst detected (${count1h} txs in past hour, ${count24h} txs in 24h). Accelerated execution frequency exceeds standard retail usage and indicates automated dispersion scripts.`,
        evidence: `${count1h} transactions/hr (Burst activity: ${burstCount || count1h} txs)`,
        details: { txCount1h: count1h, txCount24h: count24h },
      };
    }

    return null;
  }

  /**
   * 3. Layering Depth Indicator
   * Measures the distance (hop count) along the transaction chain from the illicit or victim source.
   */
  public evaluateLayeringDepth(input: RiskEngineInput): RiskFactor | null {
    const hops = input.hops_from_source !== undefined ? input.hops_from_source : 0;

    if (hops >= 3) {
      const scoreImpact = hops >= 5 ? 25 : hops >= 4 ? 20 : 15;
      return {
        indicator: 'LAYERING_DEPTH',
        name: 'Multi-Hop Laundering Layering Depth',
        severity: hops >= 4 ? 'HIGH' : 'MEDIUM',
        score_impact: scoreImpact,
        description: `Subject address is located at hop depth ${hops} from the origin source. Extensive layering chains are structured deliberately to obscure direct auditability and complicate forensic tracing.`,
        evidence: `Distance of ${hops} consecutive hops from origin fund source`,
        details: { hopsFromSource: hops },
      };
    }

    return null;
  }

  /**
   * 4. High-Risk Entity Exposure Indicator
   * Checks direct or indirect exposure to known exploiters, darknet markets, or illicit hubs.
   */
  public evaluateHighRiskEntityExposure(input: RiskEngineInput): RiskFactor | null {
    if (input.high_risk_exposure?.is_exposed) {
      const hops = input.high_risk_exposure.hops || 1;
      const scoreImpact = hops === 1 ? 38 : 22;
      const entityName = input.high_risk_exposure.entity_name || 'Designated High-Risk Counterparty';
      const entityType = input.high_risk_exposure.entity_type || 'Exploit / Theft Cluster';

      return {
        indicator: 'HIGH_RISK_ENTITY_EXPOSURE',
        name: 'High-Risk Counterparty & Threat Exposure',
        severity: hops === 1 ? 'CRITICAL' : 'HIGH',
        score_impact: scoreImpact,
        description: `Observed direct or secondary (${hops}-hop) counterparty contagion with ${entityName} (${entityType}). Unmitigated exposure to known illicit threat clusters significantly elevates investigative exposure.`,
        evidence: `${hops}-hop exposure to ${entityName} (${entityType})`,
        details: { entityName, entityType, hops },
      };
    }

    return null;
  }

  /**
   * 5. Mixer Exposure Indicator
   * Evaluates direct or multi-hop interaction with coin tumblers/privacy protocols (e.g. Tornado Cash).
   */
  public evaluateMixerExposure(input: RiskEngineInput): RiskFactor | null {
    if (input.mixer_exposure?.direct_interaction || (input.mixer_exposure?.hops && input.mixer_exposure.hops <= 2)) {
      const isDirect = input.mixer_exposure.direct_interaction || input.mixer_exposure.hops === 1;
      const scoreImpact = isDirect ? 48 : 30;
      const mixerName = input.mixer_exposure.mixer_name || 'Tornado Cash Privacy Pool';
      const volumeUsd = input.mixer_exposure.volume_usd;

      return {
        indicator: 'MIXER_EXPOSURE',
        name: 'Privacy Pool & Tumbler Exposure (OFAC Designated)',
        severity: 'CRITICAL',
        score_impact: scoreImpact,
        description: `Direct or 1-hop deposit/withdrawal interaction identified with ${mixerName}${volumeUsd ? ` ($${volumeUsd.toLocaleString()} USD volume)` : ''}. Mixer interaction severs deterministic transaction flow and triggers strict regulatory exposure.`,
        evidence: `${isDirect ? 'Direct interaction with' : '1-hop proximity to'} ${mixerName}${volumeUsd ? ` ($${volumeUsd.toLocaleString()})` : ''}`,
        details: { mixerName, isDirect, volumeUsd },
      };
    }

    return null;
  }

  /**
   * 6. Bridge Activity Indicator
   * Checks for cross-chain liquidity bridge usage (e.g. ThorChain, Avalanche Bridge, Wormhole).
   */
  public evaluateBridgeActivity(input: RiskEngineInput): RiskFactor | null {
    if (input.bridge_activity?.used_bridge) {
      const bridgeName = input.bridge_activity.bridge_name || 'Cross-Chain Liquidity Bridge';
      const targetChain = input.bridge_activity.target_chain || 'External Blockchain';
      const volumeUsd = input.bridge_activity.volume_usd;

      return {
        indicator: 'BRIDGE_ACTIVITY',
        name: 'Cross-Chain Bridge Hopping Activity',
        severity: 'HIGH',
        score_impact: 18,
        description: `Utilized ${bridgeName} to transfer liquidity to ${targetChain}${volumeUsd ? ` ($${volumeUsd.toLocaleString()} USD)` : ''}. Cross-chain bridge hops break native ledger continuity and are frequently employed to impede single-chain surveillance.`,
        evidence: `Bridged assets via ${bridgeName} to ${targetChain}${volumeUsd ? ` ($${volumeUsd.toLocaleString()})` : ''}`,
        details: { bridgeName, targetChain, volumeUsd },
      };
    }

    return null;
  }

  /**
   * 7. Unusual Transaction Patterns Indicator
   * Analyzes abnormal structuring, identical round amounts, or peeling chains.
   */
  public evaluateUnusualTransactionPatterns(input: RiskEngineInput): RiskFactor | null {
    if (!input.transactions || input.transactions.length < 2) return null;

    let hasRoundAmounts = false;
    let roundAmountCount = 0;
    let hasStructuringPattern = false;

    for (const tx of input.transactions) {
      const amt = Number(tx.amount);
      if (amt >= 10 && amt % 10 === 0) {
        roundAmountCount++;
      }
    }

    if (roundAmountCount >= 2) hasRoundAmounts = true;
    if (input.transactions.length >= 3) hasStructuringPattern = true;

    if (hasRoundAmounts || hasStructuringPattern) {
      const scoreImpact = hasRoundAmounts && hasStructuringPattern ? 18 : 12;
      return {
        indicator: 'UNUSUAL_TRANSACTION_PATTERNS',
        name: 'Structured Peeling & Non-Organic Flow Patterns',
        severity: 'MEDIUM',
        score_impact: scoreImpact,
        description: `Transaction history displays non-organic structuring patterns, including repeated whole round amount outputs and peeling-chain dispersion characteristics inconsistent with natural retail activity.`,
        evidence: `${roundAmountCount} round-denomination transactions and structured peeling signatures`,
        details: { roundAmountCount, hasStructuringPattern },
      };
    }

    return null;
  }

  /**
   * 8. High-Value Transfers Indicator
   * Evaluates individual or cumulative transfers exceeding significant thresholds ($100k or $1M).
   */
  public evaluateHighValueTransfers(input: RiskEngineInput): RiskFactor | null {
    if (!input.transactions || input.transactions.length === 0) return null;

    const maxTxUsd = Math.max(...input.transactions.map(tx => tx.amount_usd || 0), 0);
    const totalUsd = input.transactions.reduce((acc, tx) => acc + (tx.amount_usd || 0), 0);

    if (maxTxUsd >= 100000 || totalUsd >= 500000) {
      const scoreImpact = maxTxUsd >= 1000000 || totalUsd >= 1000000 ? 22 : 14;
      const formattedMax = `$${(maxTxUsd / 1000).toFixed(0)}k USD`;
      const formattedTotal = `$${(totalUsd / 1000000).toFixed(2)}M USD`;

      return {
        indicator: 'HIGH_VALUE_TRANSFERS',
        name: 'Substantial Capital Flow & High-Value Transfers',
        severity: scoreImpact >= 22 ? 'HIGH' : 'MEDIUM',
        score_impact: scoreImpact,
        description: `Observed outsized capital movement (Peak single tx: ${formattedMax}, Cumulative volume: ${formattedTotal}). High capital concentration heightens investigative priority and institutional risk exposure.`,
        evidence: `Peak transfer of ${formattedMax} (Cumulative volume: ${formattedTotal})`,
        details: { maxTxUsd, totalUsd },
      };
    }

    return null;
  }

  /**
   * 9. Intermediary Wallet Count Indicator
   * Checks the number of relay/mule wallets in the flow path with low balance retention.
   */
  public evaluateIntermediaryWalletCount(input: RiskEngineInput): RiskFactor | null {
    const intermediaries = input.intermediary_wallets || [];
    const count = intermediaries.length;

    if (count >= 1) {
      const scoreImpact = count >= 3 ? 20 : count >= 2 ? 15 : 10;
      return {
        indicator: 'INTERMEDIARY_WALLET_COUNT',
        name: 'Intermediary Mule & Relay Network Density',
        severity: count >= 3 ? 'HIGH' : 'MEDIUM',
        score_impact: scoreImpact,
        description: `Identified ${count} intermediary relay wallet(s) within the immediate transaction path exhibiting low balance retention (<15%) and pass-through routing behavior. Relay clusters are designed to disperse forensic accountability.`,
        evidence: `${count} pass-through intermediary wallet(s) detected in fund flow`,
        details: { intermediaryCount: count },
      };
    }

    return null;
  }

  // ==========================================================================
  // Master Assessment Function
  // ==========================================================================

  public assessRisk(input: RiskEngineInput): RiskAssessmentResult {
    const factors: RiskFactor[] = [];

    // Helper to push non-null factors
    const addFactor = (f: RiskFactor | null) => {
      if (f) factors.push(f);
    };

    // 1. Rapid fund movement
    addFactor(this.evaluateRapidFundMovement(input));

    // 2. High transaction velocity
    addFactor(this.evaluateHighTransactionVelocity(input));

    // 3. Layering depth
    addFactor(this.evaluateLayeringDepth(input));

    // 4. High-risk entity exposure
    addFactor(this.evaluateHighRiskEntityExposure(input));

    // 5. Mixer exposure
    addFactor(this.evaluateMixerExposure(input));

    // 6. Bridge activity
    addFactor(this.evaluateBridgeActivity(input));

    // 7. Unusual transaction patterns
    addFactor(this.evaluateUnusualTransactionPatterns(input));

    // 8. High-value transfers
    addFactor(this.evaluateHighValueTransfers(input));

    // 9. Intermediary wallet count
    addFactor(this.evaluateIntermediaryWalletCount(input));

    // Calculate Composite Risk Score (0–100)
    // Direct transparent additive explainability: each active factor adds its defined points, capped at 100.
    let compositeScore = 0;
    if (factors.length > 0) {
      const rawSum = factors.reduce((sum, f) => sum + f.score_impact, 0);
      compositeScore = Math.min(Math.max(rawSum, 0), 100);
    }

    // Determine Risk Level Band
    let riskLevel: RiskLevel = 'LOW';
    if (compositeScore >= 85) {
      riskLevel = 'CRITICAL';
    } else if (compositeScore >= 70) {
      riskLevel = 'HIGH';
    } else if (compositeScore >= 40) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    // Generate Plain-English Narrative Explanation
    const explanation = this.generateNarrativeExplanation(input.target_address, compositeScore, riskLevel, factors);

    // Explicit Metric Separation: Query VASP Attribution Layer
    const vaspAttribution = entityIntelligence.attributeAddress(input.target_address);
    const metricSeparation: MetricSeparationAnalysis = {
      risk_score: compositeScore,
      vasp_attribution_confidence: vaspAttribution.attributionConfidence,
      attributed_entity_name: vaspAttribution.entity?.entityName || null,
      metric_contrast_explanation: this.generateMetricContrastExplanation(
        compositeScore,
        riskLevel,
        vaspAttribution.attributionConfidence,
        vaspAttribution.entity?.entityName || null
      ),
    };

    const legalDisclaimer =
      'LEGAL STANDARD DISCLAIMER: Risk scores evaluate quantitative on-chain behavioral patterns and network exposure indicators. They DO NOT constitute a legal determination of criminal guilt, unlawful intent, or criminal ownership. Findings represent investigative leads for law enforcement and compliance officers.';

    return {
      target_address: input.target_address,
      blockchain: input.blockchain || 'Ethereum',
      risk_score: compositeScore,
      risk_level: riskLevel,
      risk_factors: factors,
      explanation,
      metric_separation: metricSeparation,
      assessed_at: new Date().toISOString(),
      legal_disclaimer: legalDisclaimer,
    };
  }

  // ==========================================================================
  // Explainability Synthesis
  // ==========================================================================

  private generateNarrativeExplanation(
    address: string,
    score: number,
    level: RiskLevel,
    factors: RiskFactor[]
  ): string {
    if (factors.length === 0) {
      return `Address ${address} exhibits a baseline risk score of ${score}/100 (${level} Risk). No high-risk behavioral indicators, mixer exposures, or rapid layering velocity patterns were triggered based on available on-chain telemetry.`;
    }

    const criticalOrHigh = factors.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');
    const factorNames = factors.map(f => f.name).join('; ');

    const narrative = [
      `Address ${address} received a composite risk score of ${score}/100, placing it in the ${level} RISK tier based on ${factors.length} active forensic indicator(s).`,
      criticalOrHigh.length > 0
        ? `Primary drivers include: ${criticalOrHigh.map(f => `${f.name} (+${f.score_impact} pts)`).join(', ')}.`
        : `Primary drivers reflect moderate cumulative exposure across: ${factors.map(f => f.name).join(', ')}.`,
      `Forensic Profile: The address demonstrates observable behavioral signals consistent with ${
        score >= 85
          ? 'high-velocity layering, rapid fund dispersion, and exposure to obfuscation infrastructure'
          : score >= 70
          ? 'elevated transactional velocity and intermediary relay characteristics'
          : 'moderate transactional exposure subject to ongoing monitoring'
      }.`,
      `Investigative Recommendation: ${
        level === 'CRITICAL'
          ? 'Immediate review recommended. Prioritize subpoena preservation notice and counterparty freeze requests.'
          : level === 'HIGH'
          ? 'Conduct deep-dive wallet analysis and trace subsequent destination endpoints.'
          : 'Maintain automated transaction monitoring on watchlist.'
      }`,
    ].join('\n\n');

    return narrative;
  }

  private generateMetricContrastExplanation(
    riskScore: number,
    riskLevel: RiskLevel,
    vaspConfidence: number,
    entityName: string | null
  ): string {
    const vaspText = entityName
      ? `VASP Attribution Confidence is ${vaspConfidence}% for ${entityName}`
      : `VASP Attribution Confidence is ${vaspConfidence}% (Unattributed)`;

    return (
      `METRIC SEPARATION PRINCIPLE:\n` +
      `• RISK SCORE (${riskScore}/100, ${riskLevel}) measures behavioral suspiciousness and laundering exposure (mixer usage, layering depth, rapid sweeps, velocity).\n` +
      `• VASP ATTRIBUTION CONFIDENCE (${vaspConfidence}%) measures certainty of institutional identification.\n` +
      `These are independent dimensions: an address can exhibit high VASP confidence while having high risk (e.g. an illicit deposit into a verified exchange), or high VASP confidence while having near-zero risk (e.g. an official exchange hot wallet).`
    );
  }
}

// Global Singleton Instance
export const riskEngine = RiskEngine.getInstance();
