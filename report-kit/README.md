# Report Kit

A reusable report template that produces Fable-5-quality reports from a simple JSON data contract. Stop hand-crafting reports — use the template.

Report Kit is the Paperclip fleet's standard for one-off, archival, and stakeholder-facing reports. It is used to render fleet health checks, audit narratives, telemetry summaries, and any report that needs to look like it was authored by a professional technical writer rather than an LLM dump.

## Quick Start

### Option 1: Use `template.html` (fastest)

1. Copy `template.html` to your output location.
2. Replace the `REPORT_DATA` object with your data (matching `report-data.schema.json`).
3. Open in a browser or save as HTML.

### Option 2: Programmatic (Node.js or browser)

```html
<script type="module">
import { renderReport } from './report-renderer.js';

const data = {
  title: "My Report",
  generatedAt: new Date().toISOString(),
  metrics: [
    { label: "Items", value: "42", status: "healthy" }
  ],
  sections: [
    {
      title: "Details",
      type: "table",
      headers: ["Name", "Status"],
      rows: [
        ["Alpha", { value: "OK", status: "healthy" }],
        ["Beta", { value: "Degraded", status: "warning" }]
      ]
    }
  ]
};

document.body.innerHTML = renderReport(data);
</script>
```

### Option 3: Server-side (Node.js — no DOM required)

```js
import { renderReport } from './report-kit/report-renderer.js';
import { writeFileSync } from 'fs';

const html = renderReport(data);
writeFileSync('report.html', html);
```

### Option 4: Open the sample

Open `sample-report.html` in a browser to see a complete fleet health report with real fleet data.

## Files

| File | Purpose |
|------|---------|
| `report-renderer.js` | ES module — call `renderReport(data)` to get a complete HTML document string |
| `report-data.schema.json` | JSON Schema (draft-07) for the data contract |
| `template.html` | Standalone HTML template with placeholder data — copy and fill in |
| `sample-report.html` | Working sample (fleet health report with real fleet data) |
| `README.md` | This file |
| `report-kit.zip` | Archive of all 5 content files for distribution |

## API Reference

### `renderReport(data)`

```ts
renderReport(data: ReportData): string
```

Renders a complete HTML document (including `<!DOCTYPE html>`, `<html>`, `<head>`, and `<body>`) from a `ReportData` object matching `report-data.schema.json`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | `string` | Yes | Report heading, displayed as the main `<h1>` |
| `generatedAt` | `string` | Yes | ISO 8601 timestamp; rendered in the header footer |
| `metrics` | `MetricCard[]` | Yes | Key-value metric cards displayed in a responsive grid at the top of the report (minItems: 1) |
| `sections` | `Section[]` | Yes | Array of content sections forming the report body (minItems: 1) |
| `subtitle` | `string` | No | Subtext shown below the title |
| `version` | `string` | No | Report version string (default: `"1.0.0"`) |
| `manifest` | `Manifest` | No | Manifest ledger strip (generatedBy, source, checksum, counts) |
| `guardrail` | `Guardrail` | No | Guardrail footer (version, environment, notes) |

**Returns:** A complete HTML document string (1,400–20,000+ chars depending on data).

### Data Contract

Full schema: `report-data.schema.json` (JSON Schema draft-07, `$id: https://paperclip.nousresearch.com/schemas/report-data.json`).

#### `MetricCard`

| Field | Type | Required | Status Values |
|-------|------|----------|---------------|
| `label` | `string` | Yes | Metric label (e.g. `"Agents"`, `"Uptime (7d)"`) |
| `value` | `string \| number` | Yes | Metric value (e.g. `"22"`, `"99.7%"`) |
| `status` | `enum` | Yes | `healthy`, `warning`, `critical`, `unknown` |
| `detail` | `string` | No | Sub-text shown below the value in smaller font |

#### `Section`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | Yes | Section heading |
| `type` | `enum` | Yes | One of: `table`, `list`, `text`, `metrics-grid` |
| `description` | `string` | No | Explanatory text above the content |
| `headers` | `string[]` | Table only | Column headers |
| `rows` | `Cell[][]/` | Table only | Table rows — each cell is a string or `{ value, status }` |
| `items` | `{ label, value, status }[]` | list/metrics-grid | List items or metric grid items |
| `body` | `string` | text only | Paragraph text (separate paragraphs with `\n\n`) |

