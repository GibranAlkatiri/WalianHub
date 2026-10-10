CREATE TABLE cms_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL CHECK(length(token_hash) = 64),
  username TEXT NOT NULL,
  credential_version TEXT NOT NULL CHECK(length(credential_version) = 64),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at > created_at)
);
CREATE INDEX cms_sessions_expiry ON cms_sessions(expires_at);

CREATE TABLE cms_login_limits (
  key_hash TEXT PRIMARY KEY NOT NULL CHECK(length(key_hash) = 64),
  attempts INTEGER NOT NULL CHECK(attempts > 0),
  expires_at INTEGER NOT NULL
);
CREATE INDEX cms_login_limits_expiry ON cms_login_limits(expires_at);
