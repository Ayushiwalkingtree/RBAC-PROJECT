-- Step 3: Create wf_node_action records
-- IMPORTANT: Replace the node IDs (16, 17, 18, 19, 20) with your actual generated IDs from step 2
INSERT INTO wf_node_action
(
org_id,
node_id,
action_code,
action_name,
is_active,
is_deleted,
created_by
)
VALUES
(1,16,'SUBMIT','Submit',true,false,1),
(1,17,'APPROVE','Approve',true,false,1),
(1,17,'REJECT','Reject',true,false,1),
(1,18,'APPROVE','Approve',true,false,1),
(1,18,'REJECT','Reject',true,false,1);
