from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import PermissionDependency
from app.db.database import get_session
from app.models.ticket import Ticket
from app.schemas.ticket import TicketCreate, TicketResponse, TicketUpdate

router = APIRouter(prefix="/api/v1/tickets", tags=["tickets"])


@router.get("", response_model=list[TicketResponse])
async def list_tickets(
    user: dict = Depends(PermissionDependency("TICKET_LIST_API", "READ")),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Ticket).where(Ticket.at_organization_id == user["org"]).order_by(Ticket.created_at.desc(), Ticket.id.desc())
    )
    return list(result.scalars())


@router.post("", response_model=TicketResponse, status_code=201)
async def create_ticket(
    payload: TicketCreate,
    user: dict = Depends(PermissionDependency("TICKET_CREATE_API", "EXECUTE")),
    session: AsyncSession = Depends(get_session),
):
    ticket = Ticket(
        at_organization_id=user["org"],
        title=payload.title,
        description=payload.description,
        status=payload.status.upper(),
        created_by=user["id"],
    )
    session.add(ticket)
    await session.commit()
    await session.refresh(ticket)
    return ticket


@router.put("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: int,
    payload: TicketUpdate,
    user: dict = Depends(PermissionDependency("TICKET_UPDATE_API", "EXECUTE")),
    session: AsyncSession = Depends(get_session),
):
    ticket = await _get_ticket(session, user["org"], ticket_id)
    if payload.title is not None:
        ticket.title = payload.title
    if payload.description is not None:
        ticket.description = payload.description
    if payload.status is not None:
        ticket.status = payload.status.upper()
    await session.commit()
    await session.refresh(ticket)
    return ticket


@router.delete("/{ticket_id}")
async def delete_ticket(
    ticket_id: int,
    user: dict = Depends(PermissionDependency("TICKET_DELETE_API", "EXECUTE")),
    session: AsyncSession = Depends(get_session),
):
    ticket = await _get_ticket(session, user["org"], ticket_id)
    await session.delete(ticket)
    await session.commit()
    return {"deleted": True}


async def _get_ticket(session: AsyncSession, org_id: int, ticket_id: int) -> Ticket:
    ticket = await session.get(Ticket, ticket_id)
    if not ticket or ticket.at_organization_id != org_id:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket
