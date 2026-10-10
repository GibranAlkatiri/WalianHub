-- A reservation is written to BOTH databases before deleting a shared object.
-- Tombstones prevent an old upload ID from recreating an object being removed.
-- Old deployments may still upload without this column; unknown sources are
-- retained until an operator verifies their Cloudinary product environment.
ALTER TABLE cms_media ADD COLUMN provider_cloud TEXT;
ALTER TABLE cms_media ADD COLUMN provider_cloud_checked_at INTEGER;

CREATE TABLE cms_media_cleanup (
  provider_key TEXT PRIMARY KEY NOT NULL,
  unused_since INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','deleting','deleted')),
  claim_token TEXT,
  claimed_at INTEGER,
  deleted_at INTEGER,
  CHECK(state <> 'deleting' OR (claim_token IS NOT NULL AND claimed_at IS NOT NULL))
);

CREATE TABLE cms_media_cleanup_run (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  owner TEXT,
  expires_at INTEGER NOT NULL DEFAULT 0,
  last_run_at INTEGER,
  last_status TEXT,
  last_report TEXT CHECK(last_report IS NULL OR json_valid(last_report))
);

CREATE VIEW cms_media_current_references AS
  SELECT m.provider_key FROM cms_media m WHERE
    EXISTS (SELECT 1 FROM cms_content c, json_tree(c.published_json) j
            WHERE j.type = 'text' AND instr(j.value, m.public_path) > 0)
    OR EXISTS (SELECT 1 FROM cms_content c, json_tree(c.draft_json) j
               WHERE j.type = 'text' AND instr(j.value, m.public_path) > 0);

CREATE TRIGGER cms_media_cleanup_claim_insert BEFORE INSERT ON cms_media_cleanup
WHEN NEW.state = 'deleting' BEGIN
  SELECT CASE WHEN EXISTS (SELECT 1 FROM cms_media_current_references WHERE provider_key = NEW.provider_key)
    OR EXISTS (SELECT 1 FROM cms_media WHERE provider_key = NEW.provider_key AND
      (strftime('%s', created_at) IS NULL OR CAST(strftime('%s', created_at) AS INTEGER) * 1000 > NEW.claimed_at - 604800000))
    THEN RAISE(ABORT, 'CMS_MEDIA_IN_USE') END;
END;

CREATE TRIGGER cms_media_cleanup_claim_update BEFORE UPDATE OF state, claimed_at ON cms_media_cleanup
WHEN NEW.state = 'deleting' BEGIN
  SELECT CASE WHEN EXISTS (SELECT 1 FROM cms_media_current_references WHERE provider_key = NEW.provider_key)
    OR EXISTS (SELECT 1 FROM cms_media WHERE provider_key = NEW.provider_key AND
      (strftime('%s', created_at) IS NULL OR CAST(strftime('%s', created_at) AS INTEGER) * 1000 > NEW.claimed_at - 604800000))
    THEN RAISE(ABORT, 'CMS_MEDIA_IN_USE') END;
END;

CREATE TRIGGER cms_media_cleanup_upload BEFORE INSERT ON cms_media
WHEN EXISTS (SELECT 1 FROM cms_media_cleanup WHERE provider_key = NEW.provider_key AND state <> 'pending')
BEGIN SELECT RAISE(ABORT, 'CMS_MEDIA_REMOVED'); END;

-- Reset the grace period on writes too, including use between daily scans.
CREATE TRIGGER cms_media_cleanup_uploaded AFTER INSERT ON cms_media BEGIN
  DELETE FROM cms_media_cleanup WHERE provider_key=NEW.provider_key AND state='pending';
END;

CREATE TRIGGER cms_media_cleanup_used_insert AFTER INSERT ON cms_content BEGIN
  DELETE FROM cms_media_cleanup WHERE state='pending' AND provider_key IN (
    SELECT m.provider_key FROM cms_media m WHERE
      EXISTS (SELECT 1 FROM json_tree(NEW.published_json) j WHERE j.type='text' AND instr(j.value,m.public_path)>0)
      OR EXISTS (SELECT 1 FROM json_tree(NEW.draft_json) j WHERE j.type='text' AND instr(j.value,m.public_path)>0));
END;

CREATE TRIGGER cms_media_cleanup_used_update AFTER UPDATE OF published_json,draft_json ON cms_content BEGIN
  UPDATE cms_media_cleanup SET unused_since=MAX(unused_since,CAST((julianday('now')-2440587.5)*86400000 AS INTEGER))
    WHERE state='pending' AND provider_key IN (SELECT m.provider_key FROM cms_media m WHERE
      EXISTS (SELECT 1 FROM json_tree(OLD.published_json) j WHERE j.type='text' AND instr(j.value,m.public_path)>0)
      OR EXISTS (SELECT 1 FROM json_tree(OLD.draft_json) j WHERE j.type='text' AND instr(j.value,m.public_path)>0));
  DELETE FROM cms_media_cleanup WHERE state='pending' AND provider_key IN (
    SELECT m.provider_key FROM cms_media m WHERE
      EXISTS (SELECT 1 FROM json_tree(NEW.published_json) j WHERE j.type='text' AND instr(j.value,m.public_path)>0)
      OR EXISTS (SELECT 1 FROM json_tree(NEW.draft_json) j WHERE j.type='text' AND instr(j.value,m.public_path)>0));
END;

CREATE TRIGGER cms_media_cleanup_unused_delete AFTER DELETE ON cms_content BEGIN
  UPDATE cms_media_cleanup SET unused_since=MAX(unused_since,CAST((julianday('now')-2440587.5)*86400000 AS INTEGER))
    WHERE state='pending' AND provider_key IN (SELECT m.provider_key FROM cms_media m WHERE
      EXISTS (SELECT 1 FROM json_tree(OLD.published_json) j WHERE j.type='text' AND instr(j.value,m.public_path)>0)
      OR EXISTS (SELECT 1 FROM json_tree(OLD.draft_json) j WHERE j.type='text' AND instr(j.value,m.public_path)>0));
END;

CREATE TRIGGER cms_media_cleanup_content_insert BEFORE INSERT ON cms_content
WHEN EXISTS (SELECT 1 FROM cms_media m JOIN cms_media_cleanup g USING(provider_key)
  WHERE g.state <> 'pending' AND (
    EXISTS (SELECT 1 FROM json_tree(NEW.published_json) j WHERE j.type = 'text' AND instr(j.value, m.public_path) > 0)
    OR EXISTS (SELECT 1 FROM json_tree(NEW.draft_json) j WHERE j.type = 'text' AND instr(j.value, m.public_path) > 0)))
BEGIN SELECT RAISE(ABORT, 'CMS_MEDIA_REMOVED'); END;

CREATE TRIGGER cms_media_cleanup_content_update BEFORE UPDATE OF published_json, draft_json ON cms_content
WHEN EXISTS (SELECT 1 FROM cms_media m JOIN cms_media_cleanup g USING(provider_key)
  WHERE g.state <> 'pending' AND (
    EXISTS (SELECT 1 FROM json_tree(NEW.published_json) j WHERE j.type = 'text' AND instr(j.value, m.public_path) > 0)
    OR EXISTS (SELECT 1 FROM json_tree(NEW.draft_json) j WHERE j.type = 'text' AND instr(j.value, m.public_path) > 0)))
BEGIN SELECT RAISE(ABORT, 'CMS_MEDIA_REMOVED'); END;
