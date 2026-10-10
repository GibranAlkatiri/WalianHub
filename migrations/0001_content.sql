CREATE TABLE cms_imports (
  snapshot_id TEXT PRIMARY KEY NOT NULL,
  repository TEXT NOT NULL,
  main_sha TEXT NOT NULL CHECK(length(main_sha) = 40),
  captured_at TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Separate versions keep unfinished revisions out of public reads.
CREATE TABLE cms_content (
  collection TEXT NOT NULL,
  slug TEXT NOT NULL,
  source_path TEXT NOT NULL UNIQUE,
  published_json TEXT CHECK(published_json IS NULL OR json_valid(published_json)),
  published_blob_sha TEXT,
  draft_json TEXT CHECK(draft_json IS NULL OR json_valid(draft_json)),
  draft_blob_sha TEXT,
  draft_action TEXT CHECK(draft_action IN ('edit', 'delete', 'withdraw')),
  draft_revision TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
  snapshot_id TEXT NOT NULL REFERENCES cms_imports(snapshot_id),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY(collection, slug),
  CHECK((published_json IS NULL) = (published_blob_sha IS NULL)),
  CHECK((draft_action IS NULL) = (draft_revision IS NULL)),
  CHECK((draft_json IS NULL) = (draft_blob_sha IS NULL)),
  CHECK(draft_action IS NOT NULL OR draft_json IS NULL),
  CHECK(draft_action NOT IN ('edit', 'withdraw') OR draft_json IS NOT NULL),
  CHECK(published_json IS NOT NULL OR (draft_action IS NOT NULL AND draft_action IN ('edit', 'withdraw')))
);

CREATE TABLE cms_media_sources (
  source_ref TEXT NOT NULL,
  source_path TEXT NOT NULL,
  blob_sha TEXT NOT NULL CHECK(length(blob_sha) = 40),
  byte_length INTEGER NOT NULL CHECK(byte_length > 0),
  snapshot_id TEXT NOT NULL REFERENCES cms_imports(snapshot_id),
  PRIMARY KEY(source_ref, source_path)
);

CREATE VIEW cms_published_content AS
  SELECT collection, slug, published_json AS data_json, version, updated_at
  FROM cms_content WHERE published_json IS NOT NULL;
