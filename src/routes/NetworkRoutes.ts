/**
 * Network Routes for Express
 */

import { Router, Request, Response } from "express";
import { NetworkService } from "../services/NetworkService";
import { ApiResponse } from "../types";
import { createErrorResponse } from "../utils/helpers";

export class NetworkRoutes {
  private router: Router;
  private networkService: NetworkService;

  constructor(config?: any) {
    this.router = Router();
    this.networkService = NetworkService.createInstance(config);
    this.setupRoutes();
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    this.router.get("/ip", this.getIp.bind(this));
    this.router.get("/location", this.getLocation.bind(this));
    this.router.get("/network", this.getNetwork.bind(this));
    this.router.get("/public-ip", this.getPublicIp.bind(this));
    this.router.get("/full", this.getFullInfo.bind(this));
    this.router.get("/health", this.getHealth.bind(this));
  }

  /**
   * GET /ip
   */
  private async getIp(req: Request, res: Response): Promise<void> {
    try {
      const clientIp = this.networkService.getClientIp(req);
      const publicIp = await this.networkService.getPublicIp();

      const response: ApiResponse<{ clientIp: string; publicIp: string }> = {
        success: true,
        data: { clientIp, publicIp },
        error: null,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      const response = createErrorResponse(
        error instanceof Error ? error.message : "Failed to get IP information"
      );
      res.status(500).json(response);
    }
  }

  /**
   * GET /location
   */
  private async getLocation(req: Request, res: Response): Promise<void> {
    try {
      const clientIp = this.networkService.getClientIp(req);
      const location = await this.networkService.getLocation(clientIp);

      const response: ApiResponse = {
        success: true,
        data: location,
        error: null,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      const response = createErrorResponse(
        error instanceof Error ? error.message : "Failed to get location information"
      );
      res.status(500).json(response);
    }
  }

  /**
   * GET /network
   */
  private getNetwork(_req: Request, res: Response): void {
    try {
      const interfaces = this.networkService.getNetworkInterfaces();

      const response: ApiResponse = {
        success: true,
        data: interfaces,
        error: null,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      const response = createErrorResponse(
        error instanceof Error ? error.message : "Failed to get network information"
      );
      res.status(500).json(response);
    }
  }

  /**
   * GET /public-ip
   */
  private async getPublicIp(_req: Request, res: Response): Promise<void> {
    try {
      const publicIp = await this.networkService.getPublicIp();

      const response: ApiResponse<{ publicIp: string }> = {
        success: true,
        data: { publicIp },
        error: null,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      const response = createErrorResponse(
        error instanceof Error ? error.message : "Failed to get public IP"
      );
      res.status(500).json(response);
    }
  }

  /**
   * GET /full
   */
  private async getFullInfo(_req: Request, res: Response): Promise<void> {
    try {
      const fullInfo = await this.networkService.getFullNetworkInfo();
      res.json(fullInfo);
    } catch (error) {
      const response = createErrorResponse(
        error instanceof Error ? error.message : "Failed to get full network information"
      );
      res.status(500).json(response);
    }
  }

  /**
   * GET /health
   */
  private async getHealth(_req: Request, res: Response): Promise<void> {
    try {
      const health = await this.networkService.healthCheck();
      res.json(health);
    } catch (error) {
      const response = createErrorResponse(
        error instanceof Error ? error.message : "Failed to perform health check"
      );
      res.status(500).json(response);
    }
  }

  /**
   * Get router instance
   */
  public getRouter(): Router {
    return this.router;
  }
}