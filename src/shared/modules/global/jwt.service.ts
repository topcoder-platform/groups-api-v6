import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Algorithm, decode, verify, VerifyOptions, Secret } from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { ALL_SCOPE_MAPPINGS, Scope } from '../../enums/scopes.enum';
import { UserRole } from '../../enums/userRole.enum';
import { AuthConfig } from '../../config/auth.config';

export interface JwtUser {
  userId?: string;
  handle?: string;
  groupIds?: string[];
  roles?: UserRole[];
  scopes?: string[];
  isMachine: boolean;
}

export const isAdmin = (user: JwtUser): boolean => {
  return user.isMachine || (user.roles ?? []).includes(UserRole.Admin);
};

// Static tokens are available only to tests and never to a running service.
const TOKEN_ROLE_MAP: Record<string, string[]> = {
  'admin-token': [UserRole.Admin],
  'copilot-token': [UserRole.Copilot],
  'reviewer-token': [UserRole.Reviewer],
  'submitter-token': [UserRole.Submitter],
};

// Static M2M tokens are available only to tests and never to a running service.
const TEST_M2M_TOKENS: Record<string, string[]> = {
  'm2m-token-all': [Scope.AllGroups],
  'm2m-token-groups': [Scope.AllGroups],
};

const SCOPE_SYNONYMS: Record<string, string[]> = {
  'read:group': [Scope.ReadGroups],
  [Scope.ReadGroups]: ['read:group'],
  'write:group': [Scope.WriteGroups],
  [Scope.WriteGroups]: ['write:group'],
  'all:group': [Scope.AllGroups],
  [Scope.AllGroups]: ['all:group'],
};

@Injectable()
export class JwtService {
  private readonly jwksClients = new Map<string, jwksClient.JwksClient>();

