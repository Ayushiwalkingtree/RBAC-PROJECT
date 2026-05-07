from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.workflow_action import WorkflowAction
from app.models.workflow_definition import WorkflowDefinition
from app.models.workflow_node import WorkflowNode
from app.models.workflow_transition import WorkflowTransition


DEFAULT_ORG_ID = 1
SYSTEM_USER_ID = 1
WORKFLOW_CODE = "TASK_APPROVAL_WORKFLOW"


async def seed_task_approval_workflow(db: AsyncSession) -> None:
    """Create the default TASK workflow used by the dev Start Workflow page."""
    now = datetime.now(timezone.utc)
    workflow = await _get_or_create_workflow(db, now)

    start_node = await _get_or_create_node(
        db,
        workflow.workflow_id,
        now,
        node_code="START",
        node_name="Start",
        node_type="START",
        sequence_no=0,
        is_start_node=True,
        is_end_node=False,
    )
    review_node = await _get_or_create_node(
        db,
        workflow.workflow_id,
        now,
        node_code="REVIEW",
        node_name="Review Task",
        node_type="REVIEW",
        sequence_no=1,
        is_start_node=False,
        is_end_node=False,
        assignment_type="ROLE",
        assigned_role_id=settings.DEFAULT_ORG_ADMIN_ROLE_ID,
        assignment_strategy="ALL_USERS",
        maker_checker_required=False,
        allow_self_approval=True,
    )
    approved_node = await _get_or_create_node(
        db,
        workflow.workflow_id,
        now,
        node_code="END_APPROVED",
        node_name="Approved",
        node_type="END_APPROVED",
        sequence_no=2,
        is_start_node=False,
        is_end_node=True,
    )
    rejected_node = await _get_or_create_node(
        db,
        workflow.workflow_id,
        now,
        node_code="END_REJECTED",
        node_name="Rejected",
        node_type="END_REJECTED",
        sequence_no=3,
        is_start_node=False,
        is_end_node=True,
    )
    returned_node = await _get_or_create_node(
        db,
        workflow.workflow_id,
        now,
        node_code="END_CANCELLED",
        node_name="Returned",
        node_type="END_CANCELLED",
        sequence_no=4,
        is_start_node=False,
        is_end_node=True,
    )

    await _get_or_create_action(db, start_node.node_id, now, "SUBMIT", "Submit", 1)
    await _get_or_create_action(
        db,
        review_node.node_id,
        now,
        "APPROVE",
        "Approve",
        1,
        is_positive_action=True,
    )
    await _get_or_create_action(
        db,
        review_node.node_id,
        now,
        "REJECT",
        "Reject",
        2,
        is_negative_action=True,
    )
    await _get_or_create_action(
        db,
        review_node.node_id,
        now,
        "RETURN",
        "Return",
        3,
        is_negative_action=True,
    )

    await _get_or_create_transition(
        db,
        workflow.workflow_id,
        start_node.node_id,
        "SUBMIT",
        review_node.node_id,
        now,
    )
    await _get_or_create_transition(
        db,
        workflow.workflow_id,
        review_node.node_id,
        "APPROVE",
        approved_node.node_id,
        now,
    )
    await _get_or_create_transition(
        db,
        workflow.workflow_id,
        review_node.node_id,
        "REJECT",
        rejected_node.node_id,
        now,
    )
    await _get_or_create_transition(
        db,
        workflow.workflow_id,
        review_node.node_id,
        "RETURN",
        returned_node.node_id,
        now,
    )

    await db.commit()


async def _get_or_create_workflow(
    db: AsyncSession,
    now: datetime,
) -> WorkflowDefinition:
    workflow = (
        await db.execute(
            select(WorkflowDefinition).where(
                WorkflowDefinition.org_id == DEFAULT_ORG_ID,
                WorkflowDefinition.workflow_code == WORKFLOW_CODE,
                WorkflowDefinition.version_no == 1,
            )
        )
    ).scalar_one_or_none()

    if not workflow:
        workflow = WorkflowDefinition(
            org_id=DEFAULT_ORG_ID,
            workflow_code=WORKFLOW_CODE,
            workflow_name="Task Approval Workflow",
            description="Default single-step approval workflow for TASK records.",
            entity_name="TASK",
            entity_table_name="tasks",
            trigger_type="MANUAL",
            trigger_action="SUBMIT",
            version_no=1,
            is_published=True,
            allow_parallel_approval=False,
            allow_delegation=False,
            allow_send_back=True,
            allow_reminder=True,
            created_by=SYSTEM_USER_ID,
            created_at=now,
            is_active=True,
            is_deleted=False,
        )
        db.add(workflow)
        await db.flush()
        return workflow

    workflow.workflow_name = "Task Approval Workflow"
    workflow.description = "Default single-step approval workflow for TASK records."
    workflow.entity_name = "TASK"
    workflow.entity_table_name = "tasks"
    workflow.trigger_type = "MANUAL"
    workflow.trigger_action = "SUBMIT"
    workflow.is_published = True
    workflow.allow_send_back = True
    workflow.is_active = True
    workflow.is_deleted = False
    workflow.updated_by = SYSTEM_USER_ID
    workflow.updated_at = now
    await db.flush()
    return workflow


