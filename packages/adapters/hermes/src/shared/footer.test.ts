import { describe, expect, it } from "vitest";
import {
  parseCurrentResultFooter,
  extractFooterModel,
  requireFooterModel,
  ModelAuthFailure,
  type FooterParseResult,
  type ParsedFooter,
} from "./footer.js";
import { MODEL_CATALOG } from "./model-catalog.js";

// Pick the first cataloged model for authenticated-footer tests.
const catalogedModel = MODEL_CATALOG[0]!;

const authenticatedFooter = (model = catalogedModel) =>
  `---\nmodel: ${model.id}\nprovider: ${model.provider}\n`;

describe("parseCurrentResultFooter", () => {
  // --- No footer present -------------------------------------------------
  describe("no footer", () => {
    it("returns null footer when output has no separator", () => {
      const result = parseCurrentResultFooter("just a plain response with no footer");
      expect(result.footer).toBeNull();
      expect(result.malformed).toBe(false);
      expect(result.unauthenticated).toBe(false);
      expect(result.error).toBeNull();
    });

    it("returns null footer for empty output", () => {
      const result = parseCurrentResultFooter("");
      expect(result.footer).toBeNull();
      expect(result.malformed).toBe(false);
    });

    it("returns null footer for non-string input", () => {
      const result = parseCurrentResultFooter(undefined as unknown as string);
      expect(result.footer).toBeNull();
      expect(result.malformed).toBe(false);
    });

    it("returns null footer when output is only whitespace", () => {
      const result = parseCurrentResultFooter("   \n  \t  \n");
      expect(result.footer).toBeNull();
      expect(result.malformed).toBe(false);
    });
  });

  // --- Trailing separator (stale footer) ---------------------------------
  describe("trailing separator (stale)", () => {
    it("reports malformed when output ends with --- and no content after", () => {
      const result = parseCurrentResultFooter("response text\n---\n");
      expect(result.footer).toBeNull();
      expect(result.malformed).toBe(true);
      expect(result.unauthenticated).toBe(false);
    });

    it("reports malformed when output ends with ---  (no newline)", () => {
      const result = parseCurrentResultFooter("response text\n---");
      expect(result.footer).toBeNull();
      expect(result.malformed).toBe(true);
    });
  });

  // --- Malformed footers -------------------------------------------------
  describe("malformed footers", () => {
    it("reports malformed when footer block is empty", () => {
      const result = parseCurrentResultFooter("response\n---\n\n");
      // After the last separator, there's only whitespace
      expect(result.footer).toBeNull();
      expect(result.malformed).toBe(true);
    });

    it("reports malformed when footer has no model field", () => {
      const result = parseCurrentResultFooter("response\n---\nprovider: openrouter\n");
      expect(result.footer).toBeNull();
      expect(result.malformed).toBe(true);
    });

    it("reports malformed when model field is empty", () => {
      // The regex captures the rest of the line after "model:".
      // "model:" followed by nothing means empty match.
      const result = parseCurrentResultFooter("response\n---\nmodel:\n");
      expect(result.footer).toBeNull();
      expect(result.malformed).toBe(true);
    });

    it("reports malformed when model field is whitespace only", () => {
      const result = parseCurrentResultFooter("response\n---\nmodel:   \n");
      expect(result.footer).toBeNull();
      expect(result.malformed).toBe(true);
    });
  });

  // --- Unauthenticated footers -------------------------------------------
  describe("unauthenticated footers", () => {
    it("reports unauthenticated for a model not in the catalog", () => {
      const result = parseCurrentResultFooter("response\n---\nmodel: totally-fake-model\nprovider: openrouter\n");
      expect(result.footer).not.toBeNull();
      expect(result.malformed).toBe(false);
      expect(result.unauthenticated).toBe(true);
      expect(result.footer!.model).toBe("totally-fake-model");
      expect(result.footer!.catalogEntry).toBeNull();
      expect(result.footer!.authenticated).toBe(false);
    });

    it("does NOT substring-match a catalog entry", () => {
      // A model string that contains a catalog model as a substring must NOT match
      const impostor = `${catalogedModel.id}-evil`;
      const result = parseCurrentResultFooter(`response\n---\nmodel: ${impostor}\n`);
      expect(result.unauthenticated).toBe(true);
      expect(result.footer!.authenticated).toBe(false);
    });

    it("rejects provider mismatch against the catalog entry", () => {
      const result = parseCurrentResultFooter(
        `response\n---\nmodel: ${catalogedModel.id}\nprovider: wrong-provider\n`,
      );
      expect(result.unauthenticated).toBe(true);
      expect(result.footer!.authenticated).toBe(false);
    });

    it("rejects case-variant of a catalog model", () => {
      const result = parseCurrentResultFooter(
        `response\n---\nmodel: ${catalogedModel.id.toUpperCase()}\n`,
      );
      expect(result.unauthenticated).toBe(true);
    });
  });

  // --- Authenticated footers ---------------------------------------------
  describe("authenticated footers", () => {
    it("parses an authenticated footer with model and provider", () => {
      const result = parseCurrentResultFooter(`response\n${authenticatedFooter()}`);
      expect(result.malformed).toBe(false);
      expect(result.unauthenticated).toBe(false);
      expect(result.error).toBeNull();
      expect(result.footer).not.toBeNull();
      const f = result.footer!;
      expect(f.model).toBe(catalogedModel.id);
      expect(f.catalogEntry).toEqual(catalogedModel);
      expect(f.provider).toBe(catalogedModel.provider);
      expect(f.authenticated).toBe(true);
    });

    it("authenticates when footer has model but no provider line", () => {
      const result = parseCurrentResultFooter(
        `response\n---\nmodel: ${catalogedModel.id}\n`,
      );
      expect(result.unauthenticated).toBe(false);
      expect(result.footer!.authenticated).toBe(true);
      expect(result.footer!.model).toBe(catalogedModel.id);
    });

    it("uses the last --- separator block as the footer", () => {
      // Multiple --- separators; only the last one matters
      const output =
        "response\n---\nnoise line\n---\n" +
        `model: ${catalogedModel.id}\nprovider: ${catalogedModel.provider}\n`;
      const result = parseCurrentResultFooter(output);
      expect(result.footer!.model).toBe(catalogedModel.id);
      expect(result.footer!.authenticated).toBe(true);
    });

    it("accepts extra whitespace around model value", () => {
      const result = parseCurrentResultFooter(
        `response\n---\nmodel:   ${catalogedModel.id}  \n`,
      );
      expect(result.footer!.model).toBe(catalogedModel.id);
      expect(result.footer!.authenticated).toBe(true);
    });

    it("recognizes model field case-insensitively in the label", () => {
      const result = parseCurrentResultFooter(
        `response\n---\nMODEL: ${catalogedModel.id}\n`,
      );
      expect(result.footer!.model).toBe(catalogedModel.id);
      expect(result.footer!.authenticated).toBe(true);
    });
  });
});

