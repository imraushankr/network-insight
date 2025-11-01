import { NetworkManager } from "../../src/services/NetworkManager";
import { NetworkInfoConfig } from "../../src/types";

// Mock os module
jest.mock("os", () => ({
  networkInterfaces: jest.fn(),
}));

const os = require("os");

describe("NetworkManager", () => {
  let networkManager: NetworkManager;
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

  const mockInterfaces = {
    eth0: [
      {
        address: "192.168.1.100",
        netmask: "255.255.255.0",
        family: "IPv4",
        mac: "00:11:22:33:44:55",
        internal: false,
        cidr: "192.168.1.100/24",
      },
      {
        address: "fe80::1",
        netmask: "ffff:ffff:ffff:ffff::",
        family: "IPv6",
        mac: "00:11:22:33:44:55",
        internal: false,
        cidr: null,
      },
    ],
    lo: [
      {
        address: "127.0.0.1",
        netmask: "255.0.0.0",
        family: "IPv4",
        mac: "00:00:00:00:00:00",
        internal: true,
        cidr: "127.0.0.1/8",
      },
    ],
    wlan0: [
      {
        address: "10.0.0.5",
        netmask: "255.255.255.0",
        family: "IPv4",
        mac: "aa:bb:cc:dd:ee:ff",
        internal: false,
        cidr: "10.0.0.5/24",
      },
    ],
  };

  beforeEach(() => {
    networkManager = new NetworkManager(mockConfig);
    os.networkInterfaces.mockReturnValue(mockInterfaces);
    jest.clearAllMocks();
  });

  describe("getInterfaces", () => {
    it("should return network interfaces", () => {
      const result = networkManager.getInterfaces();

      expect(result).toEqual(mockInterfaces);
      expect(os.networkInterfaces).toHaveBeenCalled();
    });

    it("should cache results", () => {
      networkManager.getInterfaces();
      networkManager.getInterfaces();

      expect(os.networkInterfaces).toHaveBeenCalledTimes(1);
    });

    it("should skip cache when disabled", () => {
      const noCacheConfig = {
        ...mockConfig,
        cache: { enabled: false, ttl: 300000 },
      };
      const noCacheManager = new NetworkManager(noCacheConfig);

      noCacheManager.getInterfaces();
      noCacheManager.getInterfaces();

      expect(os.networkInterfaces).toHaveBeenCalledTimes(2);
    });

    it("should handle empty interfaces", () => {
      os.networkInterfaces.mockReturnValue({});

      const result = networkManager.getInterfaces();

      expect(result).toEqual({});
    });
  });

  describe("getExternalAddresses", () => {
    it("should return only external IPv4 addresses", () => {
      const result = networkManager.getExternalAddresses();

      expect(result).toEqual(["192.168.1.100", "10.0.0.5"]);
      expect(result).not.toContain("127.0.0.1");
      expect(result).not.toContain("fe80::1");
    });

    it("should return empty array when no external addresses", () => {
      os.networkInterfaces.mockReturnValue({
        lo: mockInterfaces.lo,
      });

      const result = networkManager.getExternalAddresses();

      expect(result).toEqual([]);
    });
  });

  describe("getInterfaceByName", () => {
    it("should return interface by name", () => {
      const result = networkManager.getInterfaceByName("eth0");

      expect(result).toEqual(mockInterfaces.eth0);
    });

    it("should return null for non-existent interface", () => {
      const result = networkManager.getInterfaceByName("nonexistent");

      expect(result).toBeNull();
    });

    it("should handle undefined interface", () => {
      os.networkInterfaces.mockReturnValue({
        eth0: undefined,
      });

      const result = networkManager.getInterfaceByName("eth0");

      expect(result).toBeNull();
    });
  });

  describe("getNetworkStats", () => {
    it("should return network statistics", () => {
      const result = networkManager.getNetworkStats();

      expect(result).toEqual({
        totalInterfaces: 3,
        externalAddresses: 3,
        internalAddresses: 1,
      });
    });

    it("should handle empty interfaces in statistics", () => {
      os.networkInterfaces.mockReturnValue({});

      const result = networkManager.getNetworkStats();

      expect(result).toEqual({
        totalInterfaces: 0,
        externalAddresses: 0,
        internalAddresses: 0,
      });
    });
  });

  describe("clearCache", () => {
    it("should clear specific cache key", () => {
      networkManager.getInterfaces();
      networkManager.clearCache("network-interfaces");
      networkManager.getInterfaces();

      expect(os.networkInterfaces).toHaveBeenCalledTimes(2);
    });

    it("should clear all cache", () => {
      networkManager.getInterfaces();
      networkManager.clearCache();
      networkManager.getInterfaces();

      expect(os.networkInterfaces).toHaveBeenCalledTimes(2);
    });
  });
});
