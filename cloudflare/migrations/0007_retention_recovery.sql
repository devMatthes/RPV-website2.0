-- Recovery journals contain only opaque case IDs and expiry times, never form data.
CREATE TABLE maintenance_locks (name TEXT PRIMARY KEY, token TEXT NOT NULL, expires_at INTEGER NOT NULL) STRICT;
CREATE TABLE retention_batches (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  expires_at INTEGER NOT NULL,
  written_at INTEGER
) STRICT;
CREATE INDEX retention_expiry ON retention_batches(expires_at);
CREATE TRIGGER retention_queue_delete AFTER DELETE ON retention_batches
BEGIN
  INSERT OR IGNORE INTO file_deletion_jobs(object_key,queued_at,retry_after)
  VALUES(OLD.object_key,unixepoch()*1000,unixepoch()*1000);
END;
CREATE TABLE recovery_state (
  id INTEGER PRIMARY KEY CHECK(id=1),
  phase TEXT NOT NULL CHECK(phase IN ('markers','inventory','complete')),
  cursor TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER
) STRICT;
CREATE TABLE recovery_objects (object_key TEXT PRIMARY KEY, bytes INTEGER NOT NULL, created_at INTEGER NOT NULL) STRICT;