#### Status Values

| Status | Visual | Use case |
|--------|--------|----------|
| `healthy` | Green checkmark circle | Everything is operational |
| `warning` | Amber warning triangle | Degraded but functional |
| `critical` | Red X circle | Requires immediate attention |
| `unknown` | Gray question circle | State could not be determined (fail-open default) |

#### Table Cell Status

For table cells, pass `{ value: "text", status: "healthy" }` instead of a plain string to get a status-colored dot indicator. Plain strings are rendered as-is without a dot.

#### `Manifest`

Optional ledger strip at the bottom of the report, above the guardrail footer.

| Field | Type | Description |
|-------|------|-------------|
| `generatedBy` | `string` | Agent/person who generated the report |
| `source` | `string` | Data source (e.g. `"Paperclip API · Fleet Health Check"`) |
| `checksum` | `string` | SHA-256 or other hash of the source payload |
| `counts` | `object` | Key-value pairs shown as compact ledger items |

#### `Guardrail`

Optional footer with provenance metadata.

| Field | Type | Description |
|-------|------|-------------|
| `version` | `string` | Report kit version (rendered as `vX.X.X`) |
| `environment` | `string` | Environment context (e.g. `"Aegis · macOS 26.4"`) |
| `notes` | `string` | Free-form notes (rendered in italics) |

## Section Types

### `table`

Renders a styled table with status-colored cell dots.

```js
{
  title: "Agent Status",
  type: "table",
  description: "Current status of all fleet agents by role",
  headers: ["Agent", "Role", "Status", "Uptime", "Last Active"],
  rows: [
    ["Coordinator", "PM", { value: "Active", status: "healthy" }, "14d", "2 min ago"],
    ["Press", "WordPress", { value: "Idle", status: "warning" }, "2d", "45 min ago"]
  ]
}
```

### `list`

Renders a status list with botanical SVG icons.

```js
{
  title: "Memory Plane Health",
  type: "list",
  description: "Status of all active memory planes",
  items: [
    { label: "OB1", value: "Online · 1,024 dim", status: "healthy" },
    { label: "Honcho", value: "Online · API v3", status: "healthy" }
  ]
}
```

### `text`

Renders paragraph text (supports `\n\n` paragraph separation).

```js
{
  title: "Recent Activity",
  type: "text",
  description: "Summary of the last hour of fleet operations",
  body: "The fleet processed 14 task heartbeats in the last hour.\n\nProvider auth failures are expected in the cron environment."
}
```

### `metrics-grid`

Renders a grid of small metric cards (same as top-level metrics but in a section).

```js
{
  title: "Issue Distribution by Priority",
  type: "metrics-grid",
  description: "Open issues broken down by priority level",
  items: [
    { label: "Critical", value: "2", status: "critical" },
    { label: "High", value: "4", status: "warning" },
    { label: "Medium", value: "4", status: "healthy" },
    { label: "Low", value: "2", status: "healthy" }
  ]
}
```

## Design System

Warm parchment palette with botanical SVG status indicators:

| Token | Value | Use |
|-------|-------|-----|
| `--bg-page` | `#f5f0e8` | Page background |
| `--bg-card` | `#faf7f0` | Card surfaces (manifest, metric cards) |
| `--bg-surface` | `#ffffff` | Section surfaces |
| `--text-primary` | `#2c2416` | Primary text |
| `--text-secondary` | `#6b5d4a` | Secondary text |
| `--text-muted` | `#9a8b78` | Muted captions |
| `--border` | `#e0d6c4` | Section borders |
| `--border-light` | `#ede5d6` | Inner borders |
| `--accent` | `#7a6b4e` | Accent color |
| `--shadow` | `0 1px 3px rgba(44,36,22,0.08), 0 1px 2px rgba(44,36,22,0.06)` | Card shadow |
| `--shadow-lg` | `0 4px 12px rgba(44,36,22,0.1)` | Hover card shadow |
| `--radius` | `8px` | Section/card border radius |
| `--radius-sm` | `4px` | Small radius |

Fonts: Inter (sans-serif, v4.1 variable) + JetBrains Mono (monospace).

