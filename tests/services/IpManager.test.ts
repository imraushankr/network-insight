import { IpManager } from '../../src/services/IpManager';
import axios from 'axios';
import { NetworkInfoConfig } from '../../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the net module
jest.mock('net', () => ({
  isIP: jest.fn()
}));

const net = require('net');

describe('IpManager', () => {
  let ipManager: IpManager;
  const mockConfig: NetworkInfoConfig = {
    api: {
      ipifyUrl: 'https://api.ipify.org?format=json',
      geolocationUrl: 'https://ipapi.co',
      timeout: 10000,
      retries: 3
    },
    cache: {
      enabled: true,
      ttl: 300000
    },
    features: {
      rateLimiting: true,
      fallbackProviders: true
    }
  };

  beforeEach(() => {
    ipManager = new IpManager(mockConfig);
    jest.clearAllMocks();
    
    // Mock net.isIP to use fallback validation by default
    net.isIP.mockImplementation(() => {
      throw new Error('net module not available');
    });
  });

  describe('getPublicIp', () => {
    it('should return public IP from first provider', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { ip: '192.168.1.1' }
      });

      const result = await ipManager.getPublicIp();

      expect(result).toBe('192.168.1.1');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.ipify.org?format=json',
        { timeout: 10000 }
      );
    });

    it('should return public IP from string response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: '192.168.1.2'
      });

      const result = await ipManager.getPublicIp();

      expect(result).toBe('192.168.1.2');
    });

    it('should use fallback providers when first fails', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('First provider failed'))
        .mockResolvedValueOnce({
          data: { ip: '192.168.1.2' }
        });

      const result = await ipManager.getPublicIp();

      expect(result).toBe('192.168.1.2');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should throw error when all providers fail', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Provider failed'));

      await expect(ipManager.getPublicIp()).rejects.toThrow('All IP service providers failed');
    });

    it('should return cached IP when available', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { ip: '192.168.1.1' }
      });

      await ipManager.getPublicIp();
      const result = await ipManager.getPublicIp();

      expect(result).toBe('192.168.1.1');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should skip cache when disabled', async () => {
      const noCacheConfig = {
        ...mockConfig,
        cache: { enabled: false, ttl: 300000 }
      };
      const noCacheManager = new IpManager(noCacheConfig);

      mockedAxios.get.mockResolvedValue({ data: { ip: '192.168.1.1' } });

      await noCacheManager.getPublicIp();
      await noCacheManager.getPublicIp();

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getClientIp', () => {
    it('should extract client IP from request.ip', () => {
      const mockReq = {
        ip: '192.168.1.100',
        headers: {}
      };

      const result = ipManager.getClientIp(mockReq as any);

      expect(result).toBe('192.168.1.100');
    });

    it('should handle x-forwarded-for header with array', () => {
      const mockReq = {
        ip: undefined,
        headers: {
          'x-forwarded-for': ['203.0.113.195, 70.41.3.18']
        }
      };

      const result = ipManager.getClientIp(mockReq as any);

      expect(result).toBe('203.0.113.195');
    });

    it('should handle x-forwarded-for header with string', () => {
      const mockReq = {
        ip: undefined,
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18'
        }
      };

      const result = ipManager.getClientIp(mockReq as any);

      expect(result).toBe('203.0.113.195');
    });

    it('should handle x-real-ip header', () => {
      const mockReq = {
        ip: undefined,
        headers: {
          'x-real-ip': '192.168.1.200'
        }
      };

      const result = ipManager.getClientIp(mockReq as any);

      expect(result).toBe('192.168.1.200');
    });

    it('should handle x-client-ip header', () => {
      const mockReq = {
        ip: undefined,
        headers: {
          'x-client-ip': '192.168.1.201'
        }
      };

      const result = ipManager.getClientIp(mockReq as any);

      expect(result).toBe('192.168.1.201');
    });

    it('should handle IPv6 localhost', () => {
      const mockReq = {
        ip: '::1',
        headers: {}
      };

      const result = ipManager.getClientIp(mockReq as any);

      expect(result).toBe('127.0.0.1');
    });

    it('should handle IPv4-mapped IPv6 address', () => {
      const mockReq = {
        ip: '::ffff:192.168.1.100',
        headers: {}
      };

      const result = ipManager.getClientIp(mockReq as any);

      expect(result).toBe('192.168.1.100');
    });

    it('should return unknown when no IP found', () => {
      const mockReq = {
        ip: undefined,
        headers: {}
      };

      const result = ipManager.getClientIp(mockReq as any);

      expect(result).toBe('unknown');
    });
  });

  describe('isValidIp', () => {
    it('should validate valid IPv4 addresses', () => {
      expect(ipManager.isValidIp('192.168.1.1')).toBe(true);
      expect(ipManager.isValidIp('8.8.8.8')).toBe(true);
      expect(ipManager.isValidIp('255.255.255.255')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(ipManager.isValidIp('256.256.256.256')).toBe(false);
      expect(ipManager.isValidIp('192.168.1.256')).toBe(false);
      expect(ipManager.isValidIp('192.168.1')).toBe(false);
      expect(ipManager.isValidIp('192.168.1.1.1')).toBe(false);
      expect(ipManager.isValidIp('invalid-ip')).toBe(false);
    });

    it('should validate valid IPv6 addresses using net module', () => {
      // Mock net.isIP to return valid results
      net.isIP.mockImplementation((ip: string) => {
        if (ip === '2001:0db8:85a3:0000:0000:8a2e:0370:7334') return 6;
        if (ip === 'fe80::1') return 6;
        if (ip === '::1') return 6;
        return 0;
      });

      expect(ipManager.isValidIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(ipManager.isValidIp('fe80::1')).toBe(true);
      expect(ipManager.isValidIp('::1')).toBe(true);
    });

    it('should validate valid IPv6 addresses using fallback', () => {
      // Keep net module throwing to use fallback
      expect(ipManager.isValidIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(ipManager.isValidIp('fe80::1')).toBe(true);
      expect(ipManager.isValidIp('::1')).toBe(true);
    });

    it('should reject invalid IPv6 addresses', () => {
      expect(ipManager.isValidIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334:1234')).toBe(false);
      expect(ipManager.isValidIp('2001:0db8:85a3:0000:0000:8a2e:0370:gggg')).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      mockedAxios.get.mockResolvedValueOnce({});

      const result = await ipManager.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Service down'));

      const result = await ipManager.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear specific cache key', async () => {
      mockedAxios.get.mockResolvedValue({ data: { ip: '192.168.1.1' } });

      await ipManager.getPublicIp();
      ipManager.clearCache('public-ip');
      await ipManager.getPublicIp();

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      mockedAxios.get.mockResolvedValue({ data: { ip: '192.168.1.1' } });

      await ipManager.getPublicIp();
      ipManager.clearCache();
      await ipManager.getPublicIp();

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
});