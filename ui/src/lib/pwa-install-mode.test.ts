import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const uiRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("PWA install mode — platform-aware display", () => {
  function readManifest() {
    return JSON.parse(readFileSync(resolve(uiRoot, "public/site.webmanifest"), "utf8")) as {
      display?: string;
    };
  }

  function readIndexHtml() {
    return readFileSync(resolve(uiRoot, "index.html"), "utf8");
  }

  it("manifest uses display: standalone so iOS opens in minimal-ui/standalone-like mode", () => {
    const manifest = readManifest();
    expect(manifest.display).toBe("standalone");
  });

  it("HTML includes apple-mobile-web-app-capable meta tag for iOS full-screen mode", () => {
    const html = readIndexHtml();
    expect(html).toContain('name="apple-mobile-web-app-capable"');
    expect(html).toContain('content="yes"');
  });

  it("HTML includes apple-mobile-web-app-title meta tag", () => {
    const html = readIndexHtml();
    expect(html).toContain('name="apple-mobile-web-app-title"');
    expect(html).toContain("Paperclip");
  });

  it("HTML sets viewport-fit=cover for iPhone X+ safe-area insets", () => {
    const html = readIndexHtml();
    expect(html).toContain("viewport-fit=cover");
  });
});
