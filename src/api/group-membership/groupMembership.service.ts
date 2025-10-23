import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { includes, sortBy, uniq } from 'lodash';
import { validate } from 'uuid';
import {
  AddGroupMemberDto,
  GroupMemberResponseDto,
  GroupMemberCriteria,
  DeleteGroupMemberDto,
  DeleteGroupMemberBulkDto,
  GetMemberGroupsDto,
  GetGroupMembersCountDto,
  ListGroupsMemberCountDto,
  GroupValidityCheckResponseDto,
} from 'src/dto/groupMembership.dto';
import { PaginatedResponse } from 'src/dto/pagination.dto';
import { CommonConfig } from 'src/shared/config/common.config';
import { GroupStatus } from 'src/shared/enums/groupStatus.enum';
import { GroupRole } from 'src/shared/enums/groupRole.enum';
import { MemberShipType } from 'src/shared/enums/memberShipType.enum';
import {
  JwtUser,
  isAdmin as checkIsAdmin,
} from 'src/shared/modules/global/jwt.service';
import { PrismaService } from 'src/shared/modules/global/prisma.service';

import {
  checkGroupExists,
  checkGroupMember,
  ensureGroupMember,
  ensureUserExists,
  hasGroupRole,
  postBusEvent,
} from 'src/shared/helper';

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
export class GroupMembershipService {
  private readonly logger: Logger = new Logger(GroupMembershipService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get group members by group id
   * @param authUser the user
   * @param groupId group id
   * @param criteria the search criteria
   * @returns response dto
   */
  async getGroupMembers(
    authUser: JwtUser,
    groupId: string,
    criteria: GroupMemberCriteria,
  ): Promise<PaginatedResponse<GroupMemberResponseDto>> {
    this.logger.debug(
      `Get Group Member - GroupId - ${groupId} , Criteria - ${JSON.stringify(criteria)}`,
    );
    const isAdmin = checkIsAdmin(authUser);

    const group = await checkGroupExists(this.prisma, groupId, isAdmin);

    if (group.privateGroup && !isAdmin) {
      await checkGroupMember(this.prisma, groupId, authUser.userId || '');
    }

    const prismaFilter = {
      where: {
        groupId: groupId,
      },
    } as any;

    const total = await this.prisma.groupMembership.count(prismaFilter);

    // prepare pagination
    const take = criteria.perPage;
    const skip = take * (criteria.page - 1);
    prismaFilter.take = take;
    prismaFilter.skip = skip;

    let memberships: any =
      await this.prisma.groupMembership.findMany(prismaFilter);

    //eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const memberIds = memberships.map((entity) => entity.memberId);

    const members = await this.prisma.user.findMany({
      where: {
        id: {
          in: memberIds,
        },
      },
    });

    memberships = memberships.map((entity) => {
      const member = members.find((item) => item.id === entity.memberId);
      return this.mapGroupMember(entity, group.name, member?.universalUID);
    });

    return {
      data: memberships,
      page: criteria.page,
      perPage: criteria.perPage,
      total: total,
    };
  }

  /**
   * Get group member
   * @param authUser the user
   * @param groupId group id
   * @param memberId member id
   * @returns response dto
   */
  async getGroupMember(authUser: JwtUser, groupId: string, memberId: string) {
    const isAdmin = checkIsAdmin(authUser);
    const group = await checkGroupExists(this.prisma, groupId, isAdmin);

    if (group.privateGroup && !isAdmin) {
      await ensureGroupMember(this.prisma, groupId, authUser.userId || '');
    }

    const entity = await this.prisma.groupMembership.findFirst({
      where: {
        groupId: groupId,
        memberId: memberId,
      },
    });

    if (!entity) {
      throw new NotFoundException('The member is not in the group');
    }

    const member = await this.prisma.user.findUnique({
      where: {
        id: memberId,
      },
    });

    return this.mapGroupMember(entity, group.name, member?.universalUID);
  }

  /**
   * Check the group name whether exists
   * @param name the group name
   * @param groupId the group id
   * @param prismaTx the prisma transaction
   */
  private mapGroupMember(
    entity: any,
    groupName: string,
    universalUID?: string,
  ) {
    return {
      id: entity.id,
      groupId: entity.groupId,
      groupName: groupName,
      memberId: entity.memberId,
      universalUID: universalUID || '',
      membershipType: entity.membershipType,
      createdAt: entity.createdAt,
      createdBy: entity.createdBy,
    };
  }

  /**
   * Add group member
   * @param authUser the user
   * @param groupId group id
   * @param dto the dto
   * @returns response dto
   */
  async addGroupMember(
    authUser: JwtUser,
    groupId: string,
    dto: AddGroupMemberDto,
  ) {
    this.logger.debug(
      //eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
      `Enter in addGroupMember - Group = ${groupId} Data = ${dto}`,
    );
    const isAdmin = checkIsAdmin(authUser);

    if (!dto.memberId && !dto.universalUID) {
      throw new BadRequestException(
        'memberId and universalUID should provide one at least',
      );
    }
    if (!dto.membershipType) {
      throw new BadRequestException('membershipType should not be null');
    }

    return this.prisma.$transaction(async (tx) => {
      const group = await checkGroupExists(tx, groupId, isAdmin);

      let memberOldId;

      const memberId = dto.memberId
        ? dto.memberId
        : (dto.universalUID as string);

      if (
        !isAdmin &&
        !(await hasGroupRole(tx, groupId, authUser.userId, [
          GroupRole.GROUP_ADMIN,
          GroupRole.GROUP_MANAGER,
        ])) &&
        !(
          group.selfRegister &&
          dto.membershipType === MemberShipType.USER &&
          authUser.userId === memberId
        )
      ) {
        throw new ForbiddenException(
          'You are not allowed to perform this action!',
        );
      }

      if (dto.membershipType === MemberShipType.GROUP) {
        if (memberId === groupId) {
          throw new BadRequestException('A group can not add to itself.');
        }
        this.logger.debug(`Check for groupId ${memberId} exist or not`);
        const childGroup = await checkGroupExists(tx, memberId, false);

        memberOldId = childGroup.oldId;
        // if parent group is private, the sub group must be private too
        if (group.privateGroup && !childGroup.privateGroup) {
          throw new ConflictException(
            'Parent group is private, the child group must be private too.',
          );
        }
      } else {
        this.logger.debug(`Check for memberId ${memberId} exist or not`);
        await ensureUserExists(tx, memberId, authUser);
      }

      this.logger.debug(`check member ${memberId} is part of group ${groupId}`);

      const record = await tx.groupMembership.findFirst({
        where: {
          groupId: groupId,
          memberId: memberId,
        },
      });

      if (record) {
        throw new ConflictException('The member is already in the group');
      }

      const addResult = await tx.groupMembership.create({
        data: {
          groupId,
          memberId,
          membershipType: dto.membershipType || '',
          createdBy: authUser.userId || '00000000',
        },
      });

      if (dto.membershipType === MemberShipType.GROUP) {
        await tx.group.update({
          where: {
            id: groupId,
          },
          data: {
            subGroups: {
              connect: { id: memberId },
            },
          },
        });
      }

      const result = {
        ...addResult,
        oldId: group.oldId,
        name: group.name,
        universalUID: dto.universalUID,
        memberOldId,
      };

      this.logger.debug(
        `sending message ${JSON.stringify(result)} to kafka topic ${CommonConfig.KAFKA_GROUP_MEMBER_ADD_TOPIC}`,
      );
      await postBusEvent(CommonConfig.KAFKA_GROUP_MEMBER_ADD_TOPIC, result);

      return result;
    });
  }

  /**
   * Add group members
   * @param authUser the user
   * @param groupId group id
   * @param dto the dto
   * @returns response dto
   */
  async addGroupMemberBulk(
    authUser: JwtUser,
    groupId: string,
    dto: AddGroupMemberDto,
  ) {
    this.logger.debug(
      `Enter in addGroupMemberBulk - Group = ${groupId} Data = ${JSON.stringify(dto)}`,
    );

    const dtoMembers = [...(dto.members || [])];
    const membersAddRes = (await Promise.allSettled(
      dtoMembers.map((member) =>
        this.addGroupMember(authUser, groupId, member),
      ),
    )) as any;

    const result: any = {};
    result.groupId = groupId;

    const members = dtoMembers.map((member, i) => {
      if (membersAddRes[i].status === 'fulfilled') {
        return {
          memberId: member.memberId,
          status: 'success',
        };
      } else {
        return {
          memberId: member.memberId,
          status: 'failed',
          message: membersAddRes[i].reason.message,
        };
      }
    });

    result.members = members;

    //eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
  }

  /**
   * Delete group member
   * @param authUser the user
   * @param groupId group id
   * @param memberId member id
   * @param dto the dto
   * @returns response dto
   */
  async deleteGroupMember(
    authUser: JwtUser,
    groupId: string,
    memberId: string,
    dto?: DeleteGroupMemberDto,
  ) {
    this.logger.debug(
      `Enter in deleteGroupMember - Group = ${groupId} memberId = ${memberId}`,
    );
    const isAdmin = checkIsAdmin(authUser);

    return this.prisma.$transaction(async (tx) => {
      this.logger.debug(`Check for groupId ${groupId} exist or not`);
      const group = await checkGroupExists(tx, groupId, isAdmin);

      const universalUID = dto ? dto.universalUID : null;

      if (
        !isAdmin &&
        !(await hasGroupRole(tx, groupId, authUser.userId, [
          GroupRole.GROUP_ADMIN,
          GroupRole.GROUP_MANAGER,
        ])) &&
        !(group.selfRegister && authUser.userId === memberId)
      ) {
        throw new ForbiddenException(
          'You are not allowed to perform this action!',
        );
      }

      let oldMemberId = memberId;

      if (validate(memberId)) {
        const getMember = await checkGroupExists(tx, memberId, false);
        //eslint-disable-next-line @typescript-eslint/no-unused-vars
        oldMemberId = getMember.oldId;
      }

      // delete membership
      // no need delete relationship about universalUID
      // universalUID is only a field in Use table
      // current relationship is base on memberId, there is no relationship between group and user directly.
      // so just ignore original code, but I also keep original codes as comment

      // if (universalUID) {
      //   const query = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o {universalUID: {universalUID}}) DELETE r'
      //   await tx.run(query, { groupId, universalUID })

      //   const matchClause = 'MATCH (u:User {universalUID: {universalUID}})'
      //   const params = { universalUID }

      //   const res = await tx.run(`${matchClause} RETURN u.id as memberId`, params)
      //   memberId = _.head(_.head(res.records)._fields)
      // } else {
      //   const query = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o {id: {memberId}}) DELETE r'
      //   await tx.run(query, { groupId, memberId })
      // }

      const affectRows = await tx.groupMembership.findMany({
        where: {
          groupId: groupId,
          memberId: memberId,
        },
      });

      const affectGroupIds: { id: string }[] = [];
      affectRows.forEach((item) => {
        //eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        if (item.membershipType === MemberShipType.GROUP) {
          affectGroupIds.push({ id: item.memberId });
        }
      });

      await tx.groupMembership.deleteMany({
        where: {
          groupId: groupId,
          memberId: memberId,
        },
      });

      if (affectGroupIds.length > 0) {
        await tx.group.update({
          where: {
            id: groupId,
          },
          data: {
            subGroups: {
              disconnect: affectGroupIds,
            },
          },
        });
      }

      const result = {
        groupId,
        name: group.name,
        oldId: group.oldId,
        memberId,
        universalUID,
      };

      this.logger.debug(
        `sending message ${JSON.stringify(result)} to kafka topic ${CommonConfig.KAFKA_GROUP_MEMBER_DELETE_TOPIC}`,
      );
      await postBusEvent(CommonConfig.KAFKA_GROUP_MEMBER_DELETE_TOPIC, result);

      return result;
    });
  }

  /**
   * Delete group members in bulk.
   * @param authUser the user
   * @param groupId group id
   * @param dto the dto
   * @returns response dto
   */
  async deleteGroupMemberBulk(
    authUser: JwtUser,
    groupId: string,
    dto: DeleteGroupMemberBulkDto,
  ) {
    this.logger.debug(
      `Enter in deleteGroupMemberBulk - Group = ${groupId} Data = ${JSON.stringify(dto)}`,
    );

    const membersAddRes = (await Promise.allSettled(
      dto.members.map((member) =>
        this.deleteGroupMember(authUser, groupId, member),
      ),
    )) as any;

    const result: any = {};
    result.groupId = groupId;

    const members = dto.members.map((member, i) => {
      if (membersAddRes[i].status === 'fulfilled') {
        return {
          memberId: member,
          status: 'success',
        };
      } else {
        return {
          memberId: member,
          status: 'failed',
          message: membersAddRes[i].reason.message,
        };
      }
    });

    result.members = members;

    //eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
  }

  /**
   * Get member groups
   * @param memberId member id
   * @param dto the dto
   * @returns response dto
   */
  async getMemberGroups(memberId: string, dto: GetMemberGroupsDto) {
    const returnUuid = dto.uuid;
    const memberships = await this.prisma.groupMembership.findMany({
      where: {
        memberId: memberId,
        group: {
          status: GroupStatus.ACTIVE,
          oldId: {
            not: null,
          },
        },
      },
    });

    const groupIds = memberships.map((item) => item.groupId);

    // search max 3 levels
    const groupRes = await this.prisma.group.findMany({
      where: {
        id: {
          in: groupIds,
        },
      },
      include: {
        parentGroups: {
          include: {
            parentGroups: true,
          },
        },
      },
    });

    const groups: any[] = [];
    groupRes.forEach((groupL1) => {
      if (groupL1.status === GroupStatus.ACTIVE && groupL1.oldId) {
        groups.push(groupL1);
      }
      groupL1.parentGroups.forEach((groupL2) => {
        if (groupL2.status === GroupStatus.ACTIVE && groupL2.oldId) {
          groups.push(groupL2);
        }
        groupL2.parentGroups.forEach((groupL3) => {
          if (groupL3.status === GroupStatus.ACTIVE && groupL3.oldId) {
            groups.push(groupL3);
          }
        });
      });
    });

    let result;
    if (returnUuid) {
      sortBy(groups, 'id');
      //eslint-disable-next-line @typescript-eslint/no-unsafe-return
      result = groups.map((item) => item.id);
    } else {
      sortBy(groups, 'oldId');
      //eslint-disable-next-line @typescript-eslint/no-unsafe-return
      result = groups.map((item) => item.oldId);
    }

    return uniq(result);
  }

  /**
   * Get distinct user members count of given group. Optionally may include sub groups.
   * @param groupId group id
   * @param dto the dto
   * @returns the group members count data
   */
  async getGroupMembersCount(groupId: string, dto: GetGroupMembersCountDto) {
    await checkGroupExists(this.prisma, groupId, false);

    let count;
    if (dto.includeSubGroups) {
      const countFilter = {
        by: ['groupId'],
        where: {
          group: {
            status: GroupStatus.ACTIVE,
            oldId: {
              not: null,
            },
          },
        },
        _count: {
          memberId: true,
        },
      } as any;

      const countMap = await this.prisma.groupMembership.groupBy(countFilter);

      const group = await this.prisma.group.findUnique({
        where: {
          id: groupId,
        },
        include: {
          subGroups: {
            include: {
              subGroups: {
                include: {
                  subGroups: true,
                },
              },
            },
          },
        },
      });

      const result = this.countGroupMember(group, countMap);
      count = result.count;
    } else {
      count = await this.prisma.groupMembership.count({
        where: {
          groupId: groupId,
        },
      });
    }

    return { count };
  }

  /**
   * Count the group members
   * @param groupItem group item
   * @param countMap the count map
   */
  private countGroupMember(groupItem: any, countMap: any[]) {
    let childrenIds: string[] = [];

    groupItem.subGroups.forEach((groupL1) => {
      childrenIds.push(groupL1.id);
      groupL1.subGroups.forEach((groupL2) => {
        childrenIds.push(groupL2.id);
        groupL2.subGroups.forEach((groupL3) => {
          childrenIds.push(groupL3.id);
        });
      });
    });

    let count = 0;
    const rootGroup: any = countMap.find(
      (item2) => item2.groupId === groupItem.id,
    );
    if (rootGroup) {
      count = rootGroup._count.memberId;
    }

    childrenIds = uniq(childrenIds);
    childrenIds.forEach((itemId) => {
      const found: any = countMap.find((item2) => item2.groupId === itemId);
      if (found) {
        count += found._count.memberId + 1;
      } else {
        count += 1;
      }
    });

    return {
      groupId: groupItem.id,
      oldId: groupItem.oldId,
      count: count,
      // children: childrenIds
    };
  }

