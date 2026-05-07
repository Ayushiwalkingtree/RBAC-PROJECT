-- Step 2: Get generated node IDs (run this separately to get the IDs)
SELECT node_id, node_code
FROM wf_node
WHERE workflow_id = 7
ORDER BY node_id;
