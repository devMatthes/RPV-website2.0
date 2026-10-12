-- Survives deletion of customer metadata until R2 confirms object deletion.
CREATE TABLE r2_objects (
  object_key TEXT PRIMARY KEY,
  bytes INTEGER NOT NULL CHECK (bytes > 0),
  scope TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  uploaded_at INTEGER
) STRICT;
CREATE TABLE upload_requests (
  key_hash TEXT PRIMARY KEY CHECK (length(key_hash) = 64),
  lease_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL
) STRICT;
CREATE INDEX upload_requests_expiry ON upload_requests(expires_at);
