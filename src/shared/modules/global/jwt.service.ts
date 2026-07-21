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

      // Match the shared v6 authenticator's client-credentials classification.
      if (this.isMachineTokenPayload(decodedToken)) {
        const rawScopes = this.extractScopes(decodedToken);
        user.scopes = this.expandScopes(rawScopes);
        if (typeof decodedToken.sub === 'string') {
          user.userId = decodedToken.sub;
        }
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
   * RS256 tokens use the allowlisted issuer's JWKS endpoint. Legacy HS256
   * tokens use AUTH_SECRET. Both token types validate issuer and expiration;
   * genuine client-credentials tokens must also match AUTH0_AUDIENCE.
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

    if (this.isClientCredentialsGrant(tokenPayload)) {
      verifyOptions.audience = this.getConfiguredAudience();
    }

    let signingKey: Secret;
    let algorithms: Algorithm[];

    if (decodedToken.header.alg === 'HS256') {
      if (!AuthConfig.authSecret) {
        throw new UnauthorizedException('Invalid token signing key');
      }

      signingKey = AuthConfig.authSecret;
      algorithms = ['HS256'];
    } else if (decodedToken.header.alg === 'RS256') {
      if (!decodedToken.header.kid) {
        throw new UnauthorizedException('Invalid token: Missing key ID');
      }

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
   * Determines whether a payload represents a shared v6 M2M token.
   *
   * User tokens can also contain OAuth scopes, so scopes alone are not a
   * machine-token marker. This mirrors tc-core's client-credentials check by
   * requiring scopes and the grant type while excluding user IDs and roles.
   *
   * @param payload The decoded JWT payload.
   * @returns Whether the payload should be authorized as an M2M caller.
   */
  private isMachineTokenPayload(payload: Record<string, unknown>): boolean {
    const hasUserId = this.findClaim(payload, 'userId') !== undefined;
    const roles = this.findClaim(payload, 'roles');
    const hasRoles = roles !== undefined;

    return (
      this.isClientCredentialsGrant(payload) &&
      this.extractScopes(payload).length > 0 &&
      !hasUserId &&
      !hasRoles
    );
  }

  /**
   * Determines whether a payload was issued through client credentials.
   *
   * This intentionally controls audience validation independently from M2M
   * authorization so an unusual client token cannot bypass AUTH0_AUDIENCE by
   * carrying user-like claims.
   *
   * @param payload The decoded JWT payload.
   * @returns Whether the grant type is client credentials.
   */
  private isClientCredentialsGrant(payload: Record<string, unknown>): boolean {
    return this.findClaim(payload, 'gty') === 'client-credentials';
  }

  /**
   * Extracts OAuth scopes from standard or namespaced JWT claims.
   *
   * @param payload The decoded JWT payload.
   * @returns A deduplicated list of non-empty scopes.
   */
  private extractScopes(payload: Record<string, unknown>): string[] {
    const scopeClaim =
      this.findClaim(payload, 'scope') ?? this.findClaim(payload, 'scopes');
    const rawScopes = Array.isArray(scopeClaim)
      ? scopeClaim
      : typeof scopeClaim === 'string'
        ? scopeClaim.split(/\s+/)
        : [];

    return Array.from(
      new Set(
        rawScopes
          .filter((scope): scope is string => typeof scope === 'string')
          .map((scope) => scope.trim())
          .filter((scope) => scope.length > 0),
      ),
    );
  }

  /**
   * Finds either a standard claim or its namespaced equivalent.
   *
   * @param payload The decoded JWT payload.
   * @param claimName The unqualified claim name.
   * @returns The claim value when present.
   */
  private findClaim(
    payload: Record<string, unknown>,
    claimName: string,
  ): unknown {
    const key = Object.keys(payload).find(
      (candidate) =>
        candidate === claimName || candidate.endsWith(`/${claimName}`),
    );

    return key ? payload[key] : undefined;
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
