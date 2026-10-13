CREATE TABLE cms_draft_assets (
 entry_id TEXT NOT NULL REFERENCES cms_entries(id) ON DELETE CASCADE,
 asset_id TEXT NOT NULL UNIQUE REFERENCES file_assets(id) ON DELETE RESTRICT,
 position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 11),
 PRIMARY KEY(entry_id,position)
) STRICT;
CREATE TRIGGER cms_draft_asset_check BEFORE INSERT ON cms_draft_assets
WHEN NOT EXISTS(SELECT 1 FROM file_assets WHERE id=NEW.asset_id AND visibility='cms' AND state IN ('pending','ready'))
BEGIN SELECT RAISE(ABORT,'Invalid CMS asset'); END;
CREATE TRIGGER cms_project_limit BEFORE INSERT ON cms_entries
WHEN NEW.kind='project' AND (SELECT count(*) FROM cms_entries WHERE kind='project')>=500
BEGIN SELECT RAISE(ABORT,'Project limit reached'); END;
ALTER TABLE cms_entries ADD COLUMN write_token TEXT NOT NULL DEFAULT '';
