-- Immutable objects stay private at the provider; publication is checked on read.
CREATE TABLE cms_media (
  id TEXT PRIMARY KEY NOT NULL,
  public_path TEXT NOT NULL UNIQUE,
  collection TEXT NOT NULL,
  slug TEXT NOT NULL,
  source_path TEXT NOT NULL,
  provider_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK(content_type IN ('image/jpeg','image/png','image/webp')),
  format TEXT NOT NULL CHECK(format IN ('jpg','png','webp')),
  byte_length INTEGER NOT NULL CHECK(byte_length > 0 AND byte_length <= 5242880),
  sha256 TEXT NOT NULL CHECK(length(sha256) = 64),
  ready INTEGER NOT NULL DEFAULT 0 CHECK(ready IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX cms_media_owner ON cms_media(collection,slug);
