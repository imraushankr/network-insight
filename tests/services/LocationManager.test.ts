import { LocationManager } from '../../src/services/LocationManager';
import axios from 'axios';
import { NetworkInfoConfig, GeolocationData } from '../../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LocationManager', () => {
  let locationManager: LocationManager;
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

  const mockLocationData: GeolocationData = {
    ip: '192.168.1.1',
    city: 'Test City',
    region: 'Test Region',
    region_code: 'TR',
    country: 'US',
    country_name: 'United States',
    continent_code: 'NA',
    postal: '12345',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
    utc_offset: '-0500',
    country_calling_code: '+1',
    currency: 'USD',
    languages: 'en',
    asn: 'AS12345',
    org: 'Test Org',
    isp: 'Test ISP'
  };

  beforeEach(() => {
    locationManager = new LocationManager(mockConfig);
    jest.clearAllMocks();
  });

  describe('getLocation', () => {
    it('should return location data for IP', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockLocationData
      });

      const result = await locationManager.getLocation('192.168.1.1');

      expect(result).toEqual(mockLocationData);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://ipapi.co/192.168.1.1/json/',
        { timeout: 10000 }
      );
    });

    it('should return location data without IP', async () => {
      // Mock the public IP lookup first, then location lookup
      mockedAxios.get
        .mockResolvedValueOnce({ 
          data: { ip: '192.168.1.1' }  // Mock response for public IP lookup
        })
        .mockResolvedValueOnce({ 
          data: mockLocationData  // Mock response for location lookup
        });

      const result = await locationManager.getLocation();

      expect(result).toEqual(mockLocationData);
      // Should call public IP endpoint and then location endpoint
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should use fallback providers when first fails', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('First provider failed'))
        .mockResolvedValueOnce({ data: mockLocationData });

      const result = await locationManager.getLocation('192.168.1.1');

      expect(result).toEqual(mockLocationData);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should throw error for invalid IP', async () => {
      await expect(locationManager.getLocation('invalid-ip')).rejects.toThrow('Invalid IP address: invalid-ip');
    });

    it('should return cached location when available', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockLocationData });

      await locationManager.getLocation('192.168.1.1');
      const result = await locationManager.getLocation('192.168.1.1');

      expect(result).toEqual(mockLocationData);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should skip cache when disabled', async () => {
      const noCacheConfig = { 
        ...mockConfig, 
        cache: { enabled: false, ttl: 300000 } 
      };
      const noCacheManager = new LocationManager(noCacheConfig);
      
      mockedAxios.get.mockResolvedValue({ data: mockLocationData });

      await noCacheManager.getLocation('192.168.1.1');
      await noCacheManager.getLocation('192.168.1.1');

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCurrentLocation', () => {
    it('should return current location using public IP', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: { ip: '192.168.1.1' } })
        .mockResolvedValueOnce({ data: mockLocationData });

      const result = await locationManager.getCurrentLocation();

      expect(result).toEqual(mockLocationData);
    });

    it('should throw error when public IP lookup fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('IP service failed'));

      await expect(locationManager.getCurrentLocation()).rejects.toThrow('Failed to get public IP for location lookup');
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      mockedAxios.get.mockResolvedValueOnce({});

      const result = await locationManager.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Service down'));

      const result = await locationManager.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear specific cache key', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockLocationData });

      await locationManager.getLocation('192.168.1.1');
      locationManager.clearCache('location-192.168.1.1');
      await locationManager.getLocation('192.168.1.1');

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockLocationData });

      await locationManager.getLocation('192.168.1.1');
      locationManager.clearCache();
      await locationManager.getLocation('192.168.1.1');

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
});