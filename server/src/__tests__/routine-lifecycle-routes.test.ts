import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAccessService = vi.hoisted(() => ({
  canUser: vi.fn(),
  decide: vi.fn(),
}));
const mockRoutineService = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  getDetail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  runRoutine: vi.fn(),
  createTrigger: vi.fn(),
  getTrigger: vi.fn(),
  updateTrigger: vi.fn(),
  deleteTrigger: vi.fn(),
  rotateTriggerSecret: vi.fn(),
  restoreRevision: vi.fn(),
  listRevisions: vi.fn(),
  listRuns: vi.fn(),
  getDescriptionDocument: vi.fn(),
}));
const mockDocumentAnnotationService = vi.hoisted(() => ({
  listThreadsForRoutineDocument: vi.fn(),
  getThreadForRoutineDocument: vi.fn(),
  createRoutineThread: vi.fn(),
  addRoutineComment: vi.fn(),
  updateRoutineThread: vi.fn(),
  remapOpenThreadsForRoutineDocument: vi.fn(),
}));
const mockLogActivity = vi.hoisted(() => vi.fn());
const mockGetTelemetryClient = vi.hoisted(() => vi.fn());
const mockTrackRoutineCreated = vi.hoisted(() => vi.fn());
const mockCreateLifecycleEvent = vi.hoisted(() => vi.fn(() => ({ id: "mock-routine-event-id" })));
const mockPublishLifecycleEvent = vi.hoisted(() => vi.fn(() => Promise.resolve({ allSucceeded: true })));

vi.mock("../telemetry.js", () => ({
  getTelemetryClient: mockGetTelemetryClient,
}));

vi.mock("@paperclipai/shared/telemetry", async () => ({
  trackRoutineCreated: mockTrackRoutineCreated,
}));

vi.mock("../services/index.js", () => ({
  accessService: () => mockAccessService,
  documentAnnotationService: () => mockDocumentAnnotationService,
  logActivity: mockLogActivity,
  routineService: () => mockRoutineService,
  createLifecycleEvent: mockCreateLifecycleEvent,
  publishLifecycleEvent: mockPublishLifecycleEvent,
}));

vi.mock("../services/workspace-runtime.js", () => ({
  startRuntimeServicesForWorkspaceControl: vi.fn(),
  stopRuntimeServicesForProjectWorkspace: vi.fn(),
}));

async function createApp() {
  const { errorHandler } = await vi.importActual<typeof import("../middleware/index.js")>(
    "../middleware/index.js",
  );
  const { routineRoutes } = await vi.importActual<typeof import("../routes/routines.js")>(
    "../routes/routines.js",
  );
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      userId: "board-user",
      companyIds: ["company-1"],
      source: "local_implicit",
      isInstanceAdmin: false,
    };
    next();
  });
  app.use("/api", routineRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("routine lifecycle routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccessService.canUser.mockResolvedValue(true);
    mockAccessService.decide.mockResolvedValue({
      allowed: true,
      action: "routine:read",
      reason: "allow_test",
      explanation: "Allowed by test mock.",
    });
    mockGetTelemetryClient.mockReturnValue({ track: vi.fn() });
    mockRoutineService.create.mockResolvedValue({
      id: "routine-1",
      companyId: "company-1",
      title: "Lifecycle test routine",
      status: "active",
      assigneeAgentId: "agent-1",
      latestRevisionId: "rev-1",
      latestRevisionNumber: 1,
    });
    mockRoutineService.update.mockResolvedValue({
      id: "routine-1",
      companyId: "company-1",
      title: "Updated routine",
      status: "paused",
      latestRevisionId: "rev-2",
      latestRevisionNumber: 2,
    });
    mockRoutineService.get.mockResolvedValue({
      id: "routine-1",
      companyId: "company-1",
      title: "Test routine",
      status: "active",
      assigneeAgentId: "agent-1",
      latestRevisionId: "rev-1",
      latestRevisionNumber: 1,
    });
    mockRoutineService.delete.mockResolvedValue(undefined);
    mockRoutineService.runRoutine.mockResolvedValue({
      id: "run-1",
      routineId: "routine-1",
      status: "issue_created",
      source: "manual",
    });
    mockLogActivity.mockResolvedValue(undefined);
    mockDocumentAnnotationService.remapOpenThreadsForRoutineDocument.mockResolvedValue([]);
    mockRoutineService.getDescriptionDocument.mockResolvedValue(null);
  });

  it("emits lifecycle event when a routine is created", async () => {
    const app = await createApp();
    const res = await request(app)
      .post("/api/companies/company-1/routines")
      .send({
        title: "Lifecycle test routine",
        assigneeAgentId: "00000000-0000-0000-0000-000000000001",
        status: "active",
      });

    expect([200, 201], JSON.stringify(res.body)).toContain(res.status);
    expect(mockCreateLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "routine",
        oldStatus: null,
        newStatus: "active",
      }),
    );
    expect(mockPublishLifecycleEvent).toHaveBeenCalled();
  });

  it("emits lifecycle event when routine status changes", async () => {
    const app = await createApp();
    const res = await request(app)
      .patch("/api/routines/routine-1")
      .send({ status: "paused" });

    expect(res.status).toBe(200);
    expect(mockCreateLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "routine",
        oldStatus: "active",
        newStatus: "paused",
      }),
    );
    expect(mockPublishLifecycleEvent).toHaveBeenCalled();
  });

  it("does not emit lifecycle event when status is unchanged", async () => {
    const app = await createApp();
    // No status field in the body
    const res = await request(app)
      .patch("/api/routines/routine-1")
      .send({ title: "Updated title" });

    expect(res.status).toBe(200);
    // createLifecycleEvent should NOT have been called for a non-status update
    const lifecycleCalls = mockCreateLifecycleEvent.mock.calls.filter(
      (call) => (call[0] as any).entityType === "routine",
    );
    expect(lifecycleCalls).toHaveLength(0);
  });

  it("emits lifecycle event when a routine is deleted", async () => {
    const app = await createApp();
    const res = await request(app)
      .delete("/api/routines/routine-1");

    expect(res.status).toBe(204);
    expect(mockCreateLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "routine",
        newStatus: "cancelled",
      }),
    );
    expect(mockPublishLifecycleEvent).toHaveBeenCalled();
  });

  it("emits lifecycle event when a routine run is triggered", async () => {
    const app = await createApp();
    const res = await request(app)
      .post("/api/routines/routine-1/run")
      .send({ source: "manual" });

    expect(res.status).toBe(202);
    expect(mockCreateLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "routine_run",
        newStatus: "issue_created",
      }),
    );
    expect(mockPublishLifecycleEvent).toHaveBeenCalled();
  });
});