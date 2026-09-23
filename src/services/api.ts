/**
 * CryptoTrace Intelligence Platform — Secure API Client
 * 
 * Centralized HTTP client managing:
 * - Automatic Bearer token injection from secure memory/session storage
 * - Structured, safe error parsing (ApiError)
 * - Rate limit detection (HTTP 429)
 * - Global 401 session expiry handling
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    retryAfterSeconds?: number;
  };
  timestamp: string;
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;
  public retryAfterSeconds?: number;

  constructor(status: number, code: string, message: string, details?: unknown, retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

class ApiClient {
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  constructor() {
    // Restore session token if present
    if (typeof window !== 'undefined') {
      this.token = sessionStorage?.getItem('cryptotrace_jwt_token') || localStorage?.getItem('cryptotrace_jwt_token');
    }
  }

  public setToken(token: string | null, remember: boolean = false): void {
    this.token = token;
    if (typeof window === 'undefined') return;
    if (token) {
      sessionStorage.setItem('cryptotrace_jwt_token', token);
      if (remember) {
        localStorage.setItem('cryptotrace_jwt_token', token);
      } else {
        localStorage.removeItem('cryptotrace_jwt_token');
      }
    } else {
      sessionStorage.removeItem('cryptotrace_jwt_token');
      localStorage.removeItem('cryptotrace_jwt_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public onUnauthorized(callback: () => void): void {
    this.onUnauthorizedCallback = callback;
  }

  public async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Clean URL
    const baseUrl = typeof window === 'undefined' ? 'http://localhost:3001' : '';
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      let responseData: any;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await res.json();
      } else {
        const text = await res.text();
        responseData = { success: res.ok, data: text };
      }

      if (!res.ok) {
        // Handle 401 Unauthorized globally
        if (res.status === 401) {
          if (this.onUnauthorizedCallback) {
            this.onUnauthorizedCallback();
          }
        }

        const retryAfter = res.headers.get('retry-after');
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : responseData?.error?.retryAfterSeconds;

        throw new ApiError(
          res.status,
          responseData?.error?.code || 'REQUEST_FAILED',
          responseData?.error?.message || `Request failed with status ${res.status}`,
          responseData?.error?.details,
          retryAfterSeconds
        );
      }

      return responseData as ApiResponse<T>;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(500, 'NETWORK_ERROR', err?.message || 'Unable to communicate with forensic gateway.');
    }
  }

  // Convenience methods
  public get<T = unknown>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = unknown>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T = unknown>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = unknown>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Automated Recursive Multi-Hop BFS Blockchain Crawler
   * Traverses counterparties iteratively until an exchange sink or leaf node is reached.
   */
  public async runMultiHopTrace(params: CrawlerTraceRequest): Promise<CrawlerTraceResult> {
    const res = await this.post<CrawlerTraceResult>('/api/v1/crawler/trace', params);
    if (!res.data) {
      throw new ApiError(500, 'CRAWLER_EMPTY_DATA', 'Forensic crawler returned no trace data.');
    }
    return res.data;
  }
}

export interface CrawlerTraceRequest {
  startAddress: string;
  blockchain?: string;
  maxDepth?: number;
  minVolume?: number;
  maxBreadthPerNode?: number;
  stopOnExchange?: boolean;
  delayMs?: number;
  crossChain?: boolean;
}

export interface CrawlerNode {
  id: string;
  address: string;
  label: string;
  type: string;
  blockchain: string;
  hop: number;
  isTerminal: boolean;
  totalIncoming: number;
  totalOutgoing: number;
  entityName?: string;
  entityType?: string;
  attributionConfidence?: number;
}

export interface CrawlerEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  amountRaw: string;
  asset: string;
  txHash: string;
  timestamp: number;
  dateTime: string;
  hop: number;
  isExchangeDeposit: boolean;
}

export interface IdentifiedEndpoint {
  address: string;
  entityName: string;
  entityType: string;
  confidence: number;
  hop: number;
  totalReceivedFromTrace: number;
  sampleTxHash?: string;
}

export interface TracedPath {
  path: string[];
  pathLabels: string[];
  hops: number;
  totalVolume: number;
  asset: string;
  destinationAddress: string;
  destinationEntity?: string;
  destinationType?: string;
  isExchangeSink: boolean;
}

export interface CrawlerTraceResult {
  startAddress: string;
  blockchain: string;
  maxDepthReached: number;
  totalNodesExplored: number;
  totalEdgesExplored: number;
  totalVolumeTracked: number;
  identifiedEndpoints: IdentifiedEndpoint[];
  nodes: CrawlerNode[];
  edges: CrawlerEdge[];
  paths: TracedPath[];
  executionTimeMs: number;
  summaryText: string;
}

export const apiClient = new ApiClient();
