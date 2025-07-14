import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { remove, some } from 'lodash';
import {
  GroupRoleDto,
  GroupRoleResponseDto,
  GroupRoleCriteria,
} from 'src/dto/groupRole.dto';
import { PaginatedResponse } from 'src/dto/pagination.dto';
import { CommonConfig } from 'src/shared/config/common.config';
import { MemberShipType } from 'src/shared/enums/memberShipType.enum';
import {
  JwtUser,
  isAdmin as checkIsAdmin,
} from 'src/shared/modules/global/jwt.service';
import { PrismaService } from 'src/shared/modules/global/prisma.service';

import {
  checkGroupExists,
  ensureUserExists,
  postBusEvent,
} from 'src/shared/helper';

@Injectable()
export class GroupRoleService {
  private readonly logger: Logger = new Logger(GroupRoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get group role by user id
   * @param userId user id
   * @param criteria the search criteria
   * @returns response dto
   */
  async getGroupRole(
    userId: string,
    criteria: GroupRoleCriteria,
  ): Promise<PaginatedResponse<GroupRoleResponseDto>> {
    this.logger.debug(
      `Get Group Role - UserId - ${userId} , Criteria - ${JSON.stringify(criteria)}`,
    );

    const prismaFilter = {
      where: {
        memberId: userId,
        membershipType: MemberShipType.USER,
        roles: {
          not: null,
        },
      },
    } as any;

    const total = await this.prisma.groupMembership.count(prismaFilter);

    // prepare pagination
    const take = criteria.perPage;
    const skip = take * (criteria.page - 1);
    prismaFilter.take = take;
    prismaFilter.skip = skip;
    prismaFilter.orderBy = { groupId: 'desc' };

    const groupRoles = await this.prisma.groupMembership.findMany(prismaFilter);

    const result: any[] = [];
    groupRoles.forEach((entity: any) => {
      if (entity.roles && entity.roles.length > 0) {
        entity.roles.forEach((item) => {
          result.push({
            groupId: entity.groupId,
            role: item.role,
            createdBy: item.createdBy,
            createdAt: item.createdAt,
          });
        });
      }
    });

    return {
      data: result as any,
      page: criteria.page,
      perPage: criteria.perPage,
      total: total,
    };
  }

  /**
   * Add group role.
   * @param authUser auth user
   * @param dto dto
   * @returns response
   */
  async addGroupRole(
    authUser: JwtUser,
    userId: string,
    dto: GroupRoleDto,
  ): Promise<GroupRoleResponseDto> {
    this.logger.debug(
      `Add Group Role - user - ${userId} , group - ${dto.groupId}, role - ${dto.role}`,
    );

    const isAdmin = checkIsAdmin(authUser);
    return this.prisma.$transaction(async (tx) => {
      await checkGroupExists(tx, dto.groupId, isAdmin);
      await ensureUserExists(tx, userId, authUser);

      const prismaFilter = {
        where: {
          groupId: dto.groupId,
          memberId: userId,
          membershipType: MemberShipType.USER,
        },
      } as any;

      const membership =
        await this.prisma.groupMembership.findFirst(prismaFilter);

      if (!membership) {
        throw new BadRequestException(
          `Not found Relation between member: ${userId} and Group: ${dto.groupId}`,
        );
      }

      const roles = (membership.roles || []) as any[];
      if (some(roles, { role: dto.role })) {
        throw new ConflictException(
          `The group role: ${dto.role} of the member: ${userId} is already in the group: ${dto.groupId}`,
        );
      }

      const roleObj = {
        role: dto.role,
        createdAt: new Date().toISOString(),
        createdBy: authUser.userId ? authUser.userId : '00000000',
      };
      roles.push(roleObj);

      await tx.groupMembership.update({
        where: {
          id: membership.id,
        },
        data: {
          roles,
          updatedBy: authUser.userId ? authUser.userId : '00000000',
        },
      });

      const result = {
        id: membership.id,
        userId,
        groupId: dto.groupId,
        role: dto.role,
      };

      await postBusEvent(
        CommonConfig.KAFKA_GROUP_MEMBER_ROLE_ADD_TOPIC,
        result,
      );

      return result;
    });
  }

  /**
   * Delete group role
   * @param authUser auth user
   * @param userId: string,
   * @param dto dto
   * @returns response
   */
  async deleteGroupRole(authUser: JwtUser, userId: string, dto: GroupRoleDto) {
    this.logger.debug(
      `Delete Group Role - user - ${userId} , group - ${dto.groupId}, role - ${dto.role}`,
    );
    const isAdmin = checkIsAdmin(authUser);
    return this.prisma.$transaction(async (tx) => {
      await checkGroupExists(tx, dto.groupId, isAdmin);
      await ensureUserExists(tx, userId, authUser);

      const prismaFilter = {
        where: {
          groupId: dto.groupId,
          memberId: userId,
          membershipType: MemberShipType.USER,
        },
      } as any;

      const membership =
        await this.prisma.groupMembership.findFirst(prismaFilter);

      if (!membership) {
        throw new BadRequestException(
          `Not found Relation between member: ${userId} and Group: ${dto.groupId}`,
        );
      }

      const roles = (membership.roles || []) as any[];
      if (!some(roles, { role: dto.role })) {
        throw new BadRequestException(
          `Not found Group Role: ${dto.role} of Member: ${userId} in the Group ${dto.groupId}`,
        );
      }

      remove(roles, (r) => r.role === dto.role);

      this.logger.debug(
        `Membership ${JSON.stringify(membership)} to delete role ${dto.role}`,
      );

      await tx.groupMembership.update({
        where: {
          id: membership.id,
        },
        data: {
          roles: (roles.length > 0 ? roles : null) as any,
          updatedBy: authUser.userId ? authUser.userId : '00000000',
        },
      });

      const result = {
        id: membership.id,
        userId,
        groupId: dto.groupId,
        role: dto.role,
      };

      await postBusEvent(
        CommonConfig.KAFKA_GROUP_MEMBER_ROLE_DELETE_TOPIC,
        result,
      );

      return result;
    });
  }
}
