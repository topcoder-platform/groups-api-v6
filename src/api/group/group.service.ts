import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  NotAcceptableException,
} from '@nestjs/common';
import { pick, uniq } from 'lodash';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import {
  CreateGroupDto,
  GroupCriteria,
  GetGroupCriteria,
  GroupResponseDto,
  UpdateGroupDto,
  PatchGroupDto,
  GetGroupResponseDto,
} from 'src/dto/group.dto';
import { PaginatedResponse } from 'src/dto/pagination.dto';
import { CommonConfig } from 'src/shared/config/common.config';
import { GroupStatus } from 'src/shared/enums/groupStatus.enum';
import {
  JwtUser,
  isAdmin as checkIsAdmin,
} from 'src/shared/modules/global/jwt.service';
import { PrismaService } from 'src/shared/modules/global/prisma.service';

import {
  omitAdminFields,
  checkGroupName,
  deleteGroupCascade,
  ensureGroupMember,
  parseCommaSeparatedString,
  postBusEvent,
} from 'src/shared/helper';

import { M2MService } from 'src/shared/modules/global/m2m.service';

const ADMIN_GROUP_FIELDS = ['status'];

export const ALLOWED_FIELD_NAMES = [
  'id',
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy',
  'name',
  'description',
  'privateGroup',
  'selfRegister',
  'domain',
  'organizationId',
  'oldId',
];

