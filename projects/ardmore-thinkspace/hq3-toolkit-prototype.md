# Ardmore ThinkSpace — Founder-Sprint AI Toolkit Prototype

## Overview

The founder-sprint AI toolkit is a lightweight, laptop-based suite that guides founders through
the ADA three-phase model (Ideation/Validation → Customer Discovery → Early Traction). It runs
entirely on a laptop with no server setup, is usable by founders with minimal technical
background, and is productizable as a replicable ThinkSpace-in-a-box component.

The toolkit maps to the ADA $180k programming/founder sprint budget line and supports the
Spring 2028 evidence-gated building decision.

## Component 1: Market Research Assistant

### Purpose
Automates customer interviews, competitor analysis, and market sizing so founders can
concentrate on high-touch relationship-building.

### Architecture
- **Runtime**: Python-based CLI tool, distributed as a portable binary (pip install or
  standalone executable via PyInstaller)
- **AI backend**: Local LLM via Ollama (qwen3-coder:30b for code tasks, nomic-embed for search)
  with optional cloud fallback (Groq/Lambda for rate-limited calls)
- **Data storage**: SQLite database per project (portable, no server)
- **Interface**: Terminal-based UI with optional TUI dashboard (Textual/Rich)
- **Offline capability**: Core functions (interview scripting, canvas drafting) work offline;
  cloud calls only for non-blocking enrichment

### Features
1. **Interview script generator**: Creates structured interview guides based on founder's
   problem hypothesis and target customer profile
2. **Competitor research scraper**: Pulls public data (websites, social media, Crunchbase)
   and summarizes competitive positioning using AI
3. **Market sizing assistant**: Walks founders through TAM/SAM/SOM estimation with guided
   prompts and data source references
4. **Insight synthesis**: After 3+ interviews, auto-generates a synthesis report highlighting
   patterns, gaps, and pivot signals
5. **No-setup deployment**: One-command install (`pip install ardmore-thinkspace`) or
  portable binary download; everything runs locally

### Non-technical founder UX
- Menu-driven interface with clear numbered options
- Default templates for all common startup stages
- Plain-language explanations at every step
- Export to PDF/Markdown for sharing with the operating lead
- Built-in guidance: "What should I ask next?" prompts based on progress state

## Component 2: Business Model Canvas Generator

### Purpose
Template-driven B-M-C creation with AI assistance for each of the 9 building blocks,
producing investor-ready canvases in minutes.

### Architecture
- **Runtime**: Same Python runtime as Component 1 (shared dependency)
- **AI backend**: Local LLM via Ollama; canvas templates stored as Markdown with YAML frontmatter
- **Data storage**: Canvas stored as structured JSON + Markdown export; SQLite for version history
- **Interface**: CLI with optional web preview (localhost-only, no external server)

### Features
1. **9-block canvas wizard**: Step-by-step guidance through Value Proposition, Customer Segments,
   Channels, Customer Relationships, Revenue Streams, Key Resources, Key Activities, Key
  Partnerships, Cost Structure
2. **AI block assistant**: For each block, the founder answers 2–3 guided questions and the AI
   drafts the block content; founder can edit or regenerate
3. **Template library**: Pre-built canvases for common startup types (SaaS, marketplace,
   hardware, social enterprise)
4. **Comparison mode**: Side-by-side view of up to 3 canvas versions to track evolution
5. **Investor export**: One-click PDF/Markdown export with clean formatting and page numbers

### Non-technical founder UX
- Wizard-style prompts with examples
- "Suggest" button uses AI to auto-fill based on previous blocks
- Visual ASCII-art canvas layout in terminal
- Undo/redo for every block edit
- Plain-English labels for all 9 blocks (no jargon without explanation)

## Local Runtime Constraints

| Requirement | Implementation |
|---|---|
| Laptop-only | Python 3.10+; optional Ollama for local LLM; no cloud dependency for core features |
| No server setup | All services run as local processes; web preview binds to 127.0.0.1 only |
| No technical staff | One-command install; auto-update via pip; self-contained |
| Handoff-ready | All data stored in portable SQLite + Markdown files; can be transferred to any laptop |
| Replicable | Published as open-source package on PyPI; install instructions are 2 lines |

## Productization as ThinkSpace-in-a-Box

| Aspect | Implementation |
|---|---|
| Package name | `ardmore-thinkspace` (PyPI + GitHub releases) |
| Installation | `pip install ardmore-thinkspace` or download portable binary |
| Documentation | Markdown docs + auto-generated CLI help (`--help` on every command) |
| Templates | Shipped as bundled YAML/Markdown; community-contributed templates supported |
| Configurability | `thinkspace init` creates a local config file; all paths relative to project dir |
| Portability | Entire toolkit + data folder can be zipped and moved to another machine |
| Commerce replicability | Install instructions are 2 lines; no ADA-specific configuration required |

## Budget Alignment

- **$180k programming/founder sprint**: The prototype development and initial founder sprint
  deployment
- **$100k tools & playbooks**: The open-source toolkit package itself (productized as
  ThinkSpace-in-a-box)
- **$120k outreach & storytelling**: The positioning and go-to-market materials for other
  communities

## Dependencies
- Depends on: hq3-requirements.md (requirements define the scope this prototype fulfills)