async def _get_or_create_node(
    db: AsyncSession,
    workflow_id: int,
    now: datetime,
    *,
    node_code: str,
    node_name: str,
    node_type: str,
    sequence_no: int,
    is_start_node: bool,
    is_end_node: bool,
    assignment_type: str | None = None,
    assigned_role_id: int | None = None,
    assignment_strategy: str = "FIRST_AVAILABLE",
    maker_checker_required: bool = False,
    allow_self_approval: bool = True,
) -> WorkflowNode:
    node = (
        await db.execute(
            select(WorkflowNode).where(
                WorkflowNode.workflow_id == workflow_id,
                WorkflowNode.node_code == node_code,
            )
        )
    ).scalar_one_or_none()

    if not node:
        node = WorkflowNode(
            org_id=DEFAULT_ORG_ID,
            workflow_id=workflow_id,
            node_code=node_code,
            node_name=node_name,
            node_type=node_type,
            sequence_no=sequence_no,
            is_start_node=is_start_node,
            is_end_node=is_end_node,
            assignment_type=assignment_type,
            assigned_role_id=assigned_role_id,
            assignment_strategy=assignment_strategy,
            maker_checker_required=maker_checker_required,
            allow_self_approval=allow_self_approval,
            created_by=SYSTEM_USER_ID,
            created_at=now,
            is_active=True,
            is_deleted=False,
        )
        db.add(node)
        await db.flush()
        return node

    node.node_name = node_name
    node.node_type = node_type
    node.sequence_no = sequence_no
    node.is_start_node = is_start_node
    node.is_end_node = is_end_node
    node.assignment_type = assignment_type
    node.assigned_role_id = assigned_role_id
    node.assignment_strategy = assignment_strategy
    node.maker_checker_required = maker_checker_required
    node.allow_self_approval = allow_self_approval
    node.is_active = True
    node.is_deleted = False
    node.updated_by = SYSTEM_USER_ID
    node.updated_at = now
    await db.flush()
    return node


async def _get_or_create_action(
    db: AsyncSession,
    node_id: int,
    now: datetime,
    action_code: str,
    action_name: str,
    display_order: int,
    *,
    is_positive_action: bool = False,
    is_negative_action: bool = False,
) -> WorkflowAction:
    action = (
        await db.execute(
            select(WorkflowAction).where(
                WorkflowAction.node_id == node_id,
                WorkflowAction.action_code == action_code,
            )
        )
    ).scalar_one_or_none()

    if not action:
        action = WorkflowAction(
            org_id=DEFAULT_ORG_ID,
            node_id=node_id,
            action_code=action_code,
            action_name=action_name,
            display_order=display_order,
            is_positive_action=is_positive_action,
            is_negative_action=is_negative_action,
            created_by=SYSTEM_USER_ID,
            created_at=now,
            is_active=True,
            is_deleted=False,
        )
        db.add(action)
        await db.flush()
        return action

    action.action_name = action_name
    action.display_order = display_order
    action.is_positive_action = is_positive_action
    action.is_negative_action = is_negative_action
    action.is_active = True
    action.is_deleted = False
    action.updated_by = SYSTEM_USER_ID
    action.updated_at = now
    await db.flush()
    return action


async def _get_or_create_transition(
    db: AsyncSession,
    workflow_id: int,
    from_node_id: int,
    action_code: str,
    to_node_id: int,
    now: datetime,
) -> WorkflowTransition:
    transition = (
        await db.execute(
            select(WorkflowTransition).where(
                WorkflowTransition.workflow_id == workflow_id,
                WorkflowTransition.from_node_id == from_node_id,
                WorkflowTransition.action_code == action_code,
                WorkflowTransition.to_node_id == to_node_id,
            )
        )
    ).scalar_one_or_none()

    if not transition:
        transition = WorkflowTransition(
            org_id=DEFAULT_ORG_ID,
            workflow_id=workflow_id,
            from_node_id=from_node_id,
            action_code=action_code,
            to_node_id=to_node_id,
            priority=1,
            is_default=False,
            created_by=SYSTEM_USER_ID,
            created_at=now,
            is_active=True,
            is_deleted=False,
        )
        db.add(transition)
        await db.flush()
        return transition

    transition.priority = 1
    transition.is_default = False
    transition.is_active = True
    transition.is_deleted = False
    transition.updated_by = SYSTEM_USER_ID
    transition.updated_at = now
    await db.flush()
    return transition
