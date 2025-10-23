import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreateGroupDto, GroupResponseDto } from 'src/dto/group.dto';

import { CommonConfig } from 'src/shared/config/common.config';
import { GroupRole } from 'src/shared/enums/groupRole.enum';
import { MemberShipType } from 'src/shared/enums/memberShipType.enum';
import {
  JwtUser,
  isAdmin as checkIsAdmin,
} from 'src/shared/modules/global/jwt.service';
import { PrismaService } from 'src/shared/modules/global/prisma.service';

import {
  checkGroupExists,
  checkGroupName,
  deleteGroupCascade,
  hasGroupRole,
  postBusEvent,
} from 'src/shared/helper';

@Injectable()
export class SubGroupService {
  private readonly logger: Logger = new Logger(SubGroupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create sub group.
   * @param authUser auth user
   * @param groupId the group id
   * @param dto dto
   * @returns response
   */
  async createSubGroup(
    authUser: JwtUser,
    groupId: string,
    dto: CreateGroupDto,
  ): Promise<GroupResponseDto> {
    this.logger.debug(
      //eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
      `Create Sub Group - user - ${authUser} , groupId - ${groupId} , data -  ${JSON.stringify(dto)}`,
    );

    return this.prisma.$transaction(async (tx) => {
      const isAdmin = checkIsAdmin(authUser);

      if (
        !isAdmin &&
        !(await hasGroupRole(tx, groupId, authUser.userId, [
          GroupRole.GROUP_ADMIN,
        ]))
      ) {
        throw new ForbiddenException(
          'You are not allowed to perform this action!',
        );
      }

      await checkGroupExists(tx, groupId, isAdmin);

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

      const subGroup = await tx.group.create({ data: groupData });

      this.logger.debug(`SubGroup = ${JSON.stringify(subGroup)}`);

      const memberShip = await tx.groupMembership.create({
        data: {
          groupId,
          memberId: subGroup.id,
          membershipType: MemberShipType.GROUP,
          createdBy: authUser.userId || '00000000',
        },
      });

      await tx.group.update({
        where: {
          id: groupId,
        },
        data: {
          subGroups: {
            connect: { id: subGroup.id },
          },
        },
      });

      const result = {
        id: memberShip.id,
        groupId,
        subGroup,
      };

      await postBusEvent(CommonConfig.KAFKA_SUBGROUP_CREATE_TOPIC, result);

      return subGroup as GroupResponseDto;
    });
  }

  /**
   * Delete sub group
   * @param authUser auth user
   * @param groupId group id
   * @param subGroupId the sub group id
   * @returns the deleted group
   */
  async deleteSubGroup(authUser: JwtUser, groupId: string, subGroupId: string) {
    this.logger.debug(
      `Delete Sub Group - ${groupId}, Sub Group - ${subGroupId}`,
    );

    //eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.prisma.$transaction(async (tx) => {
      const isAdmin = checkIsAdmin(authUser);

      if (
        !isAdmin &&
        !(await hasGroupRole(tx, groupId, authUser.userId, [
          GroupRole.GROUP_ADMIN,
        ]))
      ) {
        throw new ForbiddenException(
          'You are not allowed to perform this action!',
        );
      }

      const group = await checkGroupExists(tx, groupId, isAdmin);
      await checkGroupExists(tx, subGroupId, isAdmin);

      const memberships = await tx.groupMembership.findMany({
        where: {
          groupId: groupId,
          memberId: subGroupId,
          membershipType: MemberShipType.GROUP,
        },
      });

      if (memberships.length === 0) {
        throw new BadRequestException(
          `The Group: ${subGroupId} is not the child of Group: ${subGroupId}`,
        );
      }

      const groupsDeleted = await deleteGroupCascade(tx, subGroupId);

      const kafkaPayload = {
        groupId,
        subGroup: groupsDeleted,
      };
      await postBusEvent(
        CommonConfig.KAFKA_SUBGROUP_DELETE_TOPIC,
        kafkaPayload,
      );

      return group; //eslint-disable-line @typescript-eslint/no-unsafe-return
    });
  }
}
