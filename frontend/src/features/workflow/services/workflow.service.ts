import { workflowApiClient, unwrapWorkflowData, type WorkflowEnvelope } from '@/shared/api/workflowApiClient';

export type WorkflowPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WorkflowActionCode = 'APPROVE' | 'REJECT' | 'RETURN';

export type StartWorkflowFormValues = {
  task_title: string;
  description: string;
  priority: WorkflowPriority;
  category: string;
  due_date: string;
  amount?: string;
  currency?: string;
};

export type StartWorkflowPayload = {
  entity_name: 'TASK';
  entity_table_name: 'tasks';
  entity_record_id: string;
  payload: {
    title: string;
    description: string;
    priority: WorkflowPriority;
    category: string;
    due_date: string;
    amount?: number;
    currency?: string;
  };
};

export type WorkflowTask = {
  id: string;
  taskId: string;
  stepName?: string;
  entityName: string;
  entityRecordId: string;
  title: string;
  status: string;
  assignedTo?: string;
  candidateRole?: string;
  claimedBy?: string;
  completedBy?: string;
  createdAt?: string;
  dueDate?: string;
  completedAt?: string;
  instanceId?: string;
  payload?: unknown;
  availableActions: string[];
  raw: Record<string, unknown>;
};

export type WorkflowHistoryEvent = {
  id: string;
  action: string;
  actor?: string;
  comments?: string;
  createdAt?: string;
  raw: Record<string, unknown>;
};

export type WorkflowInstance = {
  id: string;
  workflowCode?: string;
  workflowName?: string;
  entityName?: string;
  entityTableName?: string;
  entityRecordId?: string;
  status?: string;
  startedBy?: string;
  startedAt?: string;
  completedAt?: string;
  currentStep?: string;
  payload?: unknown;
  steps: unknown[];
  history: WorkflowHistoryEvent[];
  tasks: WorkflowTask[];
  raw: Record<string, unknown>;
  source?: 'api' | 'recent';
};

export type WorkflowInstanceFilters = {
  status?: string;
  entity_name?: string;
  entity_record_id?: string;
  page?: number;
  per_page?: number;
};

export type TaskActionPayload = {
  action_code: WorkflowActionCode;
  comments: string;
  payload: Record<string, unknown>;
};

export type ReminderPayload = {
  reminder_message: string;
};

type UnknownRecord = Record<string, unknown>;

const RECENT_WORKFLOW_INSTANCES_KEY = 'count-infinity:workflow:recent-instances';

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};

const stringFrom = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return undefined;
};

const arrayFrom = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const unwrapNestedData = (value: unknown): unknown => {
  let current = value;
  for (let depth = 0; depth < 3; depth += 1) {
    const record = asRecord(current);
    if (!('data' in record) || record.data === undefined || record.data === null) {
      return current;
    }
    current = record.data;
  }
  return current;
};

const extractList = (value: unknown, keys: string[]): unknown[] => {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  const nestedData = asRecord(record.data);
  for (const key of keys) {
    if (Array.isArray(nestedData[key])) return nestedData[key] as unknown[];
  }
  return [];
};

const normalizeActions = (value: unknown): string[] => {
  const items = arrayFrom(value);
  return items
    .map((item) => {
      if (typeof item === 'string') return item;
      const record = asRecord(item);
      return stringFrom(record.action_code, record.code, record.name, record.action);
    })
    .filter((item): item is string => Boolean(item))
    .map((item) => item.toUpperCase());
};

const normalizeHistoryEvent = (value: unknown, index: number): WorkflowHistoryEvent => {
  const event = asRecord(value);
  const actor = asRecord(event.actor);
  const user = asRecord(event.user);

  return {
    id: stringFrom(event.id, event.event_id, event.history_id) ?? `event-${index}`,
    action: stringFrom(event.action, event.action_code, event.status, event.type) ?? 'EVENT',
    actor: stringFrom(event.actor_user_id, event.actor_id, event.actor_name, actor.name, user.name, user.email),
    comments: stringFrom(event.comments, event.comment, event.message, event.note),
    createdAt: stringFrom(event.created_at, event.timestamp, event.performed_at, event.completed_at),
    raw: event,
  };
};

