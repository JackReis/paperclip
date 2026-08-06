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
}

function countLabel(count: number): string {
  return count === 1 ? "(1 agent)" : `(${count} agents)`;
}

function formatGroups(groups: string[]): string {
  return groups.map((g) => pc.cyan(g)).join(", ") || "(none)";
}
