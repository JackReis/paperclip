# Report Kit

A reusable report template that produces Fable-5-quality reports from a simple JSON data contract. Stop hand-crafting reports — use the template.

## Quick Start

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

Or open `sample-report.html` in a browser to see a complete fleet health report.

## Files

| File | Purpose |
|------|---------|
| `report-renderer.js` | ES module — call `renderReport(data)` to get an HTML string |
| `report-data.schema.json` | JSON Schema for the data contract |
| `template.html` | Standalone HTML template with placeholder data |
| `sample-report.html` | Working sample (fleet health report) |
| `report-kit.zip` | Archive of all files for distribution |

## Data Contract

Pass an object matching `report-data.schema.json` to `renderReport()`. Required fields:

- **`title`** — Report heading
- **`generatedAt`** — ISO 8601 timestamp
- **`metrics`** — Array of metric cards (label, value, status)
- **`sections`** — Array of content sections

### Section Types

| Type | Fields | Renders As |
|------|--------|------------|
| `table` | `headers[]`, `rows[][]` | Table with status-colored cells |
| `list` | `items[{label, value, status}]` | Status list with botanical icons |
| `text` | `body` | Paragraph text |
| `metrics-grid` | `items[{label, value, status}]` | Metric card grid |

### Status Values

- `healthy` — Green checkmark circle
- `warning` — Amber warning triangle
- `critical` — Red X circle
- `unknown` — Gray question circle

### Cell Status Colors (Tables)

For table cells, pass `{ value: "text", status: "healthy" }` instead of a plain string to get a status-colored dot indicator.

## Design System

Warm parchment palette with botanical SVG status indicators:

- **Background:** `#f5f0e8` (warm parchment)
- **Cards:** `#faf7f0` (cream)
- **Surfaces:** `#ffffff` (white)
- **Text:** `#2c2416` (warm charcoal)
- **Accent:** `#7a6b4e` (olive)
- **Font:** Inter (sans) + JetBrains Mono (mono)

Responsive down to 640px viewport width.

## Usage Patterns

### 1. In-browser (ES module)

```html
<script type="module">
import { renderReport } from './report-renderer.js';
document.getElementById('root').innerHTML = renderReport(myData);
</script>
```

### 2. Server-side (Node.js)

```js
import { renderReport } from './report-renderer.js';
import { writeFileSync } from 'fs';

const html = renderReport(data);
writeFileSync('report.html', html);
```

### 3. From template.html

Copy `template.html`, replace the `REPORT_DATA` object with your data, and open in a browser. The template imports `report-renderer.js` as a module.

## Schema Validation

```bash
# Validate your data against the schema (requires ajv-cli or similar)
npx ajv validate -s report-data.schema.json -d your-data.json
```

## License

Internal use. Part of the Paperclip fleet toolchain.
