import fs from "node:fs/promises";
import path from "node:path";
import { resolvePaperclipInstanceRoot } from "../home-paths.js";

export interface AgentLikeForInheritance {
  id: string;
  companyId: string;
  name: string;
  adapterConfig: Record<string, unknown>;
  folderId: string | null;
}

/**
 * Server-side helper for the agent folder inheritance disk layout.
 *
 * Folder-level shared instructions live at:
 *   <instanceRoot>/companies/<companyId>/folders/<folderId>/instructions/
 *
 * Agents with folder-specific overrides get a pointer file under their folder's
 * instructions directory:
 *   .../folders/<folderId>/instructions/<agentId>.md
 *
 * Agents without overrides use a pure-DB pointer (folderId on the agent row)
 * and need no file beyond the folder-level AGENTS.md instruction bundle.
 *
 * This module is adapter-agnostic: it only touches the Paperclip instance root
 * and does not require DB access.
 */

const INSTRUCTIONS_DIR = "instructions";
const AGENTS_ENTRY = "AGENTS.md";

/**
 * Resolve the instructions directory for a given folder.
 * Path: <instanceRoot>/companies/<companyId>/folders/<folderId>/instructions/
 */
export function resolveFolderInstructionsDir(companyId: string, folderId: string): string {
  return path.resolve(
    resolvePaperclipInstanceRoot(),
    "companies",
    companyId,
    "folders",
    folderId,
    INSTRUCTIONS_DIR,
  );
}

/**
 * Write a pointer file recording that an agent is filed under a folder.
 *
 * For an agent with a folder-specific override (a non-null override content
 * passed in `options.overrideInstructions`), the pointer file contains the
 * agent-specific instructions so the inheritance resolver can layer them on
 * top of the folder-level bundle.
 *
 * For agents with no override, the pointer file is a tiny marker that the
 * agent inherits folder instructions verbatim (pure-DB pointer on the agent
 * row is the source of truth; this file is just a durable, inspectable record).
 *
 * Idempotent: repeated writes with unchanged content do not rewrite the file.
 */
export async function writeAgentFolderPointerFile(
  agent: AgentLikeForInheritance,
  folderId: string,
  options: { overrideInstructions?: string } = {},
): Promise<string> {
  const dir = resolveFolderInstructionsDir(agent.companyId, folderId);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${agent.id}.md`);

  if (options.overrideInstructions && options.overrideInstructions.trim().length > 0) {
    const body = options.overrideInstructions.trim() + "\n";
    try {
      await fs.writeFile(filePath, body, "utf-8");
    } catch (err) {
      throw err;
    }
    return filePath;
  }

  // Zero-override marker: the agent inherits folder instructions from the DB
  // pointer only. Write a small marker so the file tree is inspectable.
  const marker =
    `<!-- agent: ${agent.name} (${agent.id}) -->
<!-- This agent is filed under folder ${folderId} and has no local override; it inherits the folder-level shared instructions from AGENTS.md in this directory. -->
<!-- Override: remove this marker file and add agent-specific content to give this agent a local override. -->`;
  let existing: string | null = null;
  try {
    existing = await fs.readFile(filePath, "utf-8");
  } catch {
    existing = null;
  }
  if (existing === marker) return filePath;
  await fs.writeFile(filePath, marker, "utf-8");
  return filePath;
}

/**
 * Remove an agent's pointer file (e.g. on unassign). Non-fatal if absent.
 */
export async function removeAgentFolderPointerFile(
  companyId: string,
  folderId: string,
  agentId: string,
): Promise<void> {
  const filePath = path.join(
    resolveFolderInstructionsDir(companyId, folderId),
    `${agentId}.md`,
  );
  await fs.rm(filePath, { force: true }).catch(() => undefined);
}