export const normalizeTask = (value: unknown): WorkflowTask => {
  const task = asRecord(value);
  const payload = asRecord(task.payload);
  const entity = asRecord(task.entity);
  const assignee = asRecord(task.assignee);
  const workflowInstance = asRecord(task.workflow_instance);
  const step = asRecord(task.step);

  const taskId = stringFrom(task.task_id, task.id, task.workflow_task_id) ?? 'UNKNOWN';
  const instanceId = stringFrom(task.instance_id, task.workflow_instance_id, workflowInstance.id);
  const title =
    stringFrom(payload.title, task.title, task.task_title, task.name, entity.title) ??
    `Workflow task ${taskId}`;

  return {
    id: taskId,
    taskId,
    stepName: stringFrom(task.step_name, task.step_code, step.name, step.code),
    entityName: stringFrom(task.entity_name, entity.name) ?? 'TASK',
    entityRecordId: stringFrom(task.entity_record_id, entity.record_id, payload.entity_record_id) ?? '-',
    title,
    status: stringFrom(task.status, task.task_status, task.state) ?? 'PENDING',
    assignedTo: stringFrom(task.assigned_to, task.assignee, assignee.name, assignee.email),
    candidateRole: stringFrom(task.candidate_role, task.candidate_group, task.role_code),
    claimedBy: stringFrom(task.claimed_by, task.claimed_by_user_id, task.claimed_by_name),
    completedBy: stringFrom(task.completed_by, task.completed_by_user_id, task.completed_by_name),
    createdAt: stringFrom(task.created_at, task.createdAt, task.started_at),
    dueDate: stringFrom(task.due_date, task.dueDate, payload.due_date),
    completedAt: stringFrom(task.completed_at, task.completedAt),
    instanceId,
    payload: Object.keys(payload).length > 0 ? payload : task.payload,
    availableActions: normalizeActions(task.available_actions ?? task.actions ?? task.allowed_actions),
    raw: task,
  };
};

export const normalizeInstance = (value: unknown): WorkflowInstance => {
  const instance = asRecord(unwrapNestedData(value));
  const entity = asRecord(instance.entity);
  const workflow = asRecord(instance.workflow ?? instance.workflow_definition);
  const tasks = extractList(instance.tasks ?? instance.workflow_tasks, ['tasks', 'items']).map(normalizeTask);
  const history = extractList(instance.history ?? instance.audit_trail ?? instance.actions ?? instance.timeline ?? instance.events, [
    'history',
    'audit_trail',
    'actions',
    'timeline',
    'events',
  ]).map(normalizeHistoryEvent);
  const id = stringFrom(instance.instance_id, instance.id, instance.workflow_instance_id) ?? 'UNKNOWN';

  return {
    id,
    workflowCode: stringFrom(instance.workflow_code, workflow.code, workflow.workflow_code),
    workflowName: stringFrom(instance.workflow_name, workflow.name, workflow.workflow_name),
    entityName: stringFrom(instance.entity_name, entity.name),
    entityTableName: stringFrom(instance.entity_table_name, entity.table_name),
    entityRecordId: stringFrom(instance.entity_record_id, entity.record_id),
    status: stringFrom(instance.status, instance.current_status, instance.state),
    startedBy: stringFrom(instance.started_by, instance.created_by, instance.initiator),
    startedAt: stringFrom(instance.started_at, instance.created_at),
    completedAt: stringFrom(instance.completed_at, instance.finished_at),
    currentStep: stringFrom(instance.current_step, instance.step_name, instance.current_node),
    payload: instance.payload ?? entity.payload ?? instance.entity_payload,
    steps: extractList(instance.steps ?? workflow.steps, ['steps']),
    history,
    tasks,
    raw: instance,
  };
};

const normalizeTaskList = (value: unknown): WorkflowTask[] =>
  extractList(unwrapNestedData(value), ['tasks', 'items', 'results', 'pending_tasks']).map(normalizeTask);

const normalizeInstanceList = (value: unknown): WorkflowInstance[] =>
  extractList(unwrapNestedData(value), ['instances', 'items', 'results', 'workflows']).map((instance) => ({
    ...normalizeInstance(instance),
    source: 'api',
  }));

export const extractWorkflowInstanceId = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const record = asRecord(unwrapNestedData(value));
    const workflowInstance = asRecord(record.workflow_instance);
    const task = asRecord(record.task);
    const instanceId = stringFrom(
      record.instance_id,
      record.instanceId,
      record.workflow_instance_id,
      record.workflowInstanceId,
      record.id,
      workflowInstance.id,
      workflowInstance.instance_id,
      task.instance_id,
      task.workflow_instance_id,
    );
    if (instanceId) return instanceId;
  }
  return undefined;
};