**Responsive:** Design is mobile-first. Below 640px viewport, metric cards switch to 2-column grid, manifest ledger stacks vertically, and guardrail footer wraps.

## Deployment

### Static hosting

Report Kit output is a single self-contained HTML file with inline CSS and inline SVG icons. It has no external dependencies at runtime (the Google Fonts `@import` is a progressive enhancement — the design falls back to system fonts if it fails).

Upload the rendered HTML to any static host: S3, Cloudflare Pages, GitHub Pages, Paperclip attachments, etc.

### Paperclip integration

For fleet reports that should be inspectable by board users, upload the rendered HTML via the Paperclip artifact helper:

```sh
# Render the report in Node.js, then upload
node scripts/render-report.js > dist/fleet-health.html
skills/paperclip/scripts/paperclip-upload-artifact.sh dist/fleet-health.html \
  --title "Fleet health report" \
  --summary "Render for board review"
```

The uploaded attachment is served inline-safe (HTML is in the default upload allowlist). For archive distribution, zip the 5 content files:

```sh
cd report-kit && zip -r report-kit.zip report-renderer.js report-data.schema.json template.html sample-report.html README.md
```

## Schema Validation

Validate your data against the schema before rendering:

```bash
# Requires ajv-cli
npx ajv validate -s report-data.schema.json -d your-data.json
```

Validate from within Node.js:

```js
import Ajv from 'ajv';
import schema from './report-kit/report-data.schema.json' assert { type: 'json' };

const ajv = new Ajv();
const validate = ajv.compile(schema);
if (!validate(data)) {
  console.error(validate.errors);
}
```

## Troubleshooting

### `renderReport is not a function`

You are likely importing from the wrong path or using CommonJS `require()` on an ES module. Report Kit uses ES module syntax — use `import` or `import()` dynamic import:

```js
// ✅ ES module
import { renderReport } from './report-kit/report-renderer.js';

// ✅ Dynamic import in CommonJS
const { renderReport } = await import('./report-kit/report-renderer.js');

// ❌ Will not work
const { renderReport } = require('./report-kit/report-renderer.js');
```

### Output has unstyled content / raw HTML tags

Ensure you are using the return value of `renderReport()` as `innerHTML` or writing it to a file. The function returns a complete HTML document including `<!DOCTYPE html>`, `<style>`, and `<body>` — it is not a fragment.

### SVG status icons not rendering

The botanical SVG symbols are inline in the output. They require `fill="none" stroke="currentColor"` attribute support, which all modern browsers provide. If rendering via a headless service, ensure it supports inline SVG.

### Font not loading

The design uses `font-family` tokens with system-font fallbacks. If the Google Fonts CDN is unreachable, the report renders with `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (macOS/Windows) and `monospace` fallbacks for code font. The visual design degrades gracefully.

### Schema validation errors

Common issues:
- **Missing `generatedAt`**: Must be ISO 8601 (e.g. `new Date().toISOString()`).
- **Missing `metrics`**: Must have at least one item (minItems: 1).
- **Missing `sections`**: Must have at least one item (minItems: 1).
- **Invalid `status` value**: Must be exactly `healthy`, `warning`, `critical`, or `unknown`.
- **Invalid `type` value**: Must be exactly `table`, `list`, `text`, or `metrics-grid`.

## Changelog

### v1.1.0 (2026-08-04)

- **Fix**: Replaced `escapeHtml` DOM-based implementation with pure-JS string replacements. The original used `document.createElement` which crashes in Node.js/SSR/test environments. The new implementation is a pure function that works everywhere.
- **Docs**: Expanded README with full API reference, section type guide, troubleshooting, and deployment patterns (this file).

### v1.0.0 (2026-08-03)

- Initial release as reusable template for Fable-5-quality reports.
- Includes `report-renderer.js` (ES module `renderReport(data)` function), `report-data.schema.json` (JSON Schema draft-07), `template.html` (standalone with placeholders), `sample-report.html` (fleet health sample with real fleet data), and `report-kit.zip` archive.
- Warm parchment design system with botanical SVG status indicators, metric cards, tables, manifest ledger, and guardrail footer.
- Responsive down to 640px viewport width.

## License

Internal use. Part of the Paperclip fleet toolchain.
