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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  GroupRoleCriteria,
  GroupRoleResponseDto,
  GroupRoleDto,
} from 'src/dto/groupRole.dto';
import { UserRole } from 'src/shared/enums/userRole.enum';
import { Roles } from 'src/shared/guards/tokenRoles.guard';
import { Scopes } from 'src/shared/decorators/scopes.decorator';
import { Scope } from 'src/shared/enums/scopes.enum';
import { JwtUser } from 'src/shared/modules/global/jwt.service';
import { GroupRoleService } from './groupRole.service';
import { setResHeader } from 'src/shared/helper';

@ApiTags('GroupRole')
@Controller('/group-roles/users')
export class GroupRoleController {
  constructor(private readonly service: GroupRoleService) {}

  @ApiOperation({
    summary: 'Get group roles by user id',
  })
  @ApiParam({
    name: 'userId',
    description: 'user id',
  })
  @ApiResponse({
    status: 200,
    description: 'Group role details',
    type: [GroupRoleResponseDto],
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Get('/:userId')
  @ApiBearerAuth()
  @Roles(UserRole.Admin)
  @Scopes(Scope.ReadGroups, Scope.WriteGroups, Scope.AllGroups)
  async getGroupRole(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('userId') userId: string,
    @Query() criteria: GroupRoleCriteria,
  ) {
    const result = await this.service.getGroupRole(userId, criteria);

    setResHeader(req, res, result.page, result.perPage, result.total);

    return result.data;
  }

  @ApiOperation({
    summary:
      'Add a new combination of role and group to the group roles for the user',
  })
  @ApiParam({
    name: 'userId',
    description: 'user id',
  })
  @ApiResponse({
    status: 201,
    description: 'OK',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @HttpCode(HttpStatus.CREATED)
  @Post('/:userId')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.TGAdmin)
  @Scopes(Scope.WriteGroups, Scope.AllGroups)
  async addGroupRole(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Body() dto: GroupRoleDto,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;

    await this.service.addGroupRole(authUser, userId, dto);
  }

  @ApiOperation({
    summary: 'Deletes the role and the groupId combination for the user',
  })
  @ApiParam({
    name: 'userId',
    description: 'user id',
  })
  @ApiResponse({
    status: 204,
    description: 'OK',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('/:userId')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.TGAdmin)
  @Scopes(Scope.WriteGroups, Scope.AllGroups)
  async deleteGroupRole(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Body() dto: GroupRoleDto,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;

    await this.service.deleteGroupRole(authUser, userId, dto);
  }
}
