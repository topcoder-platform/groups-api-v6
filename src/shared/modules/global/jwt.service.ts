import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { auth, Principal } from 'tc-core-library-js';
import { ALL_SCOPE_MAPPINGS, Scope } from '../../enums/scopes.enum';
import { UserRole } from '../../enums/userRole.enum';
import { AuthConfig } from '../../config/auth.config';

/** Group-domain view of the shared verified principal; member IDs use this API's string representation. */
export interface JwtUser {
  userId?: string;
  handle?: string;
  groupIds?: string[];
  roles?: UserRole[];
  scopes?: string[];
  isMachine: boolean;
  principal?: Principal;
}

/** Return the existing group-resource administrator policy after route scopes have been enforced. */
export const isAdmin = (user: JwtUser): boolean => {
  return user.isMachine || (user.roles ?? []).includes(UserRole.Admin);
};

const SCOPE_SYNONYMS: Record<string, string[]> = {
  'read:group': [Scope.ReadGroups],
  [Scope.ReadGroups]: ['read:group'],
  'write:group': [Scope.WriteGroups],
  [Scope.WriteGroups]: ['write:group'],
  'all:group': [Scope.AllGroups],
  [Scope.AllGroups]: ['all:group'],
};

/** Adapts common token verification to Groups while preserving its explicit scope aliases. */
@Injectable()
export class JwtService implements OnModuleInit {
  private validator?: ReturnType<typeof auth.createValidator>;

  /** Initialize core after configuration loads; throws if Keycloak deployment settings are absent. */
  onModuleInit(): void {
    this.validator = auth.createValidator({
      AUTH_SECRET: AuthConfig.authSecret,
      VALID_ISSUERS: JSON.stringify(AuthConfig.validIssuers),
    });
  }

  /**
   * Verify a JWT through core and project the group-domain identity.
   * @param token Compact bearer JWT.
   * @returns Verified identity with explicit aliases expanded only for services.
   * @throws UnauthorizedException for invalid tokens or missing configuration.
   */
  async validateToken(token: string): Promise<JwtUser> {
    try {
      if (!this.validator) throw new Error('Validator unavailable');
      const principal = await this.validator.verify(token);
      const scopes = principal.isMachine ? this.expandScopes(principal.scopes) : [];
      return {
        principal: { ...principal, scopes },
        isMachine: principal.isMachine,
        scopes,
        roles: principal.roles as UserRole[],
        userId: principal.userId === undefined ? undefined : String(principal.userId),
        handle: principal.handle,
        groupIds: this.extractGroupIds(principal),
      };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
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
