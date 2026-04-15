import { Prisma, PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const prisma = new PrismaClient();

const ACTIVE_COMMUNITY_IDS = [
  'wipro',
  'veterans',
  'blockchain',
  'cognitive',
  'qa',
  'mobile',
  'iot',
  'community-2',
  'cs',
  'demo-expert',
  'srmx',
  'taskforce',
  'tc-prod-dev',
] as const;

interface CommunityMetadataSeedSource {
  communityId: string;
  communityName: string;
  description?: string;
  image?: string;
  subdomains?: string[];
  groupIds?: string[];
  authorizedGroupIds?: string[];
  terms?: number[];
  hidden?: boolean;
  hideSearch?: boolean;
  hideFilter?: boolean;
  chevronOverAvatar?: boolean;
  footerText?: string;
  leaderboardApiUrl?: string;
  newsFeed?: string;
  challengeFilter?: Record<string, unknown>;
  challengeListing?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  menuItems?: Record<string, unknown>[];
  logos?: Record<string, unknown>[];
  additionalLogos?: string[];
  accessDeniedPage?: Record<string, unknown>;
}

/**
 * Reads one community metadata JSON file from the community-app source folder.
 * @param communityId Community identifier used as directory name.
 * @returns Parsed metadata payload for the community.
 */
async function loadCommunityMetadata(
  communityId: string,
): Promise<CommunityMetadataSeedSource> {
  const metadataPath = resolve(
    __dirname,
    '../../community-app/src/server/tc-communities',
    communityId,
    'metadata.json',
  );
  const metadataContent = await readFile(metadataPath, 'utf8');
  return JSON.parse(metadataContent) as CommunityMetadataSeedSource;
}

/**
 * Maps raw metadata JSON into Prisma upsert data shape.
 * @param metadata Raw metadata loaded from metadata.json.
 * @returns Normalized data for create/update.
 */
function toCommunityUpsertData(metadata: CommunityMetadataSeedSource) {
  const data = {
    communityId: metadata.communityId,
    communityName: metadata.communityName,
    description: metadata.description ?? null,
    image: metadata.image ?? null,
    subdomains: metadata.subdomains ?? [],
    groupIds: metadata.groupIds ?? [],
    authorizedGroupIds: metadata.authorizedGroupIds ?? [],
    terms: metadata.terms ?? [],
    hidden: metadata.hidden ?? false,
    hideSearch: metadata.hideSearch ?? false,
    hideFilter: metadata.hideFilter ?? false,
    chevronOverAvatar: metadata.chevronOverAvatar ?? false,
    footerText: metadata.footerText ?? null,
    leaderboardApiUrl: metadata.leaderboardApiUrl ?? null,
    newsFeed: metadata.newsFeed ?? null,
    challengeFilter:
      metadata.challengeFilter === undefined
        ? undefined
        : (metadata.challengeFilter as Prisma.InputJsonValue),
    challengeListing:
      metadata.challengeListing === undefined
        ? undefined
        : (metadata.challengeListing as Prisma.InputJsonValue),
    metadata:
      metadata.metadata === undefined
        ? undefined
        : (metadata.metadata as Prisma.InputJsonValue),
    menuItems: (metadata.menuItems ?? []) as Prisma.InputJsonValue,
    logos: (metadata.logos ?? []) as Prisma.InputJsonValue,
    additionalLogos: metadata.additionalLogos ?? [],
    accessDeniedPage:
      metadata.accessDeniedPage === undefined
        ? undefined
        : (metadata.accessDeniedPage as Prisma.InputJsonValue),
  };

  return data;
}

/**
 * Seeds community metadata records for active communities.
 * @returns A promise that resolves when all upserts complete.
 */
async function main() {
  for (const communityId of ACTIVE_COMMUNITY_IDS) {
    const metadata = await loadCommunityMetadata(communityId);
    const data = toCommunityUpsertData(metadata);

    await prisma.communityMetadata.upsert({
      where: {
        communityId: data.communityId,
      },
      create: data,
      update: data,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
