/**
 * CryptoTrace Intelligence Platform — Multi-Hop Crawler API Routes
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 * Standard: Automated Downstream Multi-Hop Blockchain Forensics
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requirePermission } from '../security/rbac';
import { validateBody, crawlerTraceSchema } from '../security/validation';
import { multiHopCrawler } from '../services/multiHopCrawler';
import { auditService } from '../security/auditService';

export const crawlerRouter = Router();

/**
 * POST /api/v1/crawler/trace
 * Executes an automated recursive multi-hop BFS crawl downstream from seed address.
 */
crawlerRouter.post(
  '/trace',
  requireAuth,
  requirePermission('cases:read'),
  validateBody(crawlerTraceSchema),
  async (req: Request, res: Response): Promise<void> => {
      const {
        startAddress,
        blockchain,
        maxDepth,
        minVolume,
        maxBreadthPerNode,
        stopOnExchange,
        delayMs,
        crossChain,
      } = req.body;
  
      try {
        const result = await multiHopCrawler.trace({
          startAddress,
          blockchain,
          maxDepth,
          minVolume,
          maxBreadthPerNode,
          stopOnExchange,
          delayMs,
          crossChain,
        });

      // Evidentiary audit log entry
      auditService.log({
        action: 'MULTI_HOP_CRAWL_EXECUTED',
        userId: req.user?.sub,
        userName: req.user?.name,
        badgeNumber: req.user?.badgeNumber,
        details: {
          seedAddress: startAddress,
          blockchain: result.blockchain,
          maxDepthConfigured: maxDepth,
          maxDepthReached: result.maxDepthReached,
          nodesDiscovered: result.totalNodesExplored,
          edgesDiscovered: result.totalEdgesExplored,
          endpointsIdentified: result.identifiedEndpoints.map((e) => `${e.entityName} (Hop ${e.hop})`),
          executionTimeMs: result.executionTimeMs,
        },
      });

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('MultiHopCrawler execution failed:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'CRAWLER_EXECUTION_ERROR',
          message: err?.message || 'Automated multi-hop crawl execution failed.',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/crawler/vasp-directory
 * Returns known exchange/VASP entities and addresses recognized by the crawler.
 */
crawlerRouter.get(
  '/vasp-directory',
  requireAuth,
  requirePermission('cases:read'),
  async (_req: Request, res: Response): Promise<void> => {
    const entities = multiHopCrawler.getKnownEntities();
    res.json({
      success: true,
      data: entities,
      meta: { total: entities.length },
      timestamp: new Date().toISOString(),
    });
  }
);
