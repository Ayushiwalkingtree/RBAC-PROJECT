from datetime import UTC, datetime, timedelta


def utcnow() -> datetime:
    return datetime.now(UTC)


def minutes_from_now(minutes: int) -> datetime:
    return utcnow() + timedelta(minutes=minutes)


def days_from_now(days: int) -> datetime:
    return utcnow() + timedelta(days=days)
