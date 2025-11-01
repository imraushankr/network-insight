/**
 * Main entry point for network-insight package
 */

// Export types
export * from "./types";

// Export services
export { NetworkService } from "./services/NetworkService";
export { IpManager } from "./services/IpManager";
export { LocationManager } from "./services/LocationManager";
export { NetworkManager } from "./services/NetworkManager";

// Export routes
export { NetworkRoutes } from "./routes/NetworkRoutes";

// Export utils
export * from "./utils/helpers";

// Default exports
import { NetworkService } from "./services/NetworkService";
import { NetworkRoutes } from "./routes/NetworkRoutes";

/**
 * Default singleton instance
 */
const networkService = NetworkService.getInstance();
export default networkService;

/**
 * Convenience function to create router
 */
export function createNetworkRouter(config?: any) {
  return new NetworkRoutes(config).getRouter();
}

/**
 * Convenience function to create service instance
 */
export function createNetworkService(config?: any) {
  return NetworkService.createInstance(config);
}