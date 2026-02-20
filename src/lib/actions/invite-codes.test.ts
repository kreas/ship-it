import { describe, it, expect } from "vitest";

// Test the UUID validation regex directly
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("invite code validation", () => {
  describe("UUID format validation", () => {
    it("accepts valid UUIDs", () => {
      expect(UUID_REGEX.test("550e8400-e29b-41d4-a716-446655440000")).toBe(
        true
      );
      expect(UUID_REGEX.test("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(
        true
      );
      expect(UUID_REGEX.test("F47AC10B-58CC-4372-A567-0E02B2C3D479")).toBe(
        true
      );
    });

    it("rejects invalid UUIDs", () => {
      expect(UUID_REGEX.test("")).toBe(false);
      expect(UUID_REGEX.test("not-a-uuid")).toBe(false);
      expect(UUID_REGEX.test("550e8400-e29b-41d4-a716")).toBe(false);
      expect(UUID_REGEX.test("550e8400e29b41d4a716446655440000")).toBe(false);
      expect(UUID_REGEX.test("gggggggg-gggg-gggg-gggg-gggggggggggg")).toBe(
        false
      );
    });

    it("rejects UUIDs with extra characters", () => {
      expect(
        UUID_REGEX.test("550e8400-e29b-41d4-a716-446655440000-extra")
      ).toBe(false);
      expect(
        UUID_REGEX.test(" 550e8400-e29b-41d4-a716-446655440000")
      ).toBe(false);
    });
  });

  describe("expiry check logic", () => {
    it("treats null expiresAt as never expired", () => {
      const code: { expiresAt: Date | null } = { expiresAt: null };
      const isExpired = code.expiresAt && code.expiresAt < new Date();
      expect(isExpired).toBeFalsy();
    });

    it("detects expired codes", () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      const code = { expiresAt: pastDate };
      const isExpired = code.expiresAt && code.expiresAt < new Date();
      expect(isExpired).toBeTruthy();
    });

    it("allows non-expired codes", () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day from now
      const code = { expiresAt: futureDate };
      const isExpired = code.expiresAt && code.expiresAt < new Date();
      expect(isExpired).toBeFalsy();
    });
  });

  describe("maxUses exhaustion logic", () => {
    it("null maxUses means unlimited — never exhausted", () => {
      const code = { maxUses: null as number | null };
      const claimCount = 1000;
      const isExhausted = code.maxUses !== null && claimCount >= code.maxUses;
      expect(isExhausted).toBe(false);
    });

    it("allows claims when under maxUses limit", () => {
      const code = { maxUses: 5 };
      const claimCount = 3;
      const isExhausted = code.maxUses !== null && claimCount >= code.maxUses;
      expect(isExhausted).toBe(false);
    });

    it("rejects claims when at maxUses limit", () => {
      const code = { maxUses: 5 };
      const claimCount = 5;
      const isExhausted = code.maxUses !== null && claimCount >= code.maxUses;
      expect(isExhausted).toBe(true);
    });

    it("rejects claims when over maxUses limit", () => {
      const code = { maxUses: 3 };
      const claimCount = 10;
      const isExhausted = code.maxUses !== null && claimCount >= code.maxUses;
      expect(isExhausted).toBe(true);
    });

    it("maxUses of 1 behaves like single-use", () => {
      const code = { maxUses: 1 };
      // No claims yet — allowed
      expect(code.maxUses !== null && 0 >= code.maxUses).toBe(false);
      // One claim — exhausted
      expect(code.maxUses !== null && 1 >= code.maxUses).toBe(true);
    });
  });
});
