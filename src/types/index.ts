/**
 * Type definitions for network-insight package
 */

import { Request } from "express";

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
}

/**
 * Network interface information
 */
export interface NetworkInterfaceInfo {
  address: string;
  netmask: string;
  family: string;
  mac: string;
  internal: boolean;
  cidr: string | null;
}

/**
 * Geolocation data from IP lookup
 */
export interface GeolocationData {
  ip: string;
  city: string;
  region: string;
  region_code: string;
  country: string;
  country_name: string;
  continent_code: string;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset: string;
  country_calling_code: string;
  currency: string;
  languages: string;
  asn: string;
  org: string;
  isp: string;
}

/**
 * Package configuration interface
 */
export interface NetworkInfoConfig {
  api: {
    ipifyUrl: string;
    geolocationUrl: string;
    timeout: number;
    retries: number;
  };
  cache: {
    enabled: boolean;
    ttl: number; // Time to live in milliseconds
  };
  features: {
    rateLimiting: boolean;
    fallbackProviders: boolean;
  };
}

/**
 * Manager interface for dependency injection
 */
export interface IIpManager {
  getPublicIp(): Promise<string>;
  getClientIp(req: Request): string;
}

export interface ILocationManager {
  getLocation(ip?: string): Promise<GeolocationData>;
  getCurrentLocation(): Promise<GeolocationData>;
}

export interface INetworkManager {
  getInterfaces(): { [key: string]: NetworkInterfaceInfo[] };
  getExternalAddresses(): string[];
}

/**
 * Event types for class event emitters
 */
export interface NetworkInfoEvents {
  "ip:retrieved": { ip: string; source: string };
  "location:retrieved": { ip: string; location: GeolocationData };
  error: { context: string; error: Error };
}

/**
 * Cache entry interface
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}