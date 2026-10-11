-- UTC timestamps are Unix milliseconds. No credentials or customer seed data.
CREATE TABLE administrators (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT NOT NULL UNIQUE,
  auth_version INTEGER NOT NULL DEFAULT 1 CHECK (auth_version > 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0)
) STRICT;

-- Only hashes of random session tokens; password material remains a Worker secret.
CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  administrator_id INTEGER NOT NULL REFERENCES administrators(id) ON DELETE CASCADE,
  auth_version INTEGER NOT NULL CHECK (auth_version > 0),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at)
) STRICT;
CREATE INDEX sessions_expiry ON admin_sessions(expires_at);

CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL CHECK (module IN ('serwis', 'kontakt')),
  submitted_at INTEGER NOT NULL CHECK (submitted_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= submitted_at),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  address_json TEXT CHECK (address_json IS NULL OR (json_valid(address_json) AND json_type(address_json) = 'object')),
  installation_json TEXT CHECK (installation_json IS NULL OR (json_valid(installation_json) AND json_type(installation_json) = 'object')),
  privacy_accepted_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'active', 'waiting', 'closed')),
  owner_id INTEGER REFERENCES administrators(id) ON DELETE SET NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  closed_at INTEGER,
  delete_after INTEGER,
  idempotency_key_hash TEXT NOT NULL UNIQUE CHECK (length(idempotency_key_hash) = 64),
  fingerprint TEXT NOT NULL CHECK (length(fingerprint) = 64),
  CHECK (module != 'serwis' OR (address_json IS NOT NULL AND installation_json IS NOT NULL)),
  CHECK (module != 'kontakt' OR status != 'waiting'),
  CHECK ((closed_at IS NULL AND delete_after IS NULL) OR
         (closed_at IS NOT NULL AND delete_after IS NOT NULL AND delete_after = closed_at + 86400000))
) STRICT;
CREATE INDEX cases_list ON cases(module, submitted_at DESC, id DESC);
CREATE INDEX cases_status ON cases(module, status, submitted_at DESC, id DESC);
CREATE INDEX cases_cleanup ON cases(delete_after) WHERE delete_after IS NOT NULL;

-- Closing starts retention once; edits to an already closed case cannot extend it.
CREATE TRIGGER cases_closed_insert AFTER INSERT ON cases WHEN NEW.status = 'closed'
BEGIN
  UPDATE cases SET closed_at = NEW.updated_at, delete_after = NEW.updated_at + 86400000 WHERE id = NEW.id;
END;
CREATE TRIGGER cases_status_retention AFTER UPDATE OF status ON cases
WHEN NEW.status != OLD.status
BEGIN
  UPDATE cases SET
    closed_at = CASE WHEN NEW.status = 'closed' THEN NEW.updated_at ELSE NULL END,
    delete_after = CASE WHEN NEW.status = 'closed' THEN NEW.updated_at + 86400000 ELSE NULL END
  WHERE id = NEW.id;
END;

CREATE TABLE case_events (
  id INTEGER PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  at INTEGER NOT NULL,
  actor TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('created', 'status', 'owner', 'note')),
  message TEXT NOT NULL
) STRICT;
CREATE INDEX events_case ON case_events(case_id, at, id);

-- Object keys must be opaque; original filenames belong only in protected metadata.
CREATE TABLE file_assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'cms')),
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  bytes INTEGER NOT NULL CHECK (bytes > 0 AND bytes <= 5242880),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'ready', 'deleting')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  CHECK (visibility != 'cms' OR content_type != 'application/pdf')
) STRICT;
CREATE INDEX assets_pending_expiry ON file_assets(expires_at) WHERE state = 'pending';
CREATE TABLE case_attachments (
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL UNIQUE REFERENCES file_assets(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 4),
  PRIMARY KEY (case_id, position)
) STRICT;
CREATE TRIGGER attachments_private_insert BEFORE INSERT ON case_attachments
WHEN (SELECT visibility FROM file_assets WHERE id = NEW.asset_id) != 'private'
BEGIN SELECT RAISE(ABORT, 'Case attachments must be private'); END;
CREATE TRIGGER attachments_private_update BEFORE UPDATE OF asset_id ON case_attachments
WHEN (SELECT visibility FROM file_assets WHERE id = NEW.asset_id) != 'private'
BEGIN SELECT RAISE(ABORT, 'Case attachments must be private'); END;
CREATE TRIGGER assets_visibility_immutable BEFORE UPDATE OF visibility ON file_assets
WHEN NEW.visibility != OLD.visibility
BEGIN SELECT RAISE(ABORT, 'Asset visibility is immutable'); END;

-- Deleting SQL rows cannot delete R2 objects. Persist a retryable cleanup outbox.
CREATE TABLE file_deletion_jobs (
  object_key TEXT PRIMARY KEY,
  queued_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  retry_after INTEGER NOT NULL
) STRICT;
CREATE INDEX deletion_retry ON file_deletion_jobs(retry_after);
CREATE TRIGGER assets_queue_delete AFTER DELETE ON file_assets
BEGIN
  INSERT OR IGNORE INTO file_deletion_jobs(object_key, queued_at, retry_after)
  VALUES (OLD.object_key, unixepoch() * 1000, unixepoch() * 1000);
