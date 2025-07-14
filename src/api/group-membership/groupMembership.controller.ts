import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  GroupMemberCriteria,
  GroupMemberResponseDto,
  AddGroupMemberDto,
  DeleteGroupMemberDto,
  DeleteGroupMemberBulkDto,
  GroupMemberBulkResponseDto,
  GetMemberGroupsDto,
  GetGroupMembersCountDto,
  CountResponseDto,
  ListGroupsMemberCountDto,
  GroupValidityCheckResponseDto,
} from 'src/dto/groupMembership.dto';
import { UserRole } from 'src/shared/enums/userRole.enum';
import { Roles } from 'src/shared/guards/tokenRoles.guard';
import { Scopes } from 'src/shared/decorators/scopes.decorator';
import { Scope } from 'src/shared/enums/scopes.enum';
import { JwtUser } from 'src/shared/modules/global/jwt.service';
import { GroupMembershipService } from './groupMembership.service';
import { setResHeader } from 'src/shared/helper';

@ApiTags('GroupMembership')
@Controller('/groups')
export class GroupMembershipController {
  constructor(private readonly service: GroupMembershipService) {}

  @ApiOperation({
    summary: 'Get group members by group id',
    description: 'Roles: Admin | User',
  })
  @ApiParam({
    name: 'groupId',
    description: 'group id',
  })
  @ApiResponse({
    status: 200,
    description: 'Group member details',
    type: [GroupMemberResponseDto],
    headers: {
      'X-Next-Page': {
        description: 'The index of the next page',
        schema: {
          type: 'integer',
        },
      },
      'X-Page': {
        description: 'The index of the current page (starting at 1)',
        schema: {
          type: 'integer',
        },
      },
      'X-Per-Page': {
        description: 'The number of items to list per page',
        schema: {
          type: 'integer',
        },
      },
      'X-Total': {
        description: 'The total number of items',
        schema: {
          type: 'integer',
        },
      },
      'X-Total-Pages': {
        description: 'The total number of pages',
        schema: {
          type: 'integer',
        },
      },
      Link: {
        description: 'Pagination link header',
        schema: {
          type: 'integer',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Get('/:groupId/members')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.User)
  @Scopes(Scope.ReadGroups, Scope.WriteGroups, Scope.AllGroups)
  async getGroupMembers(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('groupId') groupId: string,
    @Query() criteria: GroupMemberCriteria,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;
    const result = await this.service.getGroupMembers(
      authUser,
      groupId,
      criteria,
    );

    setResHeader(req, res, result.page, result.perPage, result.total);

    return result.data;
  }

  @ApiOperation({
    summary: 'Add group member',
    description: 'Roles: Admin | User',
  })
  @ApiBody({
    description: 'Add group member data',
    type: AddGroupMemberDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Group member details',
    type: GroupMemberResponseDto || GroupMemberBulkResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Post('/:groupId/members')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.User)
  @Scopes(Scope.WriteGroups, Scope.AllGroups)
  async addGroupMember(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body() dto: AddGroupMemberDto,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;

    if (dto.members && dto.members.length > 0) {
      //eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await this.service.addGroupMemberBulk(authUser, groupId, dto);
    } else {
      return await this.service.addGroupMember(authUser, groupId, dto);
    }
  }

  @ApiOperation({
    summary: 'Get group member',
    description: 'Roles: Admin | User',
  })
  @ApiResponse({
    status: 200,
    description: 'Group member details',
    type: GroupMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Get('/:groupId/members/:memberId')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.User)
  @Scopes(Scope.ReadGroups, Scope.WriteGroups, Scope.AllGroups)
  async getGroupMember(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;

    return await this.service.getGroupMember(authUser, groupId, memberId);
  }

  @ApiOperation({
    summary: 'Delete group member',
    description: 'Roles: Admin | User',
  })
  @ApiBody({
    description: 'Delete group member data',
    type: DeleteGroupMemberDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Group member details',
    type: GroupMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Delete('/:groupId/members/:memberId')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.User)
  @Scopes(Scope.WriteGroups, Scope.AllGroups)
  async deleteGroupMember(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @Query() dto: DeleteGroupMemberDto,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;

    return await this.service.deleteGroupMember(
      authUser,
      groupId,
      memberId,
      dto,
    );
  }

  @ApiOperation({
    summary: 'Delete group members',
    description: 'Roles: Admin | User',
  })
  @ApiBody({
    description: 'Delete group member data',
    type: DeleteGroupMemberBulkDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Group member details',
    type: GroupMemberBulkResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Delete('/:groupId/members')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.User)
  @Scopes(Scope.WriteGroups, Scope.AllGroups)
  async deleteGroupMemberBulk(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body() dto: DeleteGroupMemberBulkDto,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;

    //eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.service.deleteGroupMemberBulk(authUser, groupId, dto);
  }

  @ApiOperation({
    summary:
      'Get list of groups for specified user and member count of those groups. Optionally may include sub groups.',
  })
  @ApiResponse({
    status: 200,
    description: 'The group members count',
    type: CountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Get('/memberGroups/groupMembersCount')
  async listGroupsMemberCount(@Query() dto: ListGroupsMemberCountDto) {
    return await this.service.listGroupsMemberCount(dto);
  }

  @ApiOperation({
    summary: 'Get member groups',
  })
  @ApiResponse({
    status: 200,
    description: 'Member group details',
    type: [String],
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Get('/memberGroups/:memberId')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.User)
  @Scopes(Scope.ReadGroups, Scope.AllGroups)
  async getMemberGroups(
    @Param('memberId') memberId: string,
    @Query() dto: GetMemberGroupsDto,
  ) {
    return await this.service.getMemberGroups(memberId, dto);
  }

  @ApiOperation({
    summary: 'Get group members count',
  })
  @ApiResponse({
    status: 200,
    description: 'The group members count',
    type: CountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Get('/:groupId/membersCount')
  async getGroupMembersCount(
    @Param('groupId') groupId: string,
    @Query() dto: GetGroupMembersCountDto,
  ) {
    return await this.service.getGroupMembersCount(groupId, dto);
  }

  @ApiOperation({
    summary: 'Group Validity Check for Member',
  })
  @ApiResponse({
    status: 200,
    description: 'Group Validity Check result',
    type: GroupValidityCheckResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Get('/validityCheck/:memberId/:groupId')
  async groupValidityCheck(
    @Param('memberId') memberId: string,
    @Param('groupId') groupId: string,
  ) {
    return await this.service.groupValidityCheck(memberId, groupId);
  }
}
