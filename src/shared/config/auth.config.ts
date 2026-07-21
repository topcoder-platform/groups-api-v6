/**
 * Parses the global valid-issuer setting.
 *
 * The shared Topcoder value is a JSON array. Comma-separated values are also
 * accepted for compatibility with newer v6 services and local configuration.
 *
 * @param value The VALID_ISSUERS environment value.
 * @returns A deduplicated list of non-empty issuer URLs.
 */
export function parseValidIssuers(value: string | undefined): string[] {
  if (!value || value.trim().length === 0) {
    return [];
  }

  let issuers: unknown;

  try {
    issuers = JSON.parse(value.replace(/\\"/g, '"')) as unknown;
  } catch {
    issuers = value.split(',');
  }

  if (!Array.isArray(issuers)) {
    return [];
  }

  return Array.from(
    new Set(
      issuers
        .filter((issuer): issuer is string => typeof issuer === 'string')
        .map((issuer) => issuer.trim())
        .filter((issuer) => issuer.length > 0),
    ),
  );
}

/**
 * Loads authentication settings from the standard v6 environment variables.
 *
 * @param env Environment values to load.
 * @returns Authentication settings used by JWT validation.
 */
export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    // Shared secret used to validate legacy HS256 Topcoder user tokens.
    authSecret: env.AUTH_SECRET,

    // Global JSON array (or comma-separated list) of accepted token issuers.
    validIssuers: parseValidIssuers(env.VALID_ISSUERS),

    jwt: {
      // Global Auth0 audience used to validate audience-bearing tokens.
      audience: env.AUTH0_AUDIENCE,

      // Clock tolerance for token expiration time (in seconds).
      clockTolerance: 30,

      // Token expiration is enforced in every environment.
      ignoreExpiration: false,
    },
  };
}

export const AuthConfig = loadAuthConfig();