const readRecentInstances = (): WorkflowInstance[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(RECENT_WORKFLOW_INSTANCES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as WorkflowInstance[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRecentInstances = (instances: WorkflowInstance[]): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(RECENT_WORKFLOW_INSTANCES_KEY, JSON.stringify(instances.slice(0, 10)));
};

export const rememberWorkflowInstance = (input: {
  instanceId: string;
  actionCode?: WorkflowActionCode;
  task?: WorkflowTask;
  response?: unknown;
  comments?: string;
}): void => {
  const response = asRecord(unwrapNestedData(input.response));
  const existing = readRecentInstances().filter((instance) => instance.id !== input.instanceId);
  const action = input.actionCode ?? stringFrom(response.action_code, response.action);
  const now = new Date().toISOString();
  const fallbackInstance: WorkflowInstance = {
    id: input.instanceId,
    workflowCode: stringFrom(response.workflow_code) ?? 'TASK_APPROVAL_WORKFLOW',
    entityName: stringFrom(response.entity_name, input.task?.entityName) ?? 'TASK',
    entityRecordId: stringFrom(response.entity_record_id, input.task?.entityRecordId),
    status: action === 'RETURN' ? 'RETURNED' : action === 'REJECT' ? 'REJECTED' : 'COMPLETED',
    startedAt: input.task?.createdAt,
    completedAt: stringFrom(response.completed_at) ?? now,
    payload: input.task?.payload,
    steps: [],
    history: [
      {
        id: `recent-${input.instanceId}-${now}`,
        action: action ?? 'COMPLETED',
        comments: input.comments,
        createdAt: now,
        raw: response,
      },
    ],
    tasks: input.task ? [{ ...input.task, status: 'COMPLETED', completedAt: stringFrom(response.completed_at) ?? now }] : [],
    raw: response,
    source: 'recent',
  };
  writeRecentInstances([fallbackInstance, ...existing]);
};

export const workflowService = {
  startWorkflow: async (payload: StartWorkflowPayload): Promise<UnknownRecord> => {
    const response = await workflowApiClient.post<WorkflowEnvelope<UnknownRecord> | UnknownRecord>(
      '/workflow-runtime/start',
      payload,
    );
    return asRecord(unwrapWorkflowData(response.data));
  },

  getPendingTasks: async (): Promise<WorkflowTask[]> => {
    const response = await workflowApiClient.get<WorkflowEnvelope<unknown> | unknown>(
      '/workflow-runtime/tasks/pending',
    );
    return normalizeTaskList(unwrapWorkflowData(response.data));
  },

  getTaskDetail: async (taskId: string): Promise<WorkflowTask> => {
    const response = await workflowApiClient.get<WorkflowEnvelope<unknown> | unknown>(
      `/workflow-runtime/tasks/${encodeURIComponent(taskId)}`,
    );
    return normalizeTask(unwrapWorkflowData(response.data));
  },

  performTaskAction: async (taskId: string, payload: TaskActionPayload): Promise<UnknownRecord> => {
    const response = await workflowApiClient.post<WorkflowEnvelope<UnknownRecord> | UnknownRecord>(
      `/workflow-runtime/tasks/${encodeURIComponent(taskId)}/action`,
      payload,
    );
    return asRecord(unwrapNestedData(unwrapWorkflowData(response.data)));
  },

  claimTask: async (taskId: string): Promise<UnknownRecord> => {
    const response = await workflowApiClient.post<WorkflowEnvelope<UnknownRecord> | UnknownRecord>(
      `/workflow-runtime/tasks/${encodeURIComponent(taskId)}/claim`,
    );
    return asRecord(unwrapWorkflowData(response.data));
  },

  sendReminder: async (taskId: string, payload: ReminderPayload): Promise<UnknownRecord> => {
    const response = await workflowApiClient.post<WorkflowEnvelope<UnknownRecord> | UnknownRecord>(
      `/workflow-runtime/tasks/${encodeURIComponent(taskId)}/reminder`,
      payload,
    );
    return asRecord(unwrapWorkflowData(response.data));
  },

  getWorkflowInstance: async (instanceId: string): Promise<WorkflowInstance> => {
    const response = await workflowApiClient.get<WorkflowEnvelope<unknown> | unknown>(
      `/workflow-runtime/instances/${encodeURIComponent(instanceId)}`,
    );
    return normalizeInstance(unwrapWorkflowData(response.data));
  },

  getWorkflowInstances: async (filters: WorkflowInstanceFilters = {}): Promise<WorkflowInstance[]> => {
    const response = await workflowApiClient.get<WorkflowEnvelope<unknown> | unknown>(
      '/workflow-runtime/instances',
      { params: filters },
    );
    return normalizeInstanceList(unwrapWorkflowData(response.data));
  },

  getRecentWorkflowInstances: (): WorkflowInstance[] => readRecentInstances(),

  rememberWorkflowInstance,

  extractWorkflowInstanceId,
};