END;
-- Cascading case deletion removes each owned asset and queues its R2 object.
CREATE TRIGGER attachments_cleanup AFTER DELETE ON case_attachments
BEGIN
  DELETE FROM file_assets WHERE id = OLD.asset_id;
END;
CREATE TRIGGER attachments_total_insert BEFORE INSERT ON case_attachments
WHEN (SELECT coalesce(sum(a.bytes), 0) FROM case_attachments ca
      JOIN file_assets a ON a.id = ca.asset_id WHERE ca.case_id = NEW.case_id)
      + (SELECT bytes FROM file_assets WHERE id = NEW.asset_id) > 20971520
BEGIN SELECT RAISE(ABORT, 'Attachments exceed 20 MiB'); END;
CREATE TRIGGER attachments_total_update BEFORE UPDATE ON case_attachments
WHEN (SELECT coalesce(sum(a.bytes), 0) FROM case_attachments ca
      JOIN file_assets a ON a.id = ca.asset_id
      WHERE ca.case_id = NEW.case_id AND ca.asset_id != OLD.asset_id)
      + (SELECT bytes FROM file_assets WHERE id = NEW.asset_id) > 20971520
BEGIN SELECT RAISE(ABORT, 'Attachments exceed 20 MiB'); END;
CREATE TRIGGER assets_metadata_immutable BEFORE UPDATE OF bytes, object_key ON file_assets
WHEN NEW.bytes != OLD.bytes OR NEW.object_key != OLD.object_key
BEGIN SELECT RAISE(ABORT, 'Stored asset size and key are immutable'); END;

-- Future CMS: editable draft, immutable approved revisions, separate publication.
CREATE TABLE cms_entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('project', 'page', 'contact')),
  slug TEXT NOT NULL,
  draft_json TEXT NOT NULL CHECK (json_valid(draft_json) AND json_type(draft_json) = 'object'),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at INTEGER NOT NULL,
  UNIQUE (kind, slug)
) STRICT;
CREATE TABLE cms_versions (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES cms_entries(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL CHECK (revision > 0),
  content_json TEXT NOT NULL CHECK (json_valid(content_json) AND json_type(content_json) = 'object'),
  approved_at INTEGER NOT NULL,
  UNIQUE (entry_id, revision)
) STRICT;
CREATE TRIGGER cms_versions_immutable BEFORE UPDATE ON cms_versions
BEGIN SELECT RAISE(ABORT, 'Approved versions are immutable'); END;
CREATE TABLE cms_version_assets (
  version_id TEXT NOT NULL REFERENCES cms_versions(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES file_assets(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (version_id, position)
) STRICT;
CREATE TRIGGER cms_assets_visibility_insert BEFORE INSERT ON cms_version_assets
WHEN (SELECT visibility FROM file_assets WHERE id = NEW.asset_id) != 'cms'
BEGIN SELECT RAISE(ABORT, 'CMS assets must be separated from private files'); END;
CREATE TRIGGER cms_assets_visibility_update BEFORE UPDATE OF asset_id ON cms_version_assets
WHEN (SELECT visibility FROM file_assets WHERE id = NEW.asset_id) != 'cms'
BEGIN SELECT RAISE(ABORT, 'CMS assets must be separated from private files'); END;
CREATE TABLE publication_jobs (
  id TEXT PRIMARY KEY,
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json) AND json_type(snapshot_json) = 'object'),
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'building', 'published', 'failed')),
  created_at INTEGER NOT NULL,
  finished_at INTEGER,
  build_id TEXT,
  error_code TEXT
) STRICT;
CREATE INDEX publications_state ON publication_jobs(state, created_at);
CREATE TABLE publication_versions (
  publication_id TEXT NOT NULL REFERENCES publication_jobs(id) ON DELETE CASCADE,
  version_id TEXT NOT NULL REFERENCES cms_versions(id) ON DELETE RESTRICT,
  PRIMARY KEY (publication_id, version_id)
) STRICT;

CREATE TABLE counters (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL CHECK (value >= 0)
) STRICT;
-- Usage counters have no PII. period_start/end follow the configured billing window.
-- Storage uses its own long-lived period; monthly request budgets get separate rows.
CREATE TABLE usage_budgets (
  scope TEXT NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('storage_bytes', 'r2_class_a', 'r2_class_b', 'google_requests', 'submissions')),
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL CHECK (period_end > period_start),
  ceiling INTEGER NOT NULL CHECK (ceiling >= 0),
  consumed INTEGER NOT NULL DEFAULT 0 CHECK (consumed >= 0),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  CHECK (consumed + reserved <= ceiling),
  PRIMARY KEY (scope, metric, period_start)
) STRICT;
CREATE TABLE usage_reservations (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  metric TEXT NOT NULL,
  period_start INTEGER NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (scope, metric, period_start) REFERENCES usage_budgets(scope, metric, period_start) ON DELETE RESTRICT
) STRICT;
CREATE INDEX reservations_expiry ON usage_reservations(expires_at);
CREATE TABLE rate_limit_windows (
  scope_hash TEXT NOT NULL CHECK (length(scope_hash) = 64),
  action TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > window_start),
  hits INTEGER NOT NULL CHECK (hits > 0),
  PRIMARY KEY (scope_hash, action, window_start)
) STRICT;
CREATE INDEX rate_windows_expiry ON rate_limit_windows(expires_at);
