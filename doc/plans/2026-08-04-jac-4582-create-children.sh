#!/bin/bash
set -e

api="${PAPERCLIP_API_URL%/}/api"
parent_id="5efd99be-d4a4-454d-a0c8-0767da468988"

create_child() {
  local title="$1"
  local desc="$2"
  local result=$(curl -sS -X POST "$api/issues/$parent_id/children" \
    -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
    -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
    -H "Content-Type: application/json" \
    -d "{\"title\": $(printf '%s' "$title" | jq -Rs .), \"description\": $(printf '%s' "$desc" | jq -Rs .), \"workMode\": \"planning\"}")
  echo "$result" | jq -c '{id, identifier, title, status}'
}

# JAC-4582.A — Outreach sub-epic (hermes-83hq.2)
create_child "JAC-4582.A: Outreach — ADA + Chamber AI ThinkSpace pilot (hermes-83hq.2)" \
  "Beads child: notes-jclol.1 (hermes-83hq.2). Compose and send outreach email introducing the AI-powered ThinkSpace pilot to Bill Murphy (ADA President) and Chamber President. Covers \$1M ADA entrepreneurship pivot context, \$120k outreach budget line, 30-min meeting request. Depends on A.1 and A.2."

# JAC-4582.A.1 — Draft email to Bill Murphy
create_child "JAC-4582.A.1: Draft outreach email to Bill Murphy, ADA (hermes-83hq.2.1)" \
  "Beads child: notes-jclol.1.1 (hermes-83hq.2.1). Research ADA contact info for Bill Murphy. Draft email: intro Jack Reis + AI services business; reference \$1M ADA entrepreneurship pivot (CORI strategy, approved 2026-07); position ThinkSpace as evidence-gated pilot; highlight \$120k outreach & storytelling budget; request 30-min meeting. Depends on JAC-4582.A."

# JAC-4582.A.2 — Draft email to Chamber President
create_child "JAC-4582.A.2: Draft outreach email to Chamber President (hermes-83hq.2.2)" \
  "Beads child: notes-jclol.1.2 (hermes-83hq.2.2). Draft email to Chamber President: position as coordination partner (not competing with ADA); reference \$180k programming/founder sprint budget; request joint meeting with ADA to align on AI pilot scope; respect light-structure and handoff-able constraint. Depends on JAC-4582.A. Blocks A.3."

# JAC-4582.A.3 — Send emails + schedule meeting
create_child "JAC-4582.A.3: Send outreach emails + schedule joint ADA/Chamber meeting (hermes-83hq.2.3)" \
  "Beads child: notes-jclol.1.3 (hermes-83hq.2.3). Send both outreach emails (Bill Murphy at ADA and Chamber President) and request a 30-min joint introductory meeting. Must confirm delivery and document responses. Depends on A.1 and A.2 drafts. Requires Jack review before sending."

# JAC-4582.B — Founder-sprint toolkit (hermes-83hq.3)
create_child "JAC-4582.B: Founder-sprint AI toolkit prototype (hermes-83hq.3)" \
  "Beads child: notes-jclol.2 (hermes-83hq.3). Build AI toolkit prototype for 4-week founder sprint: lightweight AI assistant for market research, template-driven BMC generator, simple progress tracker with evidence gates. Runs on laptop, no server setup, usable by non-technical founders. Maps to \$180k programming budget. Depends on B.1."

# JAC-4582.B.1 — Toolkit scope/requirements
create_child "JAC-4582.B.1: Define toolkit scope and requirements (hermes-83hq.3.1)" \
  "Beads child: notes-jclol.2.1 (hermes-83hq.3.1). Map toolkit to ADA three-phase model: ideation/validation, customer discovery, early traction. Specify laptop-only, no server, non-technical founders, productizable. Reference \$180k programming/founder sprint budget line. Depends on JAC-4582.B."

# JAC-4582.B.2 — Build toolkit components
create_child "JAC-4582.B.2: Build toolkit components (hermes-83hq.3.2)" \
  "Beads child: notes-jclol.2.2 (hermes-83hq.3.2). Build: (1) lightweight AI assistant for market research — customer interviews, competitor analysis; (2) template-driven business model canvas generator. Both must run on laptop, no server, usable by non-technical founders. Depends on B.1."

# JAC-4582.B.3 — Build progress tracker + demo
create_child "JAC-4582.B.3: Build progress tracker + demo toolkit (hermes-83hq.3.3)" \
  "Beads child: notes-jclol.2.3 (hermes-83hq.3.3). Build simple progress tracker with evidence gates and demo complete toolkit against realistic 4-week founder sprint scenario. Depends on B.2."

# JAC-4582.C — Stakeholder + cadence tracker (hermes-83hq.5)
create_child "JAC-4582.C: Stakeholder + cadence tracker (hermes-83hq.5)" \
  "Beads child: notes-jclol.3 (hermes-83hq.5). Create living stakeholder and cadence tracker: advisory committee map, communication schedule, decision gates. Dependencies: Bill Murphy (ADA), Chamber President, CORI, OK Dept. of Commerce, REI Oklahoma, SBDCs. Depends on C.1."

# JAC-4582.C.1 — Stakeholder map
create_child "JAC-4582.C.1: Create stakeholder map (hermes-83hq.5.1)" \
  "Beads child: notes-jclol.3.1 (hermes-83hq.5.1). Living stakeholder map: Bill Murphy (ADA), Chamber President, CORI, OK Dept. of Commerce, REI Oklahoma, SBDCs. For each: role, public contact info, influence level, status (engaged/pending/not-contacted). Public sources only, no secrets. Depends on JAC-4582.C."

# JAC-4582.C.2 — Communication cadence + decision gates
create_child "JAC-4582.C.2: Communication cadence + decision gates tracker (hermes-83hq.5.2)" \
  "Beads child: notes-jclol.3.2 (hermes-83hq.5.2). Define communication cadence (weekly check-in, monthly report, milestone gates) and decision gates (Commerce amendment, operating lead hire, Spring 2028 building decision) with evidence requirements. Dependency links to other hermes-83hq subtasks. Depends on C.1."

echo "=== All child issues created ==="
