# Share one dedicated test database

Database-backed tests use one dedicated Neon test endpoint, recreate its application schemas at command startup, and must not overlap separate database-backed commands. This favors a simple local-only workflow over per-run infrastructure; endpoint allowlisting, unique test records, and targeted cleanup provide safety until CI, sharding, shared development, or concurrent commands justify locking or isolated targets.
