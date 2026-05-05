from fastapi import FastAPI

from app.api.routes.tickets import router as tickets_router
from app.db.database import create_tables

app = FastAPI(title="Ticket Service", version="0.1.0")


@app.on_event("startup")
async def on_startup() -> None:
    await create_tables()


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(tickets_router)
