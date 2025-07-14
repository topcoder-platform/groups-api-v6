/**
 * Enum defining all the possible scopes for M2M tokens
 */
export enum Scope {
  ReadGroups = 'read:groups',
  WriteGroups = 'write:groups',
  AllGroups = 'all:groups',
}

/**
 * Maps AllScope types to the corresponding individual scopes
 */
export const ALL_SCOPE_MAPPINGS: Record<string, string[]> = {
  [Scope.AllGroups]: [Scope.ReadGroups, Scope.WriteGroups],
};
