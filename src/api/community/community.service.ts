import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CommunityCriteria,
  CommunityListItemDto,
  CommunityMetaResponseDto,
} from 'src/dto/community.dto';
import { PaginatedResponse } from 'src/dto/pagination.dto';
import { PrismaService } from 'src/shared/modules/global/prisma.service';

/**
 * Handles retrieval of community metadata records from the database.
 */
@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists communities with pagination and optional filtering.
   * @param criteria Query criteria with pagination, hidden inclusion, and subdomain filter.
   * @param isAdmin Whether the caller has admin privileges.
   * @param callerGroupIds Group identifiers associated with the caller.
   * @returns A paginated response containing community list items.
   */
  async listCommunities(
    criteria: CommunityCriteria,
    isAdmin: boolean,
    callerGroupIds: string[],
  ): Promise<PaginatedResponse<CommunityListItemDto>> {
    const where: Prisma.CommunityMetadataWhereInput = {};
    const uniqueCallerGroupIds = Array.from(new Set(callerGroupIds));

    if (!(isAdmin && criteria.includeHidden)) {
      where.hidden = false;
    }

    if (criteria.subdomain) {
      where.subdomains = { has: criteria.subdomain };
    }

    where.OR = [
      {
        authorizedGroupIds: {
          isEmpty: true,
        },
      },
      ...(uniqueCallerGroupIds.length > 0
        ? [
            {
              authorizedGroupIds: {
                hasSome: uniqueCallerGroupIds,
              },
            },
          ]
        : []),
    ];

    const total = await this.prisma.communityMetadata.count({ where });
    const take = criteria.perPage;
    const skip = take * (criteria.page - 1);

    const data = await this.prisma.communityMetadata.findMany({
      where,
      take,
      skip,
      orderBy: {
        communityId: 'asc',
      },
      select: {
        communityId: true,
        communityName: true,
        description: true,
        image: true,
        subdomains: true,
        groupIds: true,
        authorizedGroupIds: true,
        hidden: true,
        menuItems: true,
        logos: true,
        footerText: true,
      },
    });

    const normalizedData: CommunityListItemDto[] = data.map((item) => ({
      ...item,
      menuItems: item.menuItems as unknown as CommunityListItemDto['menuItems'],
      logos: item.logos as unknown as CommunityListItemDto['logos'],
    }));

    return {
      data: normalizedData,
      page: criteria.page,
      perPage: criteria.perPage,
      total,
    };
  }

  /**
   * Finds group memberships for a caller when token claims do not provide group IDs.
   * @param memberId The caller member identifier.
   * @returns Group identifiers that include the caller as a member.
   */
  async getMemberGroupIds(memberId?: string): Promise<string[]> {
    if (!memberId) {
      return [];
    }

    const memberships = await this.prisma.groupMembership.findMany({
      where: { memberId },
      distinct: ['groupId'],
      select: { groupId: true },
    });

    return memberships.map((membership) => membership.groupId);
  }

  /**
   * Retrieves the full metadata record for a community.
   * @param communityId The community identifier.
   * @returns The full community metadata payload.
   * @throws NotFoundException When no community metadata exists for the given community identifier.
   */
  async getCommunityMeta(
    communityId: string,
  ): Promise<CommunityMetaResponseDto> {
    const metadata = await this.prisma.communityMetadata.findUnique({
      where: { communityId },
    });

    if (!metadata) {
      throw new NotFoundException(
        `Community metadata not found for communityId: ${communityId}`,
      );
    }

    return {
      ...metadata,
      challengeFilter:
        metadata.challengeFilter as CommunityMetaResponseDto['challengeFilter'],
      challengeListing:
        metadata.challengeListing as CommunityMetaResponseDto['challengeListing'],
      metadata: metadata.metadata as CommunityMetaResponseDto['metadata'],
      menuItems:
        metadata.menuItems as unknown as CommunityMetaResponseDto['menuItems'],
      logos: metadata.logos as unknown as CommunityMetaResponseDto['logos'],
      accessDeniedPage:
        metadata.accessDeniedPage as CommunityMetaResponseDto['accessDeniedPage'],
    };
  }
}