@Injectable()
export class GroupService {
  private readonly logger: Logger = new Logger(GroupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly m2mService: M2MService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Search groups
   * @param criteria query criteria
   */
  async search(
    criteria: GroupCriteria,
    isAdmin: boolean,
  ): Promise<PaginatedResponse<GroupResponseDto>> {
    this.logger.debug(`Search Group - Criteria - ${JSON.stringify(criteria)}`);

    if (
      (criteria.memberId || criteria.universalUID) &&
      !criteria.membershipType
    ) {
      throw new BadRequestException(
        'The membershipType parameter should be provided if memberId or universalUID is provided.',
      );
    }
    if (
      !(criteria.memberId || criteria.universalUID) &&
      criteria.membershipType
    ) {
      throw new BadRequestException(
        'The memberId or universalUID parameter should be provided if membershipType is provided.',
      );
    }

    const prismaFilter = {
      where: {},
    } as any;

    if (criteria.memberId || criteria.universalUID) {
      prismaFilter.where.members = {
        some: {
          membershipType: criteria.membershipType,
        },
      };

      if (criteria.universalUID) {
        const membersFound = await this.prisma.user.findMany({
          distinct: ['id'],
          where: {
            universalUID: criteria.universalUID,
          },
          select: {
            id: true,
          },
        });

        if (membersFound && membersFound.length > 0) {
          const memberIds = membersFound.map((item) => item.id);
          prismaFilter.where.members.some.memberId = {
            in: memberIds,
          };
        }
      }

      if (criteria.memberId) {
        prismaFilter.where.members.some.memberId = criteria.memberId;
      }
    }

    if (criteria.oldId) {
      prismaFilter.where.oldId = criteria.oldId;
    }
    if (criteria.name) {
      prismaFilter.where.name = {
        contains: criteria.name,
        mode: 'insensitive',
      };
    }
    if (criteria.ssoId) {
      prismaFilter.where.ssoId = {
        equals: criteria.ssoId,
        mode: 'insensitive',
      };
    }
    if (criteria.organizationId) {
      prismaFilter.where.organizationId = {
        equals: criteria.organizationId,
        mode: 'insensitive',
      };
    }
    if (criteria.selfRegister != undefined) {
      prismaFilter.where.selfRegister = criteria.selfRegister;
    }
    if (criteria.privateGroup != undefined) {
      prismaFilter.where.privateGroup = criteria.privateGroup;
    }
    if (!isAdmin) {
      prismaFilter.where.status = GroupStatus.ACTIVE;
    }

    const total = await this.prisma.group.count(prismaFilter);

    // prepare pagination
    const take = criteria.perPage;
    const skip = take * (criteria.page - 1);
    prismaFilter.take = take;
    prismaFilter.skip = skip;
    prismaFilter.orderBy = { oldId: 'desc' };

    // populate parent/sub groups
    if (criteria.includeParentGroup || criteria.includeSubGroups) {
      prismaFilter.include = {};
      if (criteria.includeParentGroup) {
        prismaFilter.include.parentGroups = true;
      }
      if (criteria.includeSubGroups) {
        prismaFilter.include.subGroups = true;
      }
    }

    this.logger.debug(`The prisma filter is: ${JSON.stringify(prismaFilter)}`);

    let groups = await this.prisma.group.findMany(prismaFilter);

    if (!isAdmin) {
      groups = groups.map((item) => {
        return omitAdminFields(item, ADMIN_GROUP_FIELDS);
      });
    }

    return {
      data: groups as any,
      page: criteria.page,
      perPage: criteria.perPage,
      total: total,
    };
  }

  /**
   * Get group by id
   * @param authUser the user
   * @param groupId group id
   * @param criteria the search criteria
   * @param oldId old id
   * @returns response dto
   */
  async getGroup(
    authUser: JwtUser,
    groupId: string,
    criteria: GetGroupCriteria,
    oldId?: string,
  ): Promise<GetGroupResponseDto> {
    const isAdmin = checkIsAdmin(authUser);
    this.logger.debug(
      //eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
      `Get Group - admin - ${isAdmin} - user - ${authUser} , groupId - ${groupId} , criteria -  ${JSON.stringify(criteria)}`,
    );

    if (criteria.includeSubGroups && criteria.includeParentGroup) {
      throw new BadRequestException(
        'includeSubGroups and includeParentGroup can not be both true',
      );
    }

    const selectFields =
      parseCommaSeparatedString(criteria.fields, ALLOWED_FIELD_NAMES) ||
      ALLOWED_FIELD_NAMES;

    const prismaFilter: any = {
      where: {
        id: groupId,
      },
    };

    if (oldId) {
      prismaFilter.where = {
        oldId: oldId,
      };
    }

    if (
      criteria.includeSubGroups ||
      criteria.includeParentGroup ||
      criteria.flattenGroupIdTree
    ) {
      prismaFilter.include = {};

      if (criteria.includeSubGroups || criteria.flattenGroupIdTree) {
        if (criteria.oneLevel) {
          prismaFilter.include.subGroups = true;
        } else {
          // max 3 level subGroups
          prismaFilter.include.subGroups = {
            include: {
              subGroups: {
                include: {
                  subGroups: true,
                },
              },
            },
          };
        }
      }

      if (criteria.includeParentGroup) {
        if (criteria.oneLevel) {
          prismaFilter.include.parentGroups = true;
        } else {
          // max 3 level parentGroups
          prismaFilter.include.parentGroups = {
            include: {
              parentGroups: {
                include: {
                  parentGroups: true,
                },
              },
            },
          };
        }
      }
    }

    let entity = await this.prisma.group.findFirst(prismaFilter);
    if (!entity) {
      throw new NotFoundException(`Not found group of id ${groupId}`);
    }

    // if the group is private, the user needs to be a member of the group, or an admin
    if (entity.privateGroup && !isAdmin) {
      await ensureGroupMember(this.prisma, groupId, authUser.userId || '');
    }

    if (criteria.flattenGroupIdTree) {
      const groupIdTree: string[] = [];
      const groupEntity = entity as any;
      // max 3 level subGroups
      if (groupEntity.subGroups) {
        groupEntity.subGroups.forEach((subGroupL1: any) => {
          groupIdTree.push(subGroupL1.id);
          if (subGroupL1.subGroups) {
            subGroupL1.subGroups.forEach((subGroupL2: any) => {
              groupIdTree.push(subGroupL2.id);
              if (subGroupL2.subGroups) {
                subGroupL2.subGroups.forEach((subGroupL3: any) => {
                  groupIdTree.push(subGroupL3.id);
                });
              }
            });
          }
        });
      }
      (entity as GetGroupResponseDto).flattenGroupIdTree = uniq(groupIdTree);
    }

    if (criteria.includeSubGroups) {
      selectFields.push('subGroups');
    }
    if (criteria.includeParentGroup) {
      selectFields.push('parentGroups');
    }
    if (criteria.flattenGroupIdTree) {
      selectFields.push('flattenGroupIdTree');
    }
    entity = pick(entity, selectFields) as any;

    if (!isAdmin) {
      entity = omitAdminFields(entity, ADMIN_GROUP_FIELDS);
    }

    return entity as GetGroupResponseDto;
  }

  /**
   * Create group.
   * @param authUser auth user
   * @param dto dto
   * @returns response
   */
  async createGroup(
    authUser: JwtUser,
    dto: CreateGroupDto,
  ): Promise<GroupResponseDto> {
    this.logger.debug(
      //eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
      `Create Group - user - ${authUser} , data -  ${JSON.stringify(dto)}`,
    );

    return this.prisma.$transaction(async (tx) => {
      await checkGroupName(dto.name, '', tx);

      // create group
      const createdBy = authUser.userId ? authUser.userId : '00000000';
      const createdAt = new Date().toISOString();
      const groupData = {
        ...dto,
        domain: dto.domain || '',
        ssoId: dto.ssoId || '',
        organizationId: dto.organizationId || '',
        createdBy,
        createdAt,
        // Initialize updated fields to match created fields on creation
        updatedBy: createdBy,
        updatedAt: createdAt,
      };

      const result = await tx.group.create({ data: groupData });

      await postBusEvent(CommonConfig.KAFKA_GROUP_CREATE_TOPIC, result);

      return result as GroupResponseDto;
    });
  }

  /**
   * Check the group  whether exists
   * @param groupId the group id
   * @param isAdmin the flag whether user is admin
   * @param prismaTx the prisma transaction
   */
  private async checkGroupExists(
    groupId: string,
    isAdmin: boolean,
    prismaTx?: any,
  ) {
    const prismaFilter = {
      where: {
        id: groupId,
        status: isAdmin ? undefined : GroupStatus.ACTIVE,
      },
    };

    const prismaIns = prismaTx ? prismaTx : this.prisma;

    const existing = await prismaIns.group.findUnique(prismaFilter);

    if (!existing) {
      throw new NotFoundException(`Not found group of id ${groupId}`);
    }

    //eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return existing;
  }

  /**
   * Update group by id
   * @param authUser auth user
   * @param groupId group id
   * @param dto update dto
   */
  async updateGroup(authUser: JwtUser, groupId: string, dto: UpdateGroupDto) {
    this.logger.debug(
      //eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
      `Update Group - user - ${authUser} , data -  ${JSON.stringify(dto)}`,
    );

    return this.prisma.$transaction(async (tx) => {
      const isAdmin = checkIsAdmin(authUser);
      const oldGroup = await this.checkGroupExists(groupId, isAdmin, tx);
      if (dto.name) {
        await checkGroupName(dto.name, groupId, tx);
      }
      const updatedBy = authUser.userId ?? '00000000';
      const entity = await tx.group.update({
        where: { id: groupId },
        data: {
          ...dto,
          domain: dto.domain || '',
          ssoId: dto.ssoId || '',
          organizationId: dto.organizationId || '',
          oldId: dto.oldId || '',
          updatedBy,
          updatedAt: new Date().toISOString(),
        },
      });

      await postBusEvent(CommonConfig.KAFKA_GROUP_UPDATE_TOPIC, {
        ...entity,
        oldName: oldGroup.name,
      });
      return entity;
    });
  }

  /**
   * Patch group by id
   * @param authUser auth user
   * @param groupId group id
   * @param dto patch dto
   */
  async patchGroup(authUser: JwtUser, groupId: string, dto: PatchGroupDto) {
    this.logger.debug(
      //eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
      `Patch Group - user - ${authUser} , data -  ${JSON.stringify(dto)}`,
    );

    return this.prisma.$transaction(async (tx) => {
      const updatedBy = authUser.userId ?? '00000000';
      const isAdmin = checkIsAdmin(authUser);
      await this.checkGroupExists(groupId, isAdmin, tx);
      const entity = await tx.group.update({
        where: { id: groupId },
        data: {
          oldId: dto.oldId,
          updatedBy,
          updatedAt: new Date().toISOString(),
        },
      });
      return entity;
    });
  }

  /**
   * Delete group by id
   * @param groupId group id
   * @param isAdmin the flag whether user is admin
   * @returns deleted group
   */
  async deleteGroup(groupId: string, isAdmin: boolean) {
    this.logger.debug(`Delete Group - ${groupId}`);
    //eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.prisma.$transaction(async (tx) => {
      const group = await this.checkGroupExists(groupId, isAdmin, tx);

      //check if group is associated with challenges or not; if yes, don't delete the group else delete
      const token = await this.m2mService.getM2MToken();

      const challengeFilterURL =
        CommonConfig.CHALLENGE_API_URL + `?groups=["${groupId}"]`;

      const challenges = (await lastValueFrom(
        this.httpService.get<object[]>(challengeFilterURL, {
          headers: {
            'User-Agent': 'Request-Promise',
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
        }),
      )) as any;

      if (challenges && challenges.data && challenges.data.length > 0) {
        throw new NotAcceptableException(
          `group ${groupId} is associated with challenges and can not be deleted`,
        );
      }

      const deletedGroups = deleteGroupCascade(tx, groupId);

      const kafkaPayload = {
        groups: deletedGroups,
      };

      await postBusEvent(CommonConfig.KAFKA_GROUP_DELETE_TOPIC, kafkaPayload);

      //eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return group;
    });
  }
}
