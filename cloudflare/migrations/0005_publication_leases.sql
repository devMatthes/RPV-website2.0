ALTER TABLE publication_jobs ADD COLUMN lease_token TEXT;
ALTER TABLE publication_jobs ADD COLUMN lease_expires_at INTEGER;
CREATE INDEX publications_build ON publication_jobs(state,lease_expires_at);
ALTER TABLE publication_jobs ADD COLUMN creation_token TEXT;
CREATE TRIGGER publication_snapshot_immutable BEFORE UPDATE OF snapshot_json ON publication_jobs
WHEN NEW.snapshot_json != OLD.snapshot_json
BEGIN SELECT RAISE(ABORT,'Publication snapshot is immutable'); END;
CREATE INDEX cms_asset_versions ON cms_version_assets(asset_id,version_id);
