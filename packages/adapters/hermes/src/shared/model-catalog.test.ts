import { describe, expect, it } from "vitest";
import {
  authenticateModel,
  MODEL_CATALOG,
  ModelAuthFailure,
  requireAuthenticatedModel,
} from "./model-catalog.js";

describe("MODEL_CATALOG", () => {
  it("is non-empty", () => {
    expect(MODEL_CATALOG.length).toBeGreaterThan(0);
  });

  it("has unique model ids", () => {
    const ids = MODEL_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("requires every entry to have id, label, and provider", () => {
    for (const entry of MODEL_CATALOG) {
      expect(entry.id).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.provider).toBeTruthy();
    }
  });
});

describe("authenticateModel", () => {
  it("matches an exact catalog entry", () => {
    const entry = MODEL_CATALOG[0]!;
    expect(authenticateModel(entry.id)).toEqual(entry);
  });

  it("returns null for a non-matching model", () => {
    expect(authenticateModel("not-a-real-model")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(authenticateModel("")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(authenticateModel(undefined as unknown as string)).toBeNull();
    expect(authenticateModel(null as unknown as string)).toBeNull();
    expect(authenticateModel(123 as unknown as string)).toBeNull();
  });

  it("NEVER uses substring matching — a suffix impostor is rejected", () => {
    const entry = MODEL_CATALOG[0]!;
    expect(authenticateModel(`${entry.id}-evil`)).toBeNull();
    expect(authenticateModel(`not-${entry.id}`)).toBeNull();
    expect(authenticateModel(`${entry.id}s`)).toBeNull();
  });

  it("NEVER uses case-insensitive matching", () => {
    const entry = MODEL_CATALOG[0]!;
    expect(authenticateModel(entry.id.toUpperCase())).toBeNull();
    expect(authenticateModel(entry.id.toLowerCase())).toEqual(entry);
  });
});

describe("requireAuthenticatedModel", () => {
  it("returns the catalog entry for an exact match", () => {
    const entry = MODEL_CATALOG[0]!;
    expect(requireAuthenticatedModel(entry.id)).toEqual(entry);
  });

  it("throws ModelAuthFailure for a non-matching model", () => {
    expect(() => requireAuthenticatedModel("bogus-model")).toThrow(ModelAuthFailure);
  });

  it("throws ModelAuthFailure for an empty string", () => {
    expect(() => requireAuthenticatedModel("")).toThrow(ModelAuthFailure);
  });

  it("the error preserves the rejected model id", () => {
    try {
      requireAuthenticatedModel("bogus-model");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ModelAuthFailure);
      expect((err as ModelAuthFailure).modelId).toBe("bogus-model");
    }
  });

  it("a suffix impostor throws rather than matching", () => {
    const entry = MODEL_CATALOG[0]!;
    expect(() => requireAuthenticatedModel(`${entry.id}-evil`)).toThrow(ModelAuthFailure);
  });
});

describe("ModelAuthFailure", () => {
  it("includes the model id and a helpful message", () => {
    const err = new ModelAuthFailure("my-bad-model");
    expect(err.message).toContain("my-bad-model");
    expect(err.message).toContain("exact");
    expect(err.modelId).toBe("my-bad-model");
  });
});
