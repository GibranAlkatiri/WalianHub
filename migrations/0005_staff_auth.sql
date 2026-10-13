-- Separate staff identities and sessions; existing production login is unchanged
-- until CMS_STAFF_AUTH is enabled explicitly.
CREATE TABLE cms_users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('owner','staff')),
  status TEXT NOT NULL DEFAULT 'unverified' CHECK(status IN ('unverified','pending','approved','rejected','revoked')),
  email_verified_at INTEGER,
  password_hash TEXT,
  credential_version INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  approved_at INTEGER,
  approved_by TEXT REFERENCES cms_users(id),
  CHECK(status NOT IN ('pending','approved') OR email_verified_at IS NOT NULL)
);
CREATE UNIQUE INDEX cms_one_owner ON cms_users(role) WHERE role='owner';
CREATE TABLE cms_staff_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL CHECK(length(token_hash)=64),
  user_id TEXT NOT NULL REFERENCES cms_users(id),
  credential_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at>created_at)
);
CREATE INDEX cms_staff_sessions_user ON cms_staff_sessions(user_id);
CREATE TABLE cms_auth_links (
  token_hash TEXT PRIMARY KEY NOT NULL CHECK(length(token_hash)=64),
  user_id TEXT NOT NULL REFERENCES cms_users(id),
  purpose TEXT NOT NULL CHECK(purpose IN ('verify','password','owner-login')),
  credential_version INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE INDEX cms_auth_links_user ON cms_auth_links(user_id,purpose);
CREATE TABLE cms_auth_limits (
  key_hash TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE cms_access_audit (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT REFERENCES cms_users(id),
  subject_id TEXT REFERENCES cms_users(id),
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
