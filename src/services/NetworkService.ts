/**
 * Main Network Service class
 */

import {
  NetworkInfoConfig,
  ApiResponse,
  GeolocationData,
  NetworkInterfaceInfo,
} from "../types";
import { IpManager } from "./IpManager";
import { LocationManager } from "./LocationManager";
import { NetworkManager } from "./NetworkManager";

export class NetworkService {
  private static instance: NetworkService;
  private ipManager!: IpManager;
  private locationManager!: LocationManager;
  private networkManager!: NetworkManager;
  private config: NetworkInfoConfig;

  private constructor(config?: Partial<NetworkInfoConfig>) {
    this.config = {
      api: {
        ipifyUrl: config?.api?.ipifyUrl || "https://api.ipify.org?format=json",
        geolocationUrl: config?.api?.geolocationUrl || "https://ipapi.co",
        timeout: config?.api?.timeout || 10000,
        retries: config?.api?.retries || 3,
      },
      cache: {
        enabled: config?.cache?.enabled ?? true,
        ttl: config?.cache?.ttl || 300000,
      },
      features: {
        rateLimiting: config?.features?.rateLimiting ?? true,
        fallbackProviders: config?.features?.fallbackProviders ?? true,
      },
    };

    this.initializeManagers();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(
    config?: Partial<NetworkInfoConfig>
  ): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService(config);
    }
    return NetworkService.instance;
  }

  /**
   * Create new instance
   */
  public static createInstance(
    config?: Partial<NetworkInfoConfig>
  ): NetworkService {
    return new NetworkService(config);
  }

  /**
   * Initialize managers
   */
  private initializeManagers(): void {
    this.ipManager = new IpManager(this.config);
    this.locationManager = new LocationManager(this.config);
    this.networkManager = new NetworkManager(this.config);
  }

  /**
   * Get public IP address
   */
  public async getPublicIp(): Promise<string> {
    return this.ipManager.getPublicIp();
  }

  /**
   * Get client IP from request
   */
  public getClientIp(req: any): string {
    return this.ipManager.getClientIp(req);
  }

  /**
   * Get location for IP address
   */
  public async getLocation(ip?: string): Promise<GeolocationData> {
    return this.locationManager.getLocation(ip);
  }

  /**
   * Get current location
   */
  public async getCurrentLocation(): Promise<GeolocationData> {
    return this.locationManager.getCurrentLocation();
  }

  /**
   * Get network interfaces
   */
  public getNetworkInterfaces(): { [key: string]: NetworkInterfaceInfo[] } {
    return this.networkManager.getInterfaces();
  }

  /**
   * Get external addresses
   */
  public getExternalAddresses(): string[] {
    return this.networkManager.getExternalAddresses();
  }

  /**
   * Get comprehensive network info
   */
  public async getFullNetworkInfo(): Promise<
    ApiResponse<{
      publicIp: string;
      location: GeolocationData;
      interfaces: { [key: string]: NetworkInterfaceInfo[] };
      externalAddresses: string[];
    }>
  > {
    try {
      const [publicIp, location, interfaces, externalAddresses] =
        await Promise.all([
          this.getPublicIp(),
          this.getCurrentLocation(),
          Promise.resolve(this.getNetworkInterfaces()),
          Promise.resolve(this.getExternalAddresses()),
        ]);

      return {
        success: true,
        data: { publicIp, location, interfaces, externalAddresses },
        error: null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<
    ApiResponse<{
      ipServices: boolean;
      geolocationServices: boolean;
      networkInfo: boolean;
    }>
  > {
    try {
      const [ipServices, geolocationServices] = await Promise.all([
        this.ipManager.healthCheck(),
        this.locationManager.healthCheck(),
      ]);

      return {
        success: true,
        data: {
          ipServices,
          geolocationServices,
          networkInfo: true,
        },
        error: null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Health check failed",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<NetworkInfoConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeManagers();
  }

  /**
   * Get current configuration
   */
  public getConfig(): NetworkInfoConfig {
    return { ...this.config };
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.ipManager.clearCache();
    this.locationManager.clearCache();
    this.networkManager.clearCache();
  }
}