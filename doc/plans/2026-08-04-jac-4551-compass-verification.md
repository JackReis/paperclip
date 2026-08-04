# JAC-4551 Compass Verification Report — iOS/Android PWA Install Support & Mobile Touch Targets

**Agent:** Compass (hermes_local)
**Date:** 2026-08-04
**Run ID:** 688f0dd3-a8d0-46b3-a76c-d57c15083dd3
**Paperclip API:** http://127.0.0.1:3101/api (local dev instance)

## Status: VERIFIED

## Scope Verification

### 1. iOS PWA Install Support

**File: `ui/public/site.webmanifest`**
- `display` changed from `"browser"` to `"standalone"` — confirmed via direct file read
- Enables iOS "Add to Home Screen" to open in minimal-ui/standalone-like mode
- Android behavior: manifest `display: "standalone"` applies to both platforms; Android respects this value in the webmanifest

**File: `ui/index.html`**
- `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` — confirmed at line 5
- `<meta name="apple-mobile-web-app-title" content="Paperclip" />` — confirmed at line 7
- `<meta name="apple-mobile-web-app-capable" content="yes" />` — confirmed at line 8

**File: `ui/src/lib/pwa-display-mode.ts` (new utility)**
- Platform-aware display mode detection via `isChromelessDisplayMode()`
- Detects iOS standalone launches via `navigator.standalone`
- Detects Chrome display modes (standalone, fullscreen, window-controls-overlay) via media queries

### 2. Mobile Touch Target Improvements

All interactive elements verified to meet 44px minimum on coarse pointers:

**File: `ui/src/components/StandaloneBrowserControls.tsx`**
- `ControlButton` uses `className="size-11"` (44px) — verified, was previously `size-8` (32px)

**File: `ui/src/components/MobileBottomNav.tsx`**
- Grid: `grid h-16 grid-cols-5 px-1` = 48px+ per item (h-16 = 64px height, 5 cols)
- Nav item containers: `relative flex h-full w-full min-w-0 flex-col items-center justify-center`

**File: `ui/src/components/ChatComposer.tsx`**
- Attach button: `className="grid h-11 w-11 shrink-0 place-items-center ..."`
- Send button: `className="grid h-11 w-11 shrink-0 place-items-center ..."`

**File: `ui/src/pages/OrgChart.tsx`**
- Zoom in button: `className="flex size-11 ... sm:size-7"`
- Zoom out button: `className="flex size-11 ... sm:size-7"`
- Fit to screen button: `className="flex size-11 ... sm:size-7"`

**File: `ui/src/index.css`**
- `@media (pointer: coarse)` enforces `min-height: 44px` on buttons, inputs, selects, textareas, and select triggers

### 3. Viewport Handling

**File: `ui/index.html`**
- `viewport-fit=cover` confirmed in the viewport meta tag (line 5)
- Enables safe-area insets on iPhone X+ devices

### Design System Compliance

- All color values use design tokens from `ui/src/index.css` — no hardcoded hex values in component files
- All spacing uses Tailwind tokens (`size-11`, `h-11`, `w-11`, `h-full`, `w-full`) — no arbitrary bracket values
- `--sz-44px` token defined in `ui/src/index.css`

## Verification

### Tests Run

```sh
# PWA install mode tests
npx vitest run src/lib/pwa-install-mode.test.ts
# Result: 4/4 tests passed

# Display mode tests
npx vitest run src/lib/pwa-display-mode.test.ts
# Result: 5/5 tests passed

# Standalone browser controls tests
npx vitest run src/components/StandaloneBrowserControls.test.tsx
# Result: 3/3 tests passed

# Total: 12/12 tests passing
```

### Token Gate Check

```
pnpm check:token-gates
# Result: 5 pre-existing violations (all in untouched files)
# No new violations introduced.
```

### Files Changed

| File | Change |
|------|--------|
| `ui/index.html` | +1 line (apple-mobile-web-app-capable already present) |
| `ui/public/site.webmanifest` | display: "browser" -> "standalone" |
| `ui/src/components/ChatComposer.tsx` | h-7/w-7 -> h-11/w-11 (attach + send buttons) |
| `ui/src/components/MobileBottomNav.tsx` | h-full w-full on nav items |
| `ui/src/components/StandaloneBrowserControls.tsx` | size-8 -> size-11 |
| `ui/src/lib/pwa-install-mode.test.ts` | Rewritten to verify display: "standalone" |
| `ui/src/pages/OrgChart.tsx` | size-9 -> size-11 with sm:size-7 override |
