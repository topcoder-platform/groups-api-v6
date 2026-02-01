import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
  CreateGroupDto,
  BulkCreateGroupDto,
  BulkCreateGroupResponseDto,
  GroupResponseDto,
  UpdateGroupDto,
  PatchGroupDto,
  GroupCriteria,
  GetGroupCriteria,
  GetGroupResponseDto,
  GroupWithSubAndParentResponseDto,
} from 'src/dto/group.dto';
import { UserRole } from 'src/shared/enums/userRole.enum';
import { Roles } from 'src/shared/guards/tokenRoles.guard';
import { Scopes } from 'src/shared/decorators/scopes.decorator';
import { Scope } from 'src/shared/enums/scopes.enum';
import { JwtUser, isAdmin } from 'src/shared/modules/global/jwt.service';
import { GroupService } from './group.service';
import { setResHeader } from 'src/shared/helper';

@ApiTags('Group')
@Controller('/groups')
export class GroupController {
  constructor(private readonly service: GroupService) {}

  @ApiOperation({
    summary: 'Search groups',
  })
  @ApiResponse({
    status: 200,
    description: 'Group list',
    type: [GroupWithSubAndParentResponseDto],
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
  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.User)
  @Scopes(Scope.ReadGroups, Scope.WriteGroups, Scope.AllGroups)
  async search(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query() criteria: GroupCriteria,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;

    const result = await this.service.search(criteria, isAdmin(authUser));

    setResHeader(req, res, result.page, result.perPage, result.total);

    return result.data;
  }

  @ApiOperation({
    summary: 'flush cache',
  })
  @ApiResponse({
    status: 200,
    description: 'The success message',
  })
  @Get('/flushCache')
  @ApiBearerAuth()
  @Roles(UserRole.Admin)
  @Scopes(Scope.WriteGroups)
  async flushCache() {
    return Promise.resolve({
      message: 'all cached data has been removed',
    });
  }

  @ApiOperation({
    summary: 'Get group by id',
  })
  @ApiParam({
    name: 'id',
    description: 'group id',
  })
  @ApiResponse({
    status: 200,
    description: 'Group details',
    type: GetGroupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Get('/:id')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.User)
  @Scopes(Scope.ReadGroups, Scope.WriteGroups, Scope.AllGroups)
  async getById(
    @Req() req: Request,
    @Param('id') id: string,
    @Query() criteria: GetGroupCriteria,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;
    return await this.service.getGroup(authUser, id, criteria);
  }

  @ApiOperation({
    summary: 'Create group',
    description: 'Roles: Admin | Copilot',
  })
  @ApiBody({
    description: 'Group data',
    type: CreateGroupDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Group details',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.TGAdmin)
  @Scopes(Scope.WriteGroups, Scope.AllGroups)
  async create(@Req() req: Request, @Body() dto: CreateGroupDto) {
    const authUser: JwtUser = req['user'] as JwtUser;

    return await this.service.createGroup(authUser, dto);
  }

  @ApiOperation({
    summary: 'Bulk create group with members',
    description: 'Roles: Admin | Copilot | Project Manager | Taleng Manager',
  })
  @ApiBody({
    description: 'Group data',
    type: BulkCreateGroupDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Group details',
    type: BulkCreateGroupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Post('/bulk-create')
  @ApiBearerAuth()
  @Roles(
    UserRole.Admin,
    UserRole.Copilot,
    UserRole.ProjectManager,
    UserRole.TalentManager,
  )
  @Scopes(Scope.WriteGroups, Scope.AllGroups)
  async bulkCreateGroup(@Req() req: Request, @Body() dto: BulkCreateGroupDto) {
    const authUser: JwtUser = req['user'] as JwtUser;

    return await this.service.bulkCreateGroup(authUser, dto);
  }

  @ApiOperation({
    summary: 'Update group by id',
  })
  @ApiBody({
    description: 'Group update data',
    type: UpdateGroupDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Group details',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Put('/:id')
  @ApiBearerAuth()
  @Roles(UserRole.Admin)
  @Scopes(Scope.WriteGroups, Scope.AllGroups)
  async updateGroup(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;
    return await this.service.updateGroup(authUser, id, dto);
  }

  @ApiOperation({
    summary: 'Patch group by id',
  })
  @ApiBody({
    description: 'Group patch data',
    type: PatchGroupDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Group details',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Patch('/:id')
  @ApiBearerAuth()
  @Roles(UserRole.Admin)
  @Scopes(Scope.WriteGroups, Scope.AllGroups)
  async patchGroup(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: PatchGroupDto,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;
    return await this.service.patchGroup(authUser, id, dto);
  }

  @ApiOperation({
    summary: 'Delete group by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Deleted group details',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 406, description: 'Not Acceptable' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Delete('/:id')
  @ApiBearerAuth()
  @Roles(UserRole.Admin)
  @Scopes(Scope.WriteGroups, Scope.AllGroups)
  async deleteGroup(@Req() req: Request, @Param('id') id: string) {
    const authUser: JwtUser = req['user'] as JwtUser;
    //eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.service.deleteGroup(id, isAdmin(authUser));
  }

  @ApiOperation({
    summary: 'Get group by old id',
  })
  @ApiParam({
    name: 'oldId',
    description: 'group old id',
  })
  @ApiResponse({
    status: 200,
    description: 'Group details',
    type: GetGroupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Get('/oldId/:oldId')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.User)
  @Scopes(Scope.ReadGroups, Scope.WriteGroups, Scope.AllGroups)
  async getGroupByOldId(
    @Req() req: Request,
    @Param('oldId') oldId: string,
    @Query() criteria: GetGroupCriteria,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;
    return await this.service.getGroup(authUser, '', criteria, oldId);
  }
}
