-- Only transient place IDs and owner hashes; never prediction text or coordinates.
CREATE TABLE address_sessions (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  owner_hash TEXT NOT NULL CHECK (length(owner_hash) = 64),
  expires_at INTEGER NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0 CHECK (calls BETWEEN 0 AND 20),
  details_used INTEGER NOT NULL DEFAULT 0 CHECK (details_used IN (0, 1))
) STRICT;
CREATE INDEX address_sessions_expiry ON address_sessions(expires_at);
CREATE TABLE address_predictions (
  token_hash TEXT NOT NULL REFERENCES address_sessions(token_hash) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  PRIMARY KEY (token_hash, place_id)
) STRICT;
