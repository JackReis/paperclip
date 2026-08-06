import { Command } from "commander";
import pc from "picocolors";
import {
  addCommonClientOptions,
  apiPath,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";
import type { AgentFolder, AgentFolderListResult } from "@paperclipai/shared";

/**
 * CLI options for `paperclipai folder migrate-from-flat`.
 */
interface FolderMigrateFromFlatOptions extends BaseClientOptions {
  dryRun?: boolean;
  groupBy?: "role" | string;
}

/**
 * CLI options for `paperclipai folder validate-inheritance`.
 */
interface FolderValidateInheritanceOptions extends BaseClientOptions {}

interface FolderMigrateToFolderOptions extends BaseClientOptions {
  folderName?: string;
  agentIds?: string;
  dryRun?: boolean;
}

/**
 * CLI options for `paperclipai folder list`.
 */
interface FolderListOptions extends BaseClientOptions {}

/**
 * Result from the server-side migration-preview endpoint.
 */
interface UnassignedSummary {
  total: number;
  roleGroups: Record<string, number>;
}

/**
 * Result from the server-side validate-inheritance endpoint.
 */
interface InheritanceValidationResult {
  totalAgents: number;
  agentsInFolders: number;
  agentsUnassigned: number;
  brokenFolderReferences: Array<{
    agentId: string;
    agentName: string;
    folderId: string;
    reason: string;
  }>;
  brokenFolderChains: Array<{
    folderId: string;
    folderName: string;
    reason: string;
  }>;
  folderCycles: Array<{
    folderId: string;
    chain: string[];
  }>;
  missingFolderInstructions: Array<{
    agentId: string;
    agentName: string;
    folderId: string;
    folderName: string;
    instructionsDir: string;
  }>;
  conflictingExternalFolderInstructions: Array<{
    agentId: string;
    agentName: string;
    folderId: string;
    folderName: string;
  }>;
  misalignedInstructionsRoots: Array<{
    agentId: string;
    agentName: string;
    folderId: string;
    folderName: string;
    configuredRoot: string;
    expectedRoot: string;
  }>;
  issueCount: number;
}

/**
 * Register the `folder` command group on the CLI.
 *
 * Provides:
 *   paperclipai folder list                          — list agent folders for a company
 *   paperclipai folder migrate-from-flat             — migrate flat agents into folders (role-based)
 *   paperclipai folder migrate-from-flat --dry-run   — preview proposed migration
 *   paperclipai folder validate-inheritance           — validate folder inheritance chain
 */
export function registerFolderCommands(program: Command): void {
  const folder = program
    .command("folder")
    .description("Agent folder operations (hierarchical agent folders)");

  // ── folder list ──────────────────────────────────────────────

  addCommonClientOptions(
    folder
      .command("list")
      .description("List agent folders for a company")
      .option("-C, --company-id <id>", "Company ID")
      .action(async (opts: FolderListOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const rows = (await ctx.api.get<{
            folders: Array<Record<string, unknown>>;
            totalCount: number;
          }>(apiPath`/api/companies/${ctx.companyId}/agent-folders`)) ?? { folders: [], totalCount: 0 };

          if (ctx.json) {
            printOutput(rows, { json: true });
            return;
          }

          if (rows.folders.length === 0) {
            console.log(pc.dim("(no agent folders)"));
            return;
          }

          for (const f of rows.folders) {
            console.log(formatInlineRecord(f));
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // ── folder migrate-from-flat ───────────────────────────────────

  addCommonClientOptions(
    folder
      .command("migrate-from-flat")
      .description(
        "Migrate flat (unassigned) agents into folders. " +
          "Groups by role (default) or a metadata key. Use --dry-run to preview.",
      )
      .option("-C, --company-id <id>", "Company ID")
      .option("--dry-run", "Show proposed migration without making changes")
      .option("--group-by <key>", "Group by 'role' (default) or a metadata key", "role")
      .action(async (opts: FolderMigrateFromFlatOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });

          if (opts.dryRun) {
            // Preview: fetch unassigned agents summary
            const summary = (await ctx.api.get<UnassignedSummary>(
              apiPath`/api/companies/${ctx.companyId}/folders/migration-preview`,
            )) ?? { total: 0, roleGroups: {} };

            if (ctx.json) {
              printOutput(summary, { json: true });
              return;
            }

            console.log(pc.bold("Migration Preview (dry-run)"));
            console.log(pc.dim("No changes will be made.\n"));

            if (summary.total === 0) {
              console.log(pc.green("All agents already have folders — nothing to migrate."));
              return;
            }

            console.log(pc.bold(`Total flat agents: ${summary.total}`));
            console.log(pc.bold("Proposed groups by role:"));
            for (const [role, count] of Object.entries(summary.roleGroups)) {
              console.log(`  ${pc.cyan(role)} ${pc.dim(`(${count} agents)`)}`);
            }

            const groups = Object.keys(summary.roleGroups);
            console.log(pc.yellow(`\nWould create ${groups.length} folder(s):`));
            for (const g of groups) {
              console.log(`  ${pc.cyan(g.toLowerCase().replace(/[^a-z0-9]+/g, "-"))} → ${countLabel(summary.roleGroups[g])}`);
            }
          } else {
            const result = await ctx.api.post<{
              totalUnassigned: number;
              groupsCreated: string[];
              foldersCreated: string[];
              foldersReused: number;
            }>(
              opts.groupBy && opts.groupBy !== "role"
                ? apiPath`/api/companies/${ctx.companyId}/folders/migrate-by-metadata`
                : apiPath`/api/companies/${ctx.companyId}/folders/migrate-by-role`,
              opts.groupBy && opts.groupBy !== "role" ? { key: opts.groupBy } : undefined,
            );

            if (ctx.json) {
              printOutput(result, { json: true });
              return;
            }

            if (result && result.foldersCreated.length > 0) {
              console.log(pc.green("Migration complete."));
              console.log(`  Groups created: ${formatGroups(result.groupsCreated)}`);
              console.log(`  Folders created: ${result.foldersCreated.length}`);
              console.log(`  Folders reused: ${result.foldersReused}`);
            } else if (result && result.totalUnassigned === 0) {
              console.log(pc.green("All agents already have folders — nothing to migrate."));
            } else {
              console.log(pc.yellow("Migration completed with no new folders created."));
              if (result) {
                console.log(`  Agents covered: ${result.totalUnassigned}`);
                console.log(`  Folders reused: ${result.foldersReused}`);
              }
            }
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // ── folder validate-inheritance ──────────────────────────────

  addCommonClientOptions(
    folder
      .command("validate-inheritance")
      .description("Validate the agent-folder inheritance chain (broken refs, cycles, missing instructions)")
      .option("-C, --company-id <id>", "Company ID")
      .action(async (opts: FolderValidateInheritanceOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const result = await ctx.api.get<InheritanceValidationResult>(
            apiPath`/api/companies/${ctx.companyId}/folders/validate-inheritance`,
          );

          if (ctx.json || !result) {
            printOutput(result, { json: true });
            return;
          }

          if (result.issueCount === 0) {
            console.log(
              pc.green(
                `✓ Inheritance chain is valid — ${result.totalAgents} agent(s), ` +
                  `${result.agentsInFolders} in folders, ${result.agentsUnassigned} flat.`,
              ),
            );
            return;
          }

          console.log(
            pc.red(`✗ Found ${result.issueCount} inheritance issue(s):\n`),
          );

          if (result.brokenFolderReferences.length > 0) {
            console.log(pc.bold("Broken folder references (agents pointing to non-existent folders):"));
            for (const r of result.brokenFolderReferences) {
              console.log(`  ${pc.red(r.agentName)} (${r.agentId}) → folder ${r.folderId}`);
            }
            console.log();
          }

          if (result.brokenFolderChains.length > 0) {
            console.log(pc.bold("Broken folder chains (missing parents or cycles):"));
            for (const c of result.brokenFolderChains) {
              console.log(`  ${pc.red(c.folderName)} (${c.folderId}) — ${c.reason}`);
            }
            console.log();
          }

          if (result.folderCycles.length > 0) {
            console.log(pc.bold("Folder hierarchy cycles:"));
            for (const c of result.folderCycles) {
              console.log(`  ${pc.red(c.folderId)} cycle: ${c.chain.join(" → ")}`);
            }
            console.log();
          }

          if (result.missingFolderInstructions.length > 0) {
            console.log(pc.bold("Missing folder-level instructions (AGENTS.md):"));
            for (const m of result.missingFolderInstructions) {
              console.log(`  ${m.agentName} → ${m.folderName} at ${m.instructionsDir}`);
            }
            console.log();
          }

          if (result.conflictingExternalFolderInstructions.length > 0) {
            console.log(pc.bold("Conflicting external + folder instructions:"));
            for (const c of result.conflictingExternalFolderInstructions) {
              console.log(`  ${c.agentName} (${c.agentId}) → ${c.folderName}`);
            }
            console.log();
          }

          if (result.misalignedInstructionsRoots.length > 0) {
            console.log(pc.bold("Misaligned instructions roots:"));
            for (const m of result.misalignedInstructionsRoots) {
              console.log(`  ${m.agentName} → configured: ${m.configuredRoot}`);
              console.log(`         expected: ${m.expectedRoot}`);
            }
            console.log();
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // ── folder migrate-to-folder ───────────────────────────────────

  addCommonClientOptions(
    folder
      .command("migrate-to-folder")
      .description(
        "Migrate a specific list of flat agents into a named folder. " +
          "Use --dry-run to preview without changes.",
      )
      .option("-C, --company-id <id>", "Company ID")
      .option("--dry-run", "Show proposed migration without making changes")
      .requiredOption("--folder-name <name>", "Target folder name")
      .requiredOption("--agent-ids <csv>", "Comma-separated list of agent IDs")
      .action(async (opts: FolderMigrateToFolderOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const agentIds = opts.agentIds!.split(",").map((s) => s.trim()).filter(Boolean);

          if (opts.dryRun) {
            if (ctx.json) {
              printOutput(
                { folderName: opts.folderName, agentCount: agentIds.length, agentIds },
                { json: true },
              );
              return;
            }
            console.log(pc.bold("Migration Preview (dry-run)"));
            console.log(pc.dim("No changes will be made.\n"));
            console.log(pc.bold(`Target folder: ${pc.cyan(opts.folderName!)}`));
            console.log(pc.bold(`Agents to migrate: ${agentIds.length}`));
            for (const id of agentIds) {
              console.log(`  ${pc.cyan(id)}`);
            }
          } else {
            const result = await ctx.api.post<{
              totalUnassigned: number;
              groupsCreated: string[];
              foldersCreated: string[];
              foldersReused: number;
            }>(apiPath`/api/companies/${ctx.companyId}/folders/migrate-to-folder`, {
              folderName: opts.folderName,
              agentIds,
            });

            if (ctx.json) {
              printOutput(result, { json: true });
              return;
            }

            if (result && result.foldersCreated.length > 0) {
              console.log(pc.green("Migration complete."));
              console.log(`  Folder created: ${formatGroups(result.foldersCreated)}`);
              console.log(`  Agents covered: ${result.totalUnassigned}`);
            } else {
              console.log(pc.yellow("Migration completed with no new folders created."));
              if (result) {
                console.log(`  Agents covered: ${result.totalUnassigned}`);
                console.log(`  Folders reused: ${result.foldersReused}`);
              }
            }
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // ── folder unassign ─────────────────────────────────────────────

  addCommonClientOptions(
    folder
      .command("unassign")
      .description(
        "Remove agents from their folders (rollback: set folder_id to NULL). " +
          "Accepts agent IDs or the special value 'all' to unassign all agents in a folder.",
      )
      .option("-C, --company-id <id>", "Company ID")
      .requiredOption("--agent-ids <csv>", "Comma-separated list of agent IDs (or 'all')")
      .action(async (opts: FolderMigrateToFolderOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const agentIds = opts.agentIds!
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          if (ctx.json) {
            printOutput({ companyId: ctx.companyId, agentIds, count: agentIds.length }, { json: true });
            return;
          }

          let successCount = 0;
          let errorCount = 0;
          for (const agentId of agentIds) {
            try {
              await ctx.api.post(apiPath`/api/companies/${ctx.companyId}/agent-folders/agents/${agentId}/move`, {
                folderId: null,
              });
              successCount++;
            } catch (err) {
              errorCount++;
              console.error(pc.red(`Failed to unassign agent ${agentId}: ${err instanceof Error ? err.message : String(err)}`));
            }
          }

          if (errorCount === 0) {
            console.log(
              pc.green(`✓ Unassigned ${successCount} agent(s) from folders (rollback complete).`),
            );
          } else {
            console.log(
              pc.yellow(
                `Unassigned ${successCount} agent(s) with ${errorCount} error(s).`,
              ),
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // ── folder create ──────────────────────────────────────────────

  addCommonClientOptions(
    folder
      .command("create")
      .description("Create a new agent folder within a company")
      .option("-C, --company-id <id>", "Company ID")
      .requiredOption("-n, --name <name>", "Folder name")
      .option("-p, --parent-id <id>", "Parent folder ID (omit for root-level)")
      .option("-s, --slug <slug>", "URL-safe slug (auto-derived from name if omitted)")
      .option("-m, --metadata <json>", "Folder metadata as a JSON object")
      .option("--sort-order <n>", "Sort order (integer)", (v) => Number(v), undefined)
      .action(async (opts: FolderCreateOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const body: Record<string, unknown> = { name: opts.name };
          if (opts.parentId) body.parentId = opts.parentId;
          if (opts.slug) body.slug = opts.slug;
          if (opts.metadata) {
            body.metadata = JSON.parse(opts.metadata);
          }
          if (opts.sortOrder !== undefined) body.sortOrder = opts.sortOrder;
          const created = await ctx.api.post<AgentFolder>(
            apiPath`/api/companies/${ctx.companyId}/agent-folders`,
            body,
          );
          printOutput(created, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // ── folder get ─────────────────────────────────────────────────

  addCommonClientOptions(
    folder
      .command("get")
      .description("Retrieve a single agent folder by ID")
      .argument("<folderId>", "Folder ID")
      .option("-C, --company-id <id>", "Company ID")
      .action(async (folderId: string, opts: FolderGetOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const folder = await ctx.api.get<AgentFolder | null>(
            apiPath`/api/companies/${ctx.companyId}/agent-folders/${folderId}`,
          );
          if (!folder) {
            if (ctx.json) {
              printOutput({ error: "Folder not found" }, { json: true });
              return;
            }
            console.log(pc.red(`Folder not found: ${folderId}`));
            return;
          }
          printOutput(folder, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // ── folder update ──────────────────────────────────────────────

  addCommonClientOptions(
    folder
      .command("update")
      .description("Update an agent folder's fields")
      .argument("<folderId>", "Folder ID")
      .option("-C, --company-id <id>", "Company ID")
      .option("-n, --name <name>", "New folder name")
      .option("-p, --parent-id <id>", "New parent folder ID (use 'null' to make root-level)")
      .option("-s, --slug <slug>", "New URL-safe slug")
      .option("-m, --metadata <json>", "Replace folder metadata (JSON object)")
      .option("--sort-order <n>", "New sort order (integer)", (v) => Number(v), undefined)
      .action(async (folderId: string, opts: FolderUpdateOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const body: Record<string, unknown> = {};
          if (opts.name) body.name = opts.name;
          if (opts.parentId !== undefined) body.parentId = opts.parentId === "null" ? null : opts.parentId;
          if (opts.slug !== undefined) body.slug = opts.slug;
          if (opts.metadata !== undefined) body.metadata = JSON.parse(opts.metadata);
          if (opts.sortOrder !== undefined) body.sortOrder = opts.sortOrder;
          const updated = await ctx.api.patch<AgentFolder>(
            apiPath`/api/companies/${ctx.companyId}/agent-folders/${folderId}`,
            body,
          );
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // ── folder move ────────────────────────────────────────────────
  // Moves a folder under a new parent (or to root). Uses the server
  // /move endpoint which enforces cycle detection + sort order.

  addCommonClientOptions(
    folder
      .command("move")
      .description("Move a folder to a new parent (or to root)")
      .argument("<folderId>", "Folder ID")
      .option("-C, --company-id <id>", "Company ID")
      .option("-p, --parent-id <id>", "New parent folder ID (use 'null' to make root-level)")
      .option("--sort-order <n>", "New sort order within the parent (integer)", (v) => Number(v), undefined)
      .action(async (folderId: string, opts: FolderMoveOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const body: Record<string, unknown> = {};
          if (opts.parentId !== undefined) body.parentId = opts.parentId === "null" ? null : opts.parentId;
          if (opts.sortOrder !== undefined) body.sortOrder = opts.sortOrder;
          const moved = await ctx.api.post<AgentFolder>(
            apiPath`/api/companies/${ctx.companyId}/agent-folders/${folderId}/move`,
            body,
          );
          printOutput(moved, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // ── folder delete ──────────────────────────────────────────────

  addCommonClientOptions(
    folder
      .command("delete")
      .description(
        "Delete an agent folder. Refuses to delete folders with children " +
          "unless --force is given (which deletes children first).",
      )
      .argument("<folderId>", "Folder ID")
      .option("-C, --company-id <id>", "Company ID")
      .option("--force", "Delete child folders first (recursive)")
      .action(async (folderId: string, opts: FolderDeleteOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          if (opts.force) {
            // Recursively delete descendants depth-first so leaf folders are
            // deleted before their parents (the server rejects deleting a
            // folder that still has children).
            await deleteTree(ctx, ctx.companyId!, folderId);
          } else {
            await ctx.api.delete(
              apiPath`/api/companies/${ctx.companyId}/agent-folders/${folderId}`,
            );
          }
          if (ctx.json) {
            printOutput({ deleted: true, folderId, companyId: ctx.companyId, force: opts.force }, { json: true });
            return;
          }
          console.log(
            pc.green(`✓ Deleted folder ${pc.cyan(folderId)}${opts.force ? " (and all descendants)" : ""}.`),
          );
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // ── folder agents ──────────────────────────────────────────────

  addCommonClientOptions(
    folder
      .command("agents")
      .description("List agents assigned to a folder")
      .argument("<folderId>", "Folder ID")
      .option("-C, --company-id <id>", "Company ID")
      .option("-r, --recursive", "Include agents from all descendant folders")
      .action(async (folderId: string, opts: FolderAgentsOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const query = new URLSearchParams();
          if (opts.recursive) query.set("recursive", "true");
          const agents =
            (await ctx.api.get<FolderAgent[]>(
              apiPath`/api/companies/${ctx.companyId}/agent-folders/${folderId}/agents` +
                `?${query.toString()}`,
            )) ?? [];

          if (ctx.json) {
            printOutput(agents, { json: true });
            return;
          }

          if (agents.length === 0) {
            console.log(pc.dim("(no agents in this folder)"));
            return;
          }
          for (const a of agents) {
            console.log(formatInlineRecord(a as unknown as Record<string, unknown>));
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // ── folder instructions-bundle ─────────────────────────────────
  // Prints the merged instruction bundle for a folder: the folder-level
  // AGENTS.md plus any inherited parent instructions, walked leaf→root.
  // This is the folder-scope analogue of `agent instructions-bundle`.

  addCommonClientOptions(
    folder
      .command("instructions-bundle")
      .description(
        "Print the merged folder-level instruction bundle (this folder's " +
          "AGENTS.md, walked up the parent chain. No --path: the folder-level bundle root).",
      )
      .argument("<folderId>", "Folder ID")
      .option("-C, --company-id <id>", "Company ID")
      .option("--path <path>", "Read a specific file from the bundle (default: AGENTS.md)")
      .action(async (folderId: string, opts: FolderInstructionsBundleOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const result = await ctx.api.get<FolderInstructionsBundle>(
            apiPath`/api/companies/${ctx.companyId}/agent-folders/${folderId}/instructions-bundle` +
              (opts.path ? `?path=${encodeURIComponent(opts.path)}` : ""),
          );
          if (ctx.json) {
            printOutput(result, { json: true });
            return;
          }
          if (!result) {
            console.log(pc.dim("(no instructions bundle for this folder)"));
            return;
          }
          if (result.content) {
            console.log(pc.bold(`# ${result.folderName} (folder ${result.folderId})`));
            if (result.inherited && result.inherited.length > 0) {
              console.log(pc.dim(`// inherited from ${result.inherited.length} ancestor folder(s)`));
            }
            console.log("");
            process.stdout.write(result.content);
          } else {
            console.log(pc.dim(`(no ${opts.path ?? "AGENTS.md"} in this folder)`));
            if (result.inherited && result.inherited.length > 0) {
              for (const inh of result.inherited) {
                if (inh.content) {
                  console.log(pc.bold(`
# ${inh.folderName}`));
                  process.stdout.write(inh.content);
                  console.log("");
                }
              }
            }
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );
}

async function deleteTree(ctx: ReturnType<typeof resolveCommandContext>, companyId: string, folderId: string): Promise<void> {
  // Fetch children, recurse, then delete self.
  const children = (await ctx.api.get<AgentFolderListResult>(
    apiPath`/api/companies/${companyId}/agent-folders` + `?parentId=${folderId}`,
  )) ?? { folders: [], totalCount: 0 };
  // The list endpoint returns all folders for the company; filter client-side
  // for direct children of this folder.
  const direct = children.folders.filter((f) => f.parentId === folderId);
  direct.sort((a, b) => a.sortOrder - b.sortOrder);
  for (const child of direct) {
    await deleteTree(ctx, companyId, child.id);
  }
  await ctx.api.delete(apiPath`/api/companies/${companyId}/agent-folders/${folderId}`);
}

interface FolderCreateOptions extends BaseClientOptions {
  name?: string;
  parentId?: string;
  slug?: string;
  metadata?: string;
  sortOrder?: number;
}

interface FolderGetOptions extends BaseClientOptions {}

interface FolderUpdateOptions extends BaseClientOptions {
  name?: string;
  parentId?: string;
  slug?: string;
  metadata?: string;
  sortOrder?: number;
}

interface FolderMoveOptions extends BaseClientOptions {
  parentId?: string;
  sortOrder?: number;
}

interface FolderDeleteOptions extends BaseClientOptions {
  force?: boolean;
}

interface FolderAgentsOptions extends BaseClientOptions {
  recursive?: boolean;
}

interface FolderInstructionsBundleOptions extends BaseClientOptions {
  path?: string;
}

interface FolderAgent {
  id: string;
  name: string;
  adapterType: string;
  status: string;
  folderId: string | null;
}

interface FolderInstructionsBundle {
  folderId: string;
  folderName: string;
  content: string | null;
  inherited: Array<{
    folderId: string;
    folderName: string;
    content: string | null;
  }>;
}

function countLabel(count: number): string {
  return count === 1 ? "(1 agent)" : `(${count} agents)`;
}

function formatGroups(groups: string[]): string {
  return groups.map((g) => pc.cyan(g)).join(", ") || "(none)";
}
