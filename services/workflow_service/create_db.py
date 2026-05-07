import subprocess
import sys

# Create database
print("Creating workflow_db database...")
result = subprocess.run([
    "psql",
    "-U", "postgres",
    "-h", "localhost",
    "-p", "5432",
    "-c", "CREATE DATABASE workflow_db;"
], capture_output=True, text=True)

if "already exists" in result.stderr or result.returncode == 0:
    print("✓ Database created (or already exists)")
else:
    print(f"Error: {result.stderr}")
    sys.exit(1)

print("\nRunning migrations...")
result = subprocess.run(["alembic", "upgrade", "head"], capture_output=True, text=True, cwd=".")
if result.returncode == 0:
    print("✓ Migrations completed")
else:
    print(f"Error: {result.stdout}\n{result.stderr}")
    sys.exit(1)

print("\n✅ Database setup complete!")
