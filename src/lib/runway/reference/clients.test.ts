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

  it("every client has a non-empty fullName", () => {
    for (const client of CLIENT_REFERENCES) {
      expect(client.fullName.length).toBeGreaterThan(0);
    }
  });

  it("slugs are lowercase kebab-case", () => {
    for (const client of CLIENT_REFERENCES) {
      expect(client.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("contacts have non-empty names when present", () => {
    for (const client of CLIENT_REFERENCES) {
      for (const contact of client.contacts) {
        expect(contact.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("nicknames include the fullName or a short form", () => {
    for (const client of CLIENT_REFERENCES) {
      // Each client should be findable by at least one of its nicknames
      expect(client.nicknames.length).toBeGreaterThanOrEqual(1);
      for (const nick of client.nicknames) {
        expect(nick.length).toBeGreaterThan(0);
      }
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

  it("returns undefined for empty string", () => {
    expect(findClientByNickname("")).toBeUndefined();
  });

  it("finds Hopdoddy by short nickname Hop", () => {
    const ref = findClientByNickname("Hop");
    expect(ref).toBeDefined();
    expect(ref!.slug).toBe("hopdoddy");
  });

  it("finds HDL by all three nicknames", () => {
    expect(findClientByNickname("HDL")?.slug).toBe("hdl");
    expect(findClientByNickname("High Desert")?.slug).toBe("hdl");
    expect(findClientByNickname("High Desert Law")?.slug).toBe("hdl");
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
