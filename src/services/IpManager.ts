/**
 * IP Manager service
 */

import axios from "axios";
import { Request } from "express";
import { NetworkInfoConfig, IIpManager, CacheEntry } from "../types";

export class IpManager implements IIpManager {
  private config: NetworkInfoConfig;
  private cache: Map<string, CacheEntry<any>> = new Map();

  constructor(config: NetworkInfoConfig) {
    this.config = config;
  }

  /**
   * Get public IP address
   */
  public async getPublicIp(): Promise<string> {
    const cacheKey = "public-ip";
    const cached = this.getCached<string>(cacheKey);
    if (cached) return cached;

    const providers = [
      "https://api.ipify.org?format=json",
      "https://api64.ipify.org?format=json",
      "https://icanhazip.com",
    ];

    for (const provider of providers) {
      try {
        const response = await axios.get(provider, {
          timeout: this.config.api.timeout,
        });

        let ip: string;

        if (typeof response.data === "string") {
          ip = response.data.trim();
        } else if (response.data && response.data.ip) {
          ip = response.data.ip;
        } else {
          continue;
        }

        if (this.isValidIp(ip)) {
          this.setCached(cacheKey, ip);
          return ip;
        }
      } catch (error) {
        console.warn(
          `Failed to get IP from ${provider}:`,
          (error as Error).message
        );
        continue;
      }
    }

    throw new Error("All IP service providers failed");
  }

  /**
   * Get client IP from request
   */
  public getClientIp(req: Request): string {
    let ip =
      req.ip ||
      (req as any).connection?.remoteAddress ||
      (req as any).socket?.remoteAddress ||
      (req as any).connection?.socket?.remoteAddress;

    // Handle IPv6 addresses first
    if (ip === "::1") {
      return "127.0.0.1";
    }

    if (ip && ip.startsWith("::ffff:")) {
      ip = ip.replace("::ffff:", "");
    }

    if (!ip || ip === "::1") {
      const forwarded = req.headers["x-forwarded-for"];
      if (Array.isArray(forwarded)) {
        ip = forwarded[0].split(",")[0].trim();
      } else if (typeof forwarded === "string") {
        ip = forwarded.split(",")[0].trim();
      }
    }

    if (!ip || ip === "::1") {
      ip =
        (req.headers["x-real-ip"] as string) ||
        (req.headers["x-client-ip"] as string) ||
        "unknown";
    }

    return ip.split(":")[0]; // Remove port if present
  }

  /**
   * Validate IP address format
   */
  public isValidIp(ip: string): boolean {
    // Use Node.js built-in IP validation for robustness
    try {
      const { isIP } = require('net');
      const result = isIP(ip);
      return result !== 0;
    } catch (error) {
      // Fallback to manual validation if net module fails
      return this.fallbackIpValidation(ip);
    }
  }

  /**
   * Fallback IP validation when net module is not available
   */
  private fallbackIpValidation(ip: string): boolean {
    // IPv4 validation with proper octet checking
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    
    if (ipv4Regex.test(ip)) {
      const octets = ip.split('.');
      return octets.every(octet => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255 && octet === num.toString();
      });
    }
    
    // Basic IPv6 validation
    const ipv6Regex = /^[0-9a-fA-F:]+$/;
    if (ipv6Regex.test(ip) && ip.includes(':')) {
      const colonCount = (ip.match(/:/g) || []).length;
      const parts = ip.split(':');
      
      // Basic validation rules
      if (colonCount < 2 || colonCount > 7) return false;
      if ((ip.match(/::/g) || []).length > 1) return false;
      
      // Check individual parts
      for (const part of parts) {
        if (part === '') continue; // Empty part from ::
        if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return false;
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Health check for IP services
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await axios.get("https://api.ipify.org", { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
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
      ttl: ttl || this.config.cache.ttl,
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