describe("extractFooterModel", () => {
  it("returns the raw model string from an authenticated footer", () => {
    const result = extractFooterModel(`response\n${authenticatedFooter()}`);
    expect(result).toBe(catalogedModel.id);
  });

  it("returns the raw model string from an unauthenticated footer", () => {
    const result = extractFooterModel("response\n---\nmodel: unknown-model\n");
    expect(result).toBe("unknown-model");
  });

  it("returns null when no footer is present", () => {
    expect(extractFooterModel("no footer here")).toBeNull();
  });

  it("returns null when the footer is malformed", () => {
    expect(extractFooterModel("response\n---\n")).toBeNull();
    expect(extractFooterModel("response\n---\nmodel:\n")).toBeNull();
  });
});

describe("requireFooterModel", () => {
  it("returns the catalog entry for an authenticated footer", () => {
    const entry = requireFooterModel(`response\n${authenticatedFooter()}`);
    expect(entry).toEqual(catalogedModel);
  });

  it("throws ModelAuthFailure for a missing footer", () => {
    expect(() => requireFooterModel("no footer")).toThrow(ModelAuthFailure);
  });

  it("throws ModelAuthFailure for a malformed footer", () => {
    expect(() => requireFooterModel("response\n---\n")).toThrow(ModelAuthFailure);
  });

  it("throws ModelAuthFailure for an unauthenticated model", () => {
    expect(() => requireFooterModel("response\n---\nmodel: fake-model\n")).toThrow(ModelAuthFailure);
  });
});
