/**
 * Network Manager service
 */

import os from "os";
import { NetworkInfoConfig, NetworkInterfaceInfo, INetworkManager, CacheEntry } from "../types";

export class NetworkManager implements INetworkManager {
  private config: NetworkInfoConfig;
  private cache: Map<string, CacheEntry<any>> = new Map();

  constructor(config: NetworkInfoConfig) {
    this.config = config;
  }

  /**
   * Get network interfaces
   */
  public getInterfaces(): { [key: string]: NetworkInterfaceInfo[] } {
    const cacheKey = "network-interfaces";
    const cached = this.getCached<{ [key: string]: NetworkInterfaceInfo[] }>(cacheKey);
    if (cached) return cached;

    const interfaces = os.networkInterfaces();
    const result: { [key: string]: NetworkInterfaceInfo[] } = {};

    Object.keys(interfaces).forEach((interfaceName) => {
      const interfaceInfo = interfaces[interfaceName];
      if (interfaceInfo) {
        result[interfaceName] = interfaceInfo.map((info) => ({
          address: info.address,
          netmask: info.netmask,
          family: info.family,
          mac: info.mac,
          internal: info.internal,
          cidr: info.cidr || null
        }));
      }
    });

    this.setCached(cacheKey, result, 60000);
    return result;
  }

  /**
   * Get external addresses
   */
  public getExternalAddresses(): string[] {
    const interfaces = this.getInterfaces();
    const addresses: string[] = [];

    Object.values(interfaces).forEach((interfaceArray) => {
      interfaceArray.forEach((interfaceInfo) => {
        if (!interfaceInfo.internal && interfaceInfo.family === "IPv4") {
          addresses.push(interfaceInfo.address);
        }
      });
    });

    return addresses;
  }

  /**
   * Get interface by name
   */
  public getInterfaceByName(name: string): NetworkInterfaceInfo[] | null {
    const interfaces = this.getInterfaces();
    return interfaces[name] || null;
  }

  /**
   * Get network statistics
   */
  public getNetworkStats(): {
    totalInterfaces: number;
    externalAddresses: number;
    internalAddresses: number;
  } {
    const interfaces = this.getInterfaces();
    let externalCount = 0;
    let internalCount = 0;

    Object.values(interfaces).forEach((interfaceArray) => {
      interfaceArray.forEach((interfaceInfo) => {
        if (interfaceInfo.internal) {
          internalCount++;
        } else {
          externalCount++;
        }
      });
    });

    return {
      totalInterfaces: Object.keys(interfaces).length,
      externalAddresses: externalCount,
      internalAddresses: internalCount
    };
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