  /**
   * Validates and extracts user information from a JWT token
   * @param token The JWT token to validate
   * @returns The user information extracted from the token
   */
  async validateToken(token: string): Promise<JwtUser> {
    try {
      const allowStaticTestTokens = process.env.NODE_ENV === 'test';

      if (allowStaticTestTokens && TOKEN_ROLE_MAP[token]) {
        return { roles: TOKEN_ROLE_MAP[token] as UserRole[], isMachine: false };
      }

      if (allowStaticTestTokens && TEST_M2M_TOKENS[token]) {
        const rawScopes = TEST_M2M_TOKENS[token];
        const scopes = this.expandScopes(rawScopes);
        return { scopes, isMachine: false };
      }

      let decodedToken: any;

      try {
        decodedToken = await this.verifySignedToken(token);
      } catch (error) {
        console.error('JWT verification failed:', error);
        throw new UnauthorizedException('Invalid token');
      }

      if (!decodedToken || typeof decodedToken === 'string') {
        throw new UnauthorizedException('Invalid token');
      }

      const user: JwtUser = { isMachine: false };

      // Check for M2M token from Auth0
      if (decodedToken.scope) {
        const scopeString = decodedToken.scope as string;
        const rawScopes = scopeString.split(' ');
        user.scopes = this.expandScopes(rawScopes);
        user.userId = decodedToken.sub;
        user.isMachine = true;
      } else {
        // Check for roles, userId and handle in a user token
        for (const key of Object.keys(decodedToken)) {
          if (key.endsWith('handle')) {
            user.handle = decodedToken[key] as string;
          }
          if (key.endsWith('userId')) {
            user.userId = decodedToken[key] as string;
          }
          if (key.endsWith('roles')) {
            user.roles = decodedToken[key] as UserRole[];
          }
        }
      }

      const groupIds = this.extractGroupIds(
        decodedToken as Record<string, unknown>,
      );
      if (groupIds.length > 0) {
        user.groupIds = groupIds;
      }

      return user;
    } catch (error) {
      console.error('Token validation failed:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Verifies a token with the standard v6 auth configuration.
   *
   * RS256 tokens use the allowlisted issuer's JWKS endpoint and must match the
   * configured Auth0 audience. Legacy HS256 user tokens use AUTH_SECRET; their
   * audience is checked when the token contains an audience claim.
   *
   * @param token The encoded JWT.
   * @returns The verified token payload.
   */
  private async verifySignedToken(
    token: string,
  ): Promise<Record<string, unknown>> {
    const decodedToken = decode(token, { complete: true });

    if (
      !decodedToken ||
      typeof decodedToken.payload === 'string' ||
      !decodedToken.payload
    ) {
      throw new UnauthorizedException('Invalid token');
    }

    const tokenPayload = decodedToken.payload as Record<string, unknown>;
    const issuer = tokenPayload.iss;
    const validIssuers = AuthConfig.validIssuers;

    if (
      typeof issuer !== 'string' ||
      validIssuers.length === 0 ||
      !validIssuers.includes(issuer)
    ) {
      throw new UnauthorizedException('Invalid token issuer');
    }

    const verifyOptions: VerifyOptions = {
      issuer: validIssuers as [string, ...string[]],
      clockTolerance: AuthConfig.jwt.clockTolerance,
      ignoreExpiration: AuthConfig.jwt.ignoreExpiration,
    };

    let signingKey: Secret;
    let algorithms: Algorithm[];

    if (decodedToken.header.alg === 'HS256') {
      if (!AuthConfig.authSecret) {
        throw new UnauthorizedException('Invalid token signing key');
      }

      signingKey = AuthConfig.authSecret;
      algorithms = ['HS256'];

      // Legacy Topcoder user/admin tokens do not contain an audience. If an
      // HS256 token does contain one, validate it against the global value.
      if (Object.prototype.hasOwnProperty.call(tokenPayload, 'aud')) {
        verifyOptions.audience = this.getConfiguredAudience();
      }
    } else if (decodedToken.header.alg === 'RS256') {
      if (!decodedToken.header.kid) {
        throw new UnauthorizedException('Invalid token: Missing key ID');
      }

      verifyOptions.audience = this.getConfiguredAudience();
      signingKey = await this.getSigningKey(issuer, decodedToken.header.kid);
      algorithms = ['RS256'];
    } else {
      throw new UnauthorizedException('Invalid token algorithm');
    }

    const verifiedToken = verify(token, signingKey, {
      ...verifyOptions,
      algorithms,
    });

    if (typeof verifiedToken === 'string') {
      throw new UnauthorizedException('Invalid token');
    }

    return verifiedToken as Record<string, unknown>;
  }

  /**
   * Gets the configured audience or fails closed when it is unavailable.
   *
   * @returns The AUTH0_AUDIENCE value.
   */
  private getConfiguredAudience(): string {
    const audience = AuthConfig.jwt.audience?.trim();

    if (!audience) {
      throw new UnauthorizedException('Invalid token audience configuration');
    }

    return audience;
  }

  /**
   * Gets the signing key from an allowlisted issuer.
   *
   * A separate cached JWKS client is used for each configured issuer.
   *
   * @param issuer The validated issuer from the token.
   * @param kid The Key ID from the JWT header
   * @returns A Promise that resolves to the signing key
   */
  private getSigningKey(issuer: string, kid: string): Promise<Secret> {
    const normalizedIssuer = issuer.replace(/\/$/, '');
    let client = this.jwksClients.get(normalizedIssuer);

    if (!client) {
      client = jwksClient({
        jwksUri: `${normalizedIssuer}/.well-known/jwks.json`,
        cache: true,
        rateLimit: true,
      });
      this.jwksClients.set(normalizedIssuer, client);
    }

    return new Promise((resolve, reject) => {
      client.getSigningKey(kid, (err, key) => {
        if (err || !key) {
          console.error('Error getting signing key:', err);
          return reject(
            new UnauthorizedException(
              'Invalid token: Unable to get signing key',
            ),
          );
        }

        // Get the public key using the proper method
        const signingKey = key.getPublicKey();

        if (!signingKey) {
          return reject(
            new UnauthorizedException(
              'Invalid token: Unable to get public key',
            ),
          );
        }

        resolve(signingKey);
      });
    });
  }

  /**
   * Expands all "all:*" scopes into their individual scopes
   * @param scopes The list of scopes to expand
   * @returns The expanded list of scopes
   */
  private expandScopes(scopes: string[]): string[] {
    const expandedScopes = new Set<string>();
    const queue = [...scopes];

    while (queue.length > 0) {
      const scope = queue.shift();
      if (!scope || expandedScopes.has(scope)) {
        continue;
      }

      expandedScopes.add(scope);

      const synonyms = SCOPE_SYNONYMS[scope] ?? [];
      synonyms.forEach((alias) => {
        if (!expandedScopes.has(alias)) {
          queue.push(alias);
        }
      });

      const mappedScopes = ALL_SCOPE_MAPPINGS[scope] ?? [];
      mappedScopes.forEach((alias) => {
        if (!expandedScopes.has(alias)) {
          queue.push(alias);
        }
      });
    }

    return Array.from(expandedScopes);
  }

  /**
   * Extracts caller group identifiers from known token claim keys.
   * @param decodedToken The decoded JWT payload.
   * @returns A deduplicated list of string group identifiers.
   */
  private extractGroupIds(decodedToken: Record<string, unknown>): string[] {
    const groupIds = new Set<string>();

    for (const key of Object.keys(decodedToken)) {
      const lowerKey = key.toLowerCase();
      const isGroupClaim =
        lowerKey === 'groups' ||
        lowerKey.endsWith('/groups') ||
        lowerKey.endsWith('groups') ||
        lowerKey.endsWith('groupids');

      if (!isGroupClaim) {
        continue;
      }

      const claimValue = decodedToken[key];
      if (!Array.isArray(claimValue)) {
        continue;
      }

      for (const value of claimValue) {
        if (typeof value === 'string' && value.trim().length > 0) {
          groupIds.add(value);
        }
      }
    }

    return Array.from(groupIds);
  }
}
