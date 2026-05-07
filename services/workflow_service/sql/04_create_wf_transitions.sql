-- Step 4: Create wf_transition records
-- IMPORTANT: Replace the node IDs (16, 17, 18, 19, 20) with your actual generated IDs
INSERT INTO wf_transition
(
org_id,
workflow_id,
from_node_id,
action_code,
to_node_id,
priority,
is_active,
is_deleted,
created_by
)
VALUES
(1,7,16,'SUBMIT',17,1,true,false,1),
(1,7,17,'APPROVE',18,1,true,false,1),
(1,7,17,'REJECT',20,1,true,false,1),
(1,7,18,'APPROVE',19,1,true,false,1),
(1,7,18,'REJECT',20,1,true,false,1);