  /**
   * Get distinct user members count of given group. Optionally may include sub groups.
   * @param groupId group id
   * @param dto the dto
   * @returns the group members count data
   */
  async listGroupsMemberCount(dto: ListGroupsMemberCountDto) {
    let memberIds;
    if (dto.universalUID) {
      const memberIdRes = await this.prisma.groupMembership.findMany({
        distinct: ['memberId'],
        where: {
          membershipType: MemberShipType.USER,
        },
        select: {
          memberId: true,
        },
      });

      const tmpMemberIds = memberIdRes.map((item) => item.memberId);

      const filteredMembers = await this.prisma.user.findMany({
        distinct: ['id'],
        where: {
          id: {
            in: tmpMemberIds,
          },
          universalUID: dto.universalUID,
        },
      });

      memberIds = filteredMembers.map((item) => item.id);
    }

    const countFilter = {
      by: ['groupId'],
      where: {
        group: {
          status: GroupStatus.ACTIVE,
          oldId: {
            not: null,
          },
          organizationId: dto.organizationId,
        },
      },
      _count: {
        memberId: true,
      },
    } as any;

    if (dto.includeSubGroups) {
      const countMap = await this.prisma.groupMembership.groupBy(countFilter);
      const rootGroupIds = countMap.map((item) => item.groupId);
      const groupMap = await this.prisma.group.findMany({
        where: {
          id: {
            in: rootGroupIds,
          },
        },
        include: {
          subGroups: {
            include: {
              subGroups: {
                include: {
                  subGroups: true,
                },
              },
            },
          },
        },
      });

      const groupWithChildren = groupMap.map((groupItem) =>
        this.countGroupMember(groupItem, countMap),
      );

      return groupWithChildren;
    } else {
      if (memberIds && memberIds.length > 0) {
        countFilter.where.memberId = {
          in: memberIds,
        };
      }

      const countRes = await this.prisma.groupMembership.groupBy(countFilter);

      const groupIds = countRes.map((item) => item.groupId);

      const groupRes = await this.prisma.group.findMany({
        where: {
          id: {
            in: groupIds,
          },
        },
      });

      const result = countRes.map((item: any) => {
        const found = groupRes.find((item2) => item2.id === item.groupId);
        return {
          id: item.groupId,
          oldId: found?.oldId,
          count: item._count.memberId,
        };
      });

      return result;
    }
  }

  /**
   * Add group role.
   * @param authUser auth user
   * @param dto dto
   * @returns response
   */
  async groupValidityCheck(
    memberId: string,
    groupId: string,
  ): Promise<GroupValidityCheckResponseDto> {
    const groupIds = await this.getMemberGroups(memberId, { uuid: false });
    const validOrNot = includes(groupIds, groupId);
    return { check: validOrNot };
  }
}
