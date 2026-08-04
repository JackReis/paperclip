# Ardmore ThinkSpace — Founder-Sprint Toolkit Requirements

## Scope and Requirements

This document defines the scope and requirements for the founder-sprint AI toolkit prototype,
mapping to the three phases of the ADA three-phase model and the $180k programming/founder
sprint budget line.

## Phase 1: Ideation / Validation (Months 1–8)

### Requirements
- **Problem identification wizard**: Guided prompts to help founders articulate and refine
  their core problem hypothesis
- **Solution ideation assistant**: Brainstorming tool with AI-suggested solution directions
  based on the problem statement
- **Market sizing helper**: TAM/SAM/SOM estimation with guided data sources
- **Customer profile builder**: Create initial ideal customer profiles (ICPs) with guided
  segmentation questions
- **Validation planning tool**: Generate a 2-week validation sprint plan with specific
  hypotheses to test

### Non-functional requirements
- Must run on a laptop with no internet (offline mode for core ideation features)
- No technical setup required — one-command install or portable binary
- Export to Markdown/PDF for handoff to the operating lead
- Usable by founders with zero coding experience

## Phase 2: Customer Discovery (Months 9–16)

### Requirements
- **Interview scheduling assistant**: Template-based interview request generator with
  calendar integration (optional)
- **Interview script generator**: Creates structured interview guides from the validation plan
- **Competitor research scraper**: Pulls public data from websites, social media, and
  business databases
- **Insight synthesis engine**: After 3+ interviews, auto-generates synthesis reports
  highlighting patterns, gaps, and pivot signals
- **Progress tracker**: Visual dashboard showing interview completion rate, insight density,
  and pivot signals detected

### Non-functional requirements
- Must run on a laptop with intermittent internet (scraping requires connectivity but
  core functions work offline)
- Data stored locally in portable format (SQLite + Markdown)
- Exportable so founders can share findings with mentors or the operating lead
- No SaaS subscription required — fully self-contained

## Phase 3: Early Traction (Months 17–24)

### Requirements
- **MVP planning tool**: Break down the solution into a minimum viable product with a
  prioritized feature backlog
- **Traction dashboard**: Track key metrics (user signups, engagement, revenue signals)
  with AI-generated insights
- **Milestone planner**: 4-week sprint planning with evidence checkpoints for the
  Spring 2028 building decision
- **Pitch deck generator**: AI-assisted creation of investor pitch decks from canvas +
  traction data

### Non-functional requirements
- Must produce evidence-gated outputs that satisfy the Spring 2028 building decision
- All data exportable for Commerce replicability audit
- Dashboard must work offline with cached data

## Cross-Phase Non-Functional Requirements

### Laptop-only constraint
- The entire toolkit must run on a laptop with no external server or cloud dependency
  for core functionality. Local LLM via Ollama (qwen3-coder:30b) for compute; cloud
  APIs used only as optional rate-limited fallback for non-blocking enrichment.

### No server setup
- Install via `pip install ardmore-thinkspace` or portable binary download.
- Web preview (if any) binds to 127.0.0.1 only — no external network exposure.
- All persistent data stored in a local SQLite database within the project directory.

### Non-technical founder usability
- Menu-driven terminal UI with clear numbered options
- Plain-language labels for all features (no jargon without explanation)
- "Suggest" buttons use AI to auto-fill based on prior entries
- Undo/redo for all edits
- Built-in help text and examples at every step

### Handoff-able
- All data stored as portable SQLite + Markdown files
- Entire project directory can be zipped and moved to another machine
- No dependency on a specific user account or cloud service
- Configuration is project-relative, not system-relative

### Productizable as ThinkSpace-in-a-box
- Published as open-source package on PyPI (`ardmore-thinkspace`)
- Install instructions: `pip install ardmore-thinkspace` (2 lines)
- Templates shipped as bundled YAML/Markdown with YAML frontmatter
- Community template support via simple plugin directory
- Full CLI help (`--help` on every command) serves as documentation

### Budget alignment
- Maps to the $180k programming/founder sprint budget line
- Complements the $100k tools & playbooks line (productized toolkit)
- Supports the $120k outreach & storytelling line (positioning materials)
