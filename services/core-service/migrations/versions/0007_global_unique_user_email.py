"""make user email globally unique

Revision ID: 0007_global_unique_user_email
Revises: 0006_add_workflow_resources
Create Date: 2026-05-07
"""

from alembic import op

revision = "0007_global_unique_user_email"
down_revision = "0006_add_workflow_resources"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE at_user SET email = lower(email)")
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM at_user
                GROUP BY email
                HAVING count(*) > 1
            ) THEN
                RAISE EXCEPTION 'Cannot add global unique email constraint: duplicate active user emails exist';
            END IF;
        END $$;
        """
    )
    op.create_unique_constraint("uq_at_user_email", "at_user", ["email"])


def downgrade() -> None:
    op.drop_constraint("uq_at_user_email", "at_user", type_="unique")
