import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.core.database import engine


async def setup_workflow():
    """Insert workflow data"""
    
    async with engine.begin() as conn:
        try:
            # Step 1: Create workflow definition
            print("1. Creating workflow definition...")
            await conn.execute(text("""
                INSERT INTO wf_workflow_definition 
                (org_id, workflow_code, workflow_name, description, entity_name, entity_table_name, trigger_type, trigger_action, is_active, is_deleted, created_by)
                VALUES (1, 'KYC_WORKFLOW', 'KYC Workflow', 'KYC approval workflow', 'KYCEntity', 'kyc_entity', 'CREATE', 'SUBMIT', true, false, 1)
                ON CONFLICT DO NOTHING
            """))
            print("✓ Workflow definition created/verified")
            
            # Get the workflow ID
            result = await conn.execute(text("""
                SELECT workflow_id FROM wf_workflow_definition WHERE workflow_code = 'KYC_WORKFLOW' LIMIT 1
            """))
            wf_row = result.fetchone()
            if not wf_row:
                print("❌ Failed to create/get workflow!")
                return
            
            workflow_id = wf_row[0]
            print(f"Using Workflow ID: {workflow_id}")

            # Step 2: Get node IDs
            print("\n2. Creating workflow nodes...")
            await conn.execute(text(f"""
                INSERT INTO wf_node
                (org_id, workflow_id, node_code, node_name, node_type, is_start_node, is_end_node, assignment_type, assigned_role_id, maker_checker_required, is_active, is_deleted, created_by)
                VALUES
                (1, {workflow_id}, 'START', 'Start', 'START', true, false, NULL, NULL, false, true, false, 1),
                (1, {workflow_id}, 'KYC_REVIEW', 'KYC Review', 'APPROVAL', false, false, 'ROLE', 30, true, true, false, 1),
                (1, {workflow_id}, 'COMPLIANCE_REVIEW', 'Compliance Review', 'APPROVAL', false, false, 'ROLE', 40, true, true, false, 1),
                (1, {workflow_id}, 'END_APPROVED', 'Approved', 'END', false, true, NULL, NULL, false, true, false, 1),
                (1, {workflow_id}, 'END_REJECTED', 'Rejected', 'END', false, true, NULL, NULL, false, true, false, 1)
                ON CONFLICT DO NOTHING
            """))
            print("✓ Workflow nodes created")

            # Get the node IDs
            result = await conn.execute(text(f"""
                SELECT node_id, node_code FROM wf_node WHERE workflow_id = {workflow_id} ORDER BY node_id
            """))
            
            rows = result.fetchall()
            node_ids = {}
            print("\nGenerated Node IDs:")
            for node_id, node_code in rows:
                node_ids[node_code] = node_id
                print(f"  {node_id} -> {node_code}")
            
            start_id = node_ids.get('START')
            kyc_id = node_ids.get('KYC_REVIEW')
            compliance_id = node_ids.get('COMPLIANCE_REVIEW')
            approved_id = node_ids.get('END_APPROVED')
            rejected_id = node_ids.get('END_REJECTED')

            if not all([start_id, kyc_id, compliance_id, approved_id, rejected_id]):
                print("❌ Some nodes were not created!")
                return

            # Step 3: Create node actions
            print(f"\n3. Creating node actions...")
            await conn.execute(text(f"""
                INSERT INTO wf_node_action
                (org_id, node_id, action_code, action_name, is_active, is_deleted, created_by)
                VALUES
                (1, {start_id}, 'SUBMIT', 'Submit', true, false, 1),
                (1, {kyc_id}, 'APPROVE', 'Approve', true, false, 1),
                (1, {kyc_id}, 'REJECT', 'Reject', true, false, 1),
                (1, {compliance_id}, 'APPROVE', 'Approve', true, false, 1),
                (1, {compliance_id}, 'REJECT', 'Reject', true, false, 1)
                ON CONFLICT DO NOTHING
            """))
            print("✓ Node actions created")

            # Step 4: Create transitions
            print(f"\n4. Creating transitions...")
            await conn.execute(text(f"""
                INSERT INTO wf_transition
                (org_id, workflow_id, from_node_id, action_code, to_node_id, priority, is_active, is_deleted, created_by)
                VALUES
                (1, {workflow_id}, {start_id}, 'SUBMIT', {kyc_id}, 1, true, false, 1),
                (1, {workflow_id}, {kyc_id}, 'APPROVE', {compliance_id}, 1, true, false, 1),
                (1, {workflow_id}, {kyc_id}, 'REJECT', {rejected_id}, 1, true, false, 1),
                (1, {workflow_id}, {compliance_id}, 'APPROVE', {approved_id}, 1, true, false, 1),
                (1, {workflow_id}, {compliance_id}, 'REJECT', {rejected_id}, 1, true, false, 1)
                ON CONFLICT DO NOTHING
            """))
            print("✓ Transitions created")
            
            print("\n" + "="*50)
            print("✅ All workflow data inserted successfully!")
            print("="*50)
            print(f"\nWorkflow ID: {workflow_id}")
            print(f"Nodes: {start_id}, {kyc_id}, {compliance_id}, {approved_id}, {rejected_id}")
            print(f"\nNext: Publish the workflow with POST /workflows/{workflow_id}/publish")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(setup_workflow())
