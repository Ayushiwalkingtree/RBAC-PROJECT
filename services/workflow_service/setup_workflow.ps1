# Run SQL workflow setup scripts
# Make sure PostgreSQL is running before executing this script

$dbHost = "localhost"
$dbPort = 5432
$dbName = "workflow_db"
$dbUser = "postgres"
$dbPassword = "postgres"

Write-Host "Step 1: Creating wf_node records..."
$env:PGPASSWORD = $dbPassword
psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f sql/01_create_wf_nodes.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create nodes. Check if PostgreSQL is running at $dbHost:$dbPort"
    exit 1
}

Write-Host "`nStep 2: Getting generated node IDs..."
psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f sql/02_get_node_ids.sql

Write-Host "`n⚠️  UPDATE the node IDs in steps 3 and 4 SQL files if they're different!"
Read-Host "Press Enter after updating the SQL files with correct node IDs, or Ctrl+C to cancel"

Write-Host "`nStep 3: Creating wf_node_action records..."
psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f sql/03_create_wf_node_actions.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create actions"
    exit 1
}

Write-Host "`nStep 4: Creating wf_transition records..."
psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f sql/04_create_wf_transitions.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create transitions"
    exit 1
}

Write-Host "`n✅ All workflow data inserted successfully!"
Write-Host "`nNext step: Publish the workflow via API:`nPOST /workflows/7/publish"
