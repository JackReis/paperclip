/**
 * Linear GraphQL API client with rate-limit handling and exponential backoff.
 *
 * All operations are read-only from Paperclip's perspective — we only push
 * to Linear (create/update labels, epics, issues). We never read from Linear
 * to mutate Paperclip state.
 */

const LINEAR_API_URL = "https://api.linear.app/graphql";

export interface LinearLabel {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description: string | null;
}

export interface LinearCycle {
  id: string;
  number: number;
  name: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  labels: LinearLabel[];
  projects: LinearProject[];
}

/**
 * Goal status → Linear label color mapping.
 * Linear uses hex colors for labels.
 */
const GOAL_STATUS_COLORS: Record<string, string> = {
  planned: "#e2e2e2",   // gray — planned, not yet started
  active: "#4a89dc",    // blue — actively being worked on
  achieved: "#2ecc71",   // green — goal achieved
};

/**
 * Goal priority → Linear label color.
 * Higher priority = warmer color.
 */
const GOAL_PRIORITY_COLORS: Record<string, string> = {
  low: "#b0b0b0",
  medium: "#f39c12",
  high: "#e74c3c",
  urgent: "#c0392b",
};

/**
 * Paperclip entity level → Linear entity type.
 */
const GOAL_LEVEL_MAP: Record<string, string> = {
  company: "initiative",
  project: "epic",
  task: "issue",
};

/**
 * Exponential backoff helper.
 * Waits min(2^attempt * 1000, 30000) ms, with jitter.
 */
async function backoff(attempt: number): Promise<void> {
  const base = Math.min(Math.pow(2, attempt) * 1000, 30_000);
  const jitter = Math.random() * 500;
  await new Promise((resolve) => setTimeout(resolve, base + jitter));
}

export class LinearClient {
  private readonly apiToken: string;
  private readonly teamId: string;

  constructor(apiToken: string, teamId: string) {
    this.apiToken = apiToken;
    this.teamId = teamId;
  }

  /**
   * Execute a GraphQL mutation/query against Linear with rate-limit handling.
   * Retries on 429 and 5xx with exponential backoff.
   */
  private async gql<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
    maxRetries = 5,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(LINEAR_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({ query, variables }),
        });

        if (response.status === 429) {
          // Rate limited — backoff and retry
          lastError = new Error("Linear API rate limited (429)");
          if (attempt < maxRetries - 1) {
            await backoff(attempt);
            continue;
          }
          break;
        }

        if (response.status >= 500) {
          // Server error — backoff and retry
          lastError = new Error(`Linear server error (${response.status})`);
          if (attempt < maxRetries - 1) {
            await backoff(attempt);
            continue;
          }
          break;
        }

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Linear API error (${response.status}): ${text}`);
        }

        const json = await response.json() as { data?: T; errors?: Array<{ message: string }> };

        if (json.errors && json.errors.length > 0) {
          throw new Error(`Linear GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`);
        }

        return json.data as T;
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxRetries - 1 && !(err instanceof SyntaxError)) {
          await backoff(attempt);
          continue;
        }
        throw err;
      }
    }

    throw lastError ?? new Error("Linear API request failed after retries");
  }

  /**
   * Fetch the current team state — existing labels and projects.
   */
  async getTeamState(): Promise<LinearTeam> {
    const query = `
      query TeamState($teamId: String!) {
        team(id: $teamId) {
          id
          name
          labels(first: 100) {
            nodes {
              id
              name
              description
              color
            }
          }
          projects(first: 50) {
            nodes {
              id
              name
              description
            }
          }
        }
      }
    `;

    type TeamQueryResult = {
      team: {
        id: string;
        name: string;
        labels: { nodes: LinearLabel[] };
        projects: { nodes: LinearProject[] };
      };
    };

    const result = await this.gql<TeamQueryResult>(query, { teamId: this.teamId });

    return {
      id: result.team.id,
      name: result.team.name,
      labels: result.team.labels.nodes ?? [],
      projects: result.team.projects.nodes ?? [],
    };
  }

  /**
   * Create a Linear label. Idempotent — checks existing labels by name first.
   */
  async createLabel(input: {
    name: string;
    description?: string;
    color: string;
  }): Promise<LinearLabel> {
    const mutation = `
      mutation CreateLabel($input: LabelCreateInput!) {
        labelCreate(input: $input) {
          label {
            id
            name
            description
            color
          }
        }
      }
    `;

    type CreateResult = {
      labelCreate: { label: LinearLabel };
    };

    const result = await this.gql<CreateResult>(mutation, {
      input: {
        name: input.name,
        description: input.description ?? null,
        color: input.color,
        teamId: this.teamId,
      },
    });

    return result.labelCreate.label;
  }

  /**
   * Update a Linear label.
   */
  async updateLabel(labelId: string, input: {
    name?: string;
    description?: string;
    color?: string;
  }): Promise<LinearLabel> {
    const mutation = `
      mutation UpdateLabel($input: LabelUpdateInput!) {
        labelUpdate(input: $input) {
          label {
            id
            name
            description
            color
          }
        }
      }
    `;

    type UpdateResult = {
      labelUpdate: { label: LinearLabel };
    };

    const result = await this.gql<UpdateResult>(mutation, {
      input: {
        id: labelId,
        name: input.name,
        description: input.description,
        color: input.color,
        teamId: this.teamId,
      },
    });

    return result.labelUpdate.label;
  }

  /**
   * Create a Linear project. Idempotent — checks existing projects by name first.
   */
  async createProject(input: {
    name: string;
    description?: string;
  }): Promise<LinearProject> {
    const mutation = `
      mutation CreateProject($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          project {
            id
            name
            description
          }
        }
      }
    `;

    type CreateResult = {
      projectCreate: { project: LinearProject };
    };

    const result = await this.gql<CreateResult>(mutation, {
      input: {
        name: input.name,
        description: input.description ?? null,
        teamIds: [this.teamId],
      },
    });

    return result.projectCreate.project;
  }

  /**
   * Update a Linear project.
   */
  async updateProject(projectId: string, input: {
    name?: string;
    description?: string;
  }): Promise<LinearProject> {
    const mutation = `
      mutation UpdateProject($input: ProjectUpdateInput!) {
        projectUpdate(input: $input) {
          project {
            id
            name
            description
          }
        }
      }
    `;

    type UpdateResult = {
      projectUpdate: { project: LinearProject };
    };

    const result = await this.gql<UpdateResult>(mutation, {
      input: {
        id: projectId,
        name: input.name,
        description: input.description,
      },
    });

    return result.projectUpdate.project;
  }
}

export { GOAL_STATUS_COLORS, GOAL_PRIORITY_COLORS, GOAL_LEVEL_MAP };