import { NetworkService } from "../../src/services/NetworkService";
import { IpManager } from "../../src/services/IpManager";
import { LocationManager } from "../../src/services/LocationManager";
import { NetworkManager } from "../../src/services/NetworkManager";
import { NetworkInfoConfig } from "../../src/types";

// Mock the managers
jest.mock("../../src/services/IpManager");
jest.mock("../../src/services/LocationManager");
jest.mock("../../src/services/NetworkManager");

const MockedIpManager = IpManager as jest.MockedClass<typeof IpManager>;
const MockedLocationManager = LocationManager as jest.MockedClass<typeof LocationManager>;
const MockedNetworkManager = NetworkManager as jest.MockedClass<typeof NetworkManager>;

describe("NetworkService", () => {
  let networkService: NetworkService;
  const mockConfig: NetworkInfoConfig = {
    api: {
      ipifyUrl: "https://api.ipify.org?format=json",
      geolocationUrl: "https://ipapi.co",
      timeout: 10000,
      retries: 3,
    },
    cache: {
      enabled: true,
      ttl: 300000,
    },
    features: {
      rateLimiting: true,
      fallbackProviders: true,
    },
  };

  beforeEach(() => {
    networkService = NetworkService.createInstance(mockConfig);
    jest.clearAllMocks();
  });

  describe("getPublicIp", () => {
    it("should return public IP", async () => {
      const mockIp = "203.0.113.195";
      MockedIpManager.prototype.getPublicIp.mockResolvedValue(mockIp);

      const result = await networkService.getPublicIp();

      expect(result).toBe(mockIp);
      expect(MockedIpManager.prototype.getPublicIp).toHaveBeenCalled();
    });
  });

  describe("getClientIp", () => {
    it("should return client IP from request", () => {
      const mockReq = { ip: "192.168.1.100" };
      MockedIpManager.prototype.getClientIp.mockReturnValue("192.168.1.100");

      const result = networkService.getClientIp(mockReq);

      expect(result).toBe("192.168.1.100");
      expect(MockedIpManager.prototype.getClientIp).toHaveBeenCalledWith(mockReq);
    });
  });

  describe("getLocation", () => {
    it("should return location for IP", async () => {
      const mockLocation = {
        ip: "192.168.1.1",
        city: "Test City",
        country_name: "United States",
        latitude: 40.7128,
        longitude: -74.006,
      } as any;
      MockedLocationManager.prototype.getLocation.mockResolvedValue(mockLocation);

      const result = await networkService.getLocation("192.168.1.1");

      expect(result).toEqual(mockLocation);
      expect(MockedLocationManager.prototype.getLocation).toHaveBeenCalledWith("192.168.1.1");
    });

    it("should return location without IP", async () => {
      const mockLocation = {
        ip: "203.0.113.195",
        city: "Test City",
        country_name: "United States",
        latitude: 40.7128,
        longitude: -74.006,
      } as any;
      MockedLocationManager.prototype.getLocation.mockResolvedValue(mockLocation);

      const result = await networkService.getLocation();

      expect(result).toEqual(mockLocation);
      expect(MockedLocationManager.prototype.getLocation).toHaveBeenCalledWith(undefined);
    });
  });

  describe("getCurrentLocation", () => {
    it("should return current location", async () => {
      const mockLocation = {
        ip: "203.0.113.195",
        city: "Test City",
        country_name: "United States",
        latitude: 40.7128,
        longitude: -74.006,
      } as any;
      MockedLocationManager.prototype.getCurrentLocation.mockResolvedValue(mockLocation);

      const result = await networkService.getCurrentLocation();

      expect(result).toEqual(mockLocation);
      expect(MockedLocationManager.prototype.getCurrentLocation).toHaveBeenCalled();
    });
  });

  describe("getNetworkInterfaces", () => {
    it("should return network interfaces", () => {
      const mockInterfaces = { eth0: [] };
      MockedNetworkManager.prototype.getInterfaces.mockReturnValue(mockInterfaces);

      const result = networkService.getNetworkInterfaces();

      expect(result).toEqual(mockInterfaces);
      expect(MockedNetworkManager.prototype.getInterfaces).toHaveBeenCalled();
    });
  });

  describe("getExternalAddresses", () => {
    it("should return external addresses", () => {
      const mockAddresses = ["192.168.1.100", "10.0.0.5"];
      MockedNetworkManager.prototype.getExternalAddresses.mockReturnValue(mockAddresses);

      const result = networkService.getExternalAddresses();

      expect(result).toEqual(mockAddresses);
      expect(MockedNetworkManager.prototype.getExternalAddresses).toHaveBeenCalled();
    });
  });

  describe("getFullNetworkInfo", () => {
    it("should return comprehensive network information", async () => {
      const mockIp = "203.0.113.195";
      const mockLocation = {
        ip: "203.0.113.195",
        city: "Test City",
        country_name: "United States",
        latitude: 40.7128,
        longitude: -74.006,
      } as any;
      const mockInterfaces = { eth0: [] };
      const mockExternalAddresses = ["192.168.1.100"];

      MockedIpManager.prototype.getPublicIp.mockResolvedValue(mockIp);
      MockedLocationManager.prototype.getCurrentLocation.mockResolvedValue(mockLocation);
      MockedNetworkManager.prototype.getInterfaces.mockReturnValue(mockInterfaces);
      MockedNetworkManager.prototype.getExternalAddresses.mockReturnValue(mockExternalAddresses);

      const result = await networkService.getFullNetworkInfo();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        publicIp: mockIp,
        location: mockLocation,
        interfaces: mockInterfaces,
        externalAddresses: mockExternalAddresses,
      });
      expect(result.error).toBeNull();
    });

    it("should handle errors in getFullNetworkInfo", async () => {
      MockedIpManager.prototype.getPublicIp.mockRejectedValue(new Error("IP service down"));

      const result = await networkService.getFullNetworkInfo();

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe("IP service down");
    });
  });

  describe("healthCheck", () => {
    it("should return health status when all services are healthy", async () => {
      MockedIpManager.prototype.healthCheck.mockResolvedValue(true);
      MockedLocationManager.prototype.healthCheck.mockResolvedValue(true);

      const result = await networkService.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ipServices: true,
        geolocationServices: true,
        networkInfo: true,
      });
      expect(result.error).toBeNull();
    });

    it("should return health status when some services are unhealthy", async () => {
      MockedIpManager.prototype.healthCheck.mockResolvedValue(false);
      MockedLocationManager.prototype.healthCheck.mockResolvedValue(true);

      const result = await networkService.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ipServices: false,
        geolocationServices: true,
        networkInfo: true,
      });
    });

    it("should handle errors in healthCheck", async () => {
      MockedIpManager.prototype.healthCheck.mockRejectedValue(new Error("Health check failed"));

      const result = await networkService.healthCheck();

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe("Health check failed");
    });
  });

  describe("singleton pattern", () => {
    it("should return same instance for getInstance", () => {
      const instance1 = NetworkService.getInstance();
      const instance2 = NetworkService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should return different instances for createInstance", () => {
      const instance1 = NetworkService.createInstance();
      const instance2 = NetworkService.createInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("configuration", () => {
    it("should update configuration", () => {
      const newConfig = { cache: { enabled: false, ttl: 60000 } };
      
      networkService.updateConfig(newConfig);
      const currentConfig = networkService.getConfig();

      expect(currentConfig.cache.enabled).toBe(false);
      expect(currentConfig.cache.ttl).toBe(60000);
    });

    it("should get current configuration", () => {
      const config = networkService.getConfig();

      expect(config).toEqual(mockConfig);
    });
  });

  describe("clearCaches", () => {
    it("should clear all manager caches", () => {
      networkService.clearCaches();

      expect(MockedIpManager.prototype.clearCache).toHaveBeenCalled();
      expect(MockedLocationManager.prototype.clearCache).toHaveBeenCalled();
      expect(MockedNetworkManager.prototype.clearCache).toHaveBeenCalled();
    });
  });
});