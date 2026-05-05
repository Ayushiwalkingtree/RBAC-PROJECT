from pydantic import BaseModel


class NavigationOrderItem(BaseModel):
    resource_key: str
    parent_resource_key: str | None = None
    sequence_no: int


class NavigationOrderUpdate(BaseModel):
    items: list[NavigationOrderItem]
