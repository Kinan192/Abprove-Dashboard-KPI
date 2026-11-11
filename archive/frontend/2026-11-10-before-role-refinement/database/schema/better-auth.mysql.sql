-- Better Auth 1.7.18 / MySQL adapter model mappings (fresh database only).
CREATE TABLE auth_accounts (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, accountId VARCHAR(190) NOT NULL, providerId VARCHAR(32) NOT NULL,
 userId BIGINT UNSIGNED NOT NULL, accessToken TEXT NULL, refreshToken TEXT NULL, idToken TEXT NULL,
 accessTokenExpiresAt DATETIME(6) NULL, refreshTokenExpiresAt DATETIME(6) NULL, scope VARCHAR(255) NULL, password VARCHAR(255) NULL,
 createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY auth_accounts_provider_account(providerId,accountId), UNIQUE KEY auth_accounts_user_provider(userId,providerId),
 CONSTRAINT auth_accounts_user FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE auth_sessions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, token VARCHAR(255) NOT NULL UNIQUE, userId BIGINT UNSIGNED NOT NULL,
 expiresAt DATETIME(6) NOT NULL, createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 ipAddress VARCHAR(64) NULL, userAgent TEXT NULL, context_key VARCHAR(100) NULL, last_activity_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY auth_sessions_expiry(expiresAt), CONSTRAINT auth_sessions_user FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE auth_verifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, identifier VARCHAR(255) NOT NULL, value TEXT NOT NULL, expiresAt DATETIME(6) NOT NULL,
 createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY auth_verifications_identifier(identifier), KEY auth_verifications_expiry(expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
