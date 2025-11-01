/**
 * Location Manager service
 */

import axios from "axios";
import { NetworkInfoConfig, GeolocationData, ILocationManager, CacheEntry } from "../types";

export class LocationManager implements ILocationManager {
  private config: NetworkInfoConfig;
  private cache: Map<string, CacheEntry<any>> = new Map();

  constructor(config: NetworkInfoConfig) {
    this.config = config;
  }

  /**
   * Get location for IP address
   */
  public async getLocation(ip?: string): Promise<GeolocationData> {
    const targetIp = ip || await this.getCurrentPublicIp();
    
    if (!this.isValidIp(targetIp)) {
      throw new Error(`Invalid IP address: ${targetIp}`);
    }

    const cacheKey = `location-${targetIp}`;
    const cached = this.getCached<GeolocationData>(cacheKey);
    if (cached) return cached;

    const providers = [
      "https://ipapi.co",
      "https://ipwho.is",
      "https://ipinfo.io"
    ];

    for (const provider of providers) {
      try {
        const url = ip ? `${provider}/${ip}/json/` : `${provider}/json/`;
        const response = await axios.get<GeolocationData>(url, {
          timeout: this.config.api.timeout
        });

        if (response.data && this.isValidLocationData(response.data)) {
          this.setCached(cacheKey, response.data);
          return response.data;
        }
      } catch (error) {
        console.warn(`Failed to get location from ${provider}:`, (error as Error).message);
        continue;
      }
    }

    throw new Error("All geolocation providers failed");
  }

  /**
   * Get current location
   */
  public async getCurrentLocation(): Promise<GeolocationData> {
    return this.getLocation();
  }

  /**
   * Health check for geolocation services
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await axios.get("https://ipapi.co/json/", { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current public IP
   */
  private async getCurrentPublicIp(): Promise<string> {
    try {
      const response = await axios.get("https://api.ipify.org?format=json", {
        timeout: this.config.api.timeout
      });
      return response.data.ip;
    } catch (error) {
      throw new Error("Failed to get public IP for location lookup");
    }
  }

  /**
   * Validate IP address
   */
  private isValidIp(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Validate location data
   */
  private isValidLocationData(data: any): data is GeolocationData {
    return (
      data &&
      typeof data.ip === "string" &&
      typeof data.country_name === "string" &&
      typeof data.latitude === "number" &&
      typeof data.longitude === "number"
    );
  }

  /**
   * Get cached value
   */
  private getCached<T>(key: string): T | null {
    if (!this.config.cache.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached value
   */
  private setCached<T>(key: string, data: T, ttl?: number): void {
    if (!this.config.cache.enabled) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cache.ttl
    });
  }

  /**
   * Clear cache
   */
  public clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}