-- Video Profil terpisah dari foto: objek authenticated tidak dipublikasikan di CDN.
-- Prefix provider berbeda agar scheduler foto lama tidak menghapus video.
CREATE TABLE cms_videos (
  id TEXT PRIMARY KEY NOT NULL,
  public_path TEXT NOT NULL UNIQUE,
  collection TEXT NOT NULL CHECK(collection = 'pengaturan'),
  slug TEXT NOT NULL CHECK(slug = 'profil'),
  provider_key TEXT NOT NULL UNIQUE,
  provider_cloud TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK(length(sha256) = 64),
  byte_length INTEGER NOT NULL CHECK(byte_length > 0 AND byte_length <= 41943040),
  ready INTEGER NOT NULL DEFAULT 0 CHECK(ready IN (0,1)),
  duration REAL,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
