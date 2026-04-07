import { describe, it, expect } from "vitest";
import {
  CLIENT_REFERENCES,
  getClientReference,
  findClientByNickname,
  getClientContactsRef,
} from "./clients";

describe("CLIENT_REFERENCES", () => {
  it("contains all 13 clients", () => {
    expect(CLIENT_REFERENCES).toHaveLength(13);
  });

  it("has unique slugs", () => {
    const slugs = CLIENT_REFERENCES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every client has at least one nickname", () => {
    for (const client of CLIENT_REFERENCES) {
      expect(client.nicknames.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("getClientReference", () => {
  it("returns client by slug", () => {
    const ref = getClientReference("convergix");
    expect(ref).toBeDefined();
    expect(ref!.fullName).toBe("Convergix");
  });

  it("returns undefined for unknown slug", () => {
    expect(getClientReference("nonexistent")).toBeUndefined();
  });
});

describe("findClientByNickname", () => {
  it("finds Convergix by CGX", () => {
    const ref = findClientByNickname("CGX");
    expect(ref).toBeDefined();
    expect(ref!.slug).toBe("convergix");
  });

  it("finds Beyond Petrochemicals by BP", () => {
    const ref = findClientByNickname("BP");
    expect(ref).toBeDefined();
    expect(ref!.slug).toBe("beyond-petro");
  });

  it("is case-insensitive", () => {
    const ref = findClientByNickname("cgx");
    expect(ref).toBeDefined();
    expect(ref!.slug).toBe("convergix");
  });

  it("finds by full name", () => {
    const ref = findClientByNickname("High Desert Law");
    expect(ref).toBeDefined();
    expect(ref!.slug).toBe("hdl");
  });

  it("returns undefined for unknown nickname", () => {
    expect(findClientByNickname("FakeClient")).toBeUndefined();
  });
});

describe("getClientContactsRef", () => {
  it("returns contacts for Convergix", () => {
    const contacts = getClientContactsRef("convergix");
    expect(contacts.length).toBeGreaterThan(0);
    expect(contacts.some((c) => c.name === "Daniel")).toBe(true);
  });

  it("returns empty array for client with no contacts", () => {
    const contacts = getClientContactsRef("lppc");
    expect(contacts).toEqual([]);
  });

  it("returns empty array for unknown slug", () => {
    const contacts = getClientContactsRef("nonexistent");
    expect(contacts).toEqual([]);
  });
});
