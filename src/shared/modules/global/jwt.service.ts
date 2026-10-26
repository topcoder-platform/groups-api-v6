import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createJwtVerifier, type JwtVerifier } from 'tc-core-library-js';
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
  private verifier?: JwtVerifier;

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
        return { scopes, isMachine: true };
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

      user.isMachine = decodedToken.isMachine === true;
      user.scopes = this.expandScopes(decodedToken.scopes);
      const id = decodedToken.userId ?? decodedToken.sub;
      user.userId = id === undefined ? undefined : String(id);
      user.handle = decodedToken.handle;
      user.roles = decodedToken.roles as UserRole[];

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
    this.verifier ??= createJwtVerifier({
      VALID_ISSUERS: AuthConfig.validIssuers,
      AUTH_SECRET: AuthConfig.authSecret,
      AUTH0_AUDIENCE: AuthConfig.jwt.audience,
      JWT_AUDIENCE: process.env.JWT_AUDIENCE,
      clockTolerance: AuthConfig.jwt.clockTolerance,
    });
    return this.verifier.verify(token);
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
