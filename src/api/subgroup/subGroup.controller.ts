import { Body, Controller, Delete, Param, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CreateGroupDto, GroupResponseDto } from 'src/dto/group.dto';
import { UserRole } from 'src/shared/enums/userRole.enum';
import { Roles } from 'src/shared/guards/tokenRoles.guard';
import { Scopes } from 'src/shared/decorators/scopes.decorator';
import { Scope } from 'src/shared/enums/scopes.enum';
import { JwtUser } from 'src/shared/modules/global/jwt.service';
import { SubGroupService } from './subGroup.service';

@ApiTags('SubGroup')
@Controller('/groups')
export class SubGroupController {
  constructor(private readonly service: SubGroupService) {}

  @ApiOperation({
    summary: 'Create subgroup',
    description: 'Roles: Admin | User',
  })
  @ApiBody({
    description: 'Subgroup data',
    type: CreateGroupDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Subgroup details',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Post(':groupId/subGroup')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.User)
  @Scopes(Scope.WriteGroups, Scope.AllGroups)
  async create(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body() dto: CreateGroupDto,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;

    return await this.service.createSubGroup(authUser, groupId, dto);
  }

  @ApiOperation({
    summary: 'Delete subgroup by id',
    description: 'Roles: Admin | User',
  })
  @ApiResponse({
    status: 200,
    description: 'Deleted subgroup details',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 406, description: 'Not Acceptable' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Delete('/:groupId/subGroup/:subGroupId')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.User)
  @Scopes(Scope.WriteGroups, Scope.AllGroups)
  async deleteSubGroup(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('subGroupId') subGroupId: string,
  ) {
    const authUser: JwtUser = req['user'] as JwtUser;
    //eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.service.deleteSubGroup(authUser, groupId, subGroupId);
  }
}
