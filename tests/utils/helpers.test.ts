import {
  createSuccessResponse,
  createErrorResponse,
  delay,
  retry,
} from "../../src/utils/helpers";

describe("Helpers", () => {
  describe("createSuccessResponse", () => {
    it("should create success response with data", () => {
      const data = { message: "success" };
      const response = createSuccessResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.error).toBeNull();
      expect(response.timestamp).toBeDefined();
    });
  });

  describe("createErrorResponse", () => {
    it("should create error response with message", () => {
      const errorMessage = "Something went wrong";
      const response = createErrorResponse(errorMessage);

      expect(response.success).toBe(false);
      expect(response.data).toBeNull();
      expect(response.error).toBe(errorMessage);
      expect(response.timestamp).toBeDefined();
    });
  });

  describe("delay", () => {
    it("should delay for specified time", async () => {
      const start = Date.now();
      await delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90);
    });
  });

  describe("retry", () => {
    it("should return result on first successful attempt", async () => {
      const mockOperation = jest.fn().mockResolvedValue("success");

      const result = await retry(mockOperation);

      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and succeed", async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error("First fail"))
        .mockResolvedValueOnce("success");

      const result = await retry(mockOperation, 3, 10);

      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it("should throw error after all retries fail", async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error("Always fails"));

      await expect(retry(mockOperation, 2, 10)).rejects.toThrow("Always fails");
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it("should use exponential backoff", async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error("Fail"));
      const start = Date.now();

      try {
        await retry(mockOperation, 3, 100);
      } catch (error) {
        // Ignore error
      }

      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(300);
    });
  });
});