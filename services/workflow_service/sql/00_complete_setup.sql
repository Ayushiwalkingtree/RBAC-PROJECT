-- Complete Workflow Setup for Workflow ID 7
-- Run this entire script at once

-- Step 1: Create workflow definition (if not exists)
INSERT INTO wf_definition 
(org_id, workflow_code, workflow_name, description, is_active, is_deleted, created_by)
SELECT 1, 'KYC_WORKFLOW', 'KYC Workflow', 'KYC approval workflow', true, false, 1
WHERE NOT EXISTS (SELECT 1 FROM wf_definition WHERE workflow_id = 7);

-- Step 2: Insert workflow nodes
INSERT INTO wf_node
(org_id, workflow_id, node_code, node_name, node_type, is_start_node, is_end_node, assignment_type, assigned_role_id, maker_checker_required, is_active, is_deleted, created_by)
VALUES
(1,7,'START','Start','START',true,false,NULL,NULL,false,true,false,1),
(1,7,'KYC_REVIEW','KYC Review','APPROVAL',false,false,'ROLE',30,true,true,false,1),
(1,7,'COMPLIANCE_REVIEW','Compliance Review','APPROVAL',false,false,'ROLE',40,true,true,false,1),
(1,7,'END_APPROVED','Approved','END',false,true,NULL,NULL,false,true,false,1),
(1,7,'END_REJECTED','Rejected','END',false,true,NULL,NULL,false,true,false,1);

-- Step 3: Get node IDs
SELECT node_id, node_code FROM wf_node WHERE workflow_id = 7 ORDER BY node_id;
