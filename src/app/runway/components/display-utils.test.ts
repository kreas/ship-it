import { describe, it, expect } from "vitest";
import { getOwnerResourcesDisplay } from "./display-utils";

describe("getOwnerResourcesDisplay", () => {
  it("shows resources and hides owner when they are the same", () => {
    const result = getOwnerResourcesDisplay({ owner: "Kathy", resources: "Kathy" });
    expect(result.showOwnerSeparately).toBe(false);
    expect(result.displayResources).toBe("Kathy");
  });

  it("shows owner separately when different from resources", () => {
    const result = getOwnerResourcesDisplay({ owner: "Kathy", resources: "Roz, Lane" });
    expect(result.showOwnerSeparately).toBe(true);
    expect(result.displayResources).toBe("Roz, Lane");
  });

  it("falls back to owner when resources is undefined", () => {
    const result = getOwnerResourcesDisplay({ owner: "Kathy" });
    expect(result.showOwnerSeparately).toBe(false);
    expect(result.displayResources).toBe("Kathy");
  });

  it("returns undefined displayResources when both are undefined", () => {
    const result = getOwnerResourcesDisplay({});
    expect(result.showOwnerSeparately).toBe(false);
    expect(result.displayResources).toBeUndefined();
  });

  it("uses resources when owner is undefined", () => {
    const result = getOwnerResourcesDisplay({ resources: "Roz" });
    expect(result.showOwnerSeparately).toBe(false);
    expect(result.displayResources).toBe("Roz");
  });
});
