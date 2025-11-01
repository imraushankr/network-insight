import request from "supertest";
import express from "express";
import { NetworkRoutes } from "../../src/routes/NetworkRoutes";

// Create a proper mock for NetworkService
const mockNetworkService = {
  getClientIp: jest.fn().mockReturnValue("192.168.1.100"),
  getPublicIp: jest.fn().mockResolvedValue("203.0.113.195"),
  getLocation: jest.fn().mockResolvedValue({
    ip: "192.168.1.100",
    city: "Test City",
    country_name: "United States",
    latitude: 40.7128,
    longitude: -74.006,
  }),
  getNetworkInterfaces: jest.fn().mockReturnValue({
    eth0: [
      {
        address: "192.168.1.100",
        netmask: "255.255.255.0",
        family: "IPv4",
        mac: "00:11:22:33:44:55",
        internal: false,
        cidr: "192.168.1.100/24",
      },
    ],
  }),
  getFullNetworkInfo: jest.fn().mockResolvedValue({
    success: true,
    data: {
      publicIp: "203.0.113.195",
      location: {
        city: "Test City",
        country_name: "United States",
      },
      interfaces: { eth0: [] },
      externalAddresses: ["192.168.1.100"],
    },
  }),
  healthCheck: jest.fn().mockResolvedValue({
    success: true,
    data: {
      ipServices: true,
      geolocationServices: true,
      networkInfo: true,
    },
  }),
};

jest.mock("../../src/services/NetworkService", () => {
  return {
    NetworkService: {
      createInstance: jest.fn(() => mockNetworkService),
    },
  };
});

describe("NetworkRoutes", () => {
  let app: express.Application;
  let networkRoutes: NetworkRoutes;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    networkRoutes = new NetworkRoutes();
    app.use("/api", networkRoutes.getRouter());
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/ip", () => {
    it("should return IP information", async () => {
      const response = await request(app).get("/api/ip").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.clientIp).toBe("192.168.1.100");
      expect(response.body.data.publicIp).toBe("203.0.113.195");
      expect(response.body.timestamp).toBeDefined();
    });

    it("should handle errors in IP endpoint", async () => {
      mockNetworkService.getPublicIp.mockRejectedValueOnce(
        new Error("IP service failed")
      );

      const response = await request(app).get("/api/ip").expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("IP service failed");
    });
  });

  describe("GET /api/location", () => {
    it("should return location information", async () => {
      const response = await request(app).get("/api/location").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.city).toBe("Test City");
      expect(response.body.data.country_name).toBe("United States");
    });

    it("should handle errors in location endpoint", async () => {
      mockNetworkService.getLocation.mockRejectedValueOnce(
        new Error("Location service failed")
      );

      const response = await request(app).get("/api/location").expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Location service failed");
    });
  });

  describe("GET /api/network", () => {
    it("should return network interfaces", async () => {
      const response = await request(app).get("/api/network").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("eth0");
      expect(response.body.data.eth0[0].address).toBe("192.168.1.100");
    });

    it("should handle errors in network endpoint", async () => {
      mockNetworkService.getNetworkInterfaces.mockImplementationOnce(() => {
        throw new Error("Network info failed");
      });

      const response = await request(app).get("/api/network").expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Network info failed");
    });
  });

  describe("GET /api/public-ip", () => {
    it("should return public IP", async () => {
      const response = await request(app).get("/api/public-ip").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.publicIp).toBe("203.0.113.195");
    });

    it("should handle errors in public-ip endpoint", async () => {
      mockNetworkService.getPublicIp.mockRejectedValueOnce(
        new Error("Public IP failed")
      );

      const response = await request(app).get("/api/public-ip").expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Public IP failed");
    });
  });

  describe("GET /api/full", () => {
    it("should return full network information", async () => {
      const response = await request(app).get("/api/full").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.publicIp).toBe("203.0.113.195");
      expect(response.body.data.location.city).toBe("Test City");
    });

    it("should handle errors in full endpoint", async () => {
      mockNetworkService.getFullNetworkInfo.mockRejectedValueOnce(
        new Error("Full info failed")
      );

      const response = await request(app).get("/api/full").expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Full info failed");
    });
  });

  describe("GET /api/health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ipServices).toBe(true);
      expect(response.body.data.geolocationServices).toBe(true);
      expect(response.body.data.networkInfo).toBe(true);
    });

    it("should handle errors in health endpoint", async () => {
      mockNetworkService.healthCheck.mockRejectedValueOnce(
        new Error("Health check failed")
      );

      const response = await request(app).get("/api/health").expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Health check failed");
    });
  });

  describe("Router instance", () => {
    it("should return router instance", () => {
      const router = networkRoutes.getRouter();
      expect(router).toBeDefined();
    });
  });
});