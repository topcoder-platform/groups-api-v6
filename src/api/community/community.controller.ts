import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  CommunityCriteria,
  CommunityListItemDto,
  CommunityMetaResponseDto,
} from 'src/dto/community.dto';
import { Scope } from 'src/shared/enums/scopes.enum';
import { UserRole } from 'src/shared/enums/userRole.enum';
import { setResHeader } from 'src/shared/helper';
import { Scopes } from 'src/shared/decorators/scopes.decorator';
import { Roles } from 'src/shared/guards/tokenRoles.guard';
import { JwtUser, isAdmin } from 'src/shared/modules/global/jwt.service';
import { CommunityService } from './community.service';

/**
 * Exposes community metadata read endpoints.
 */
@ApiTags('Community')
@Controller('/communities')
export class CommunityController {
  constructor(private readonly service: CommunityService) {}

  /**
   * Lists communities based on pagination and optional filters.
   * @param req HTTP request containing authenticated user context.
   * @param res HTTP response used for pagination headers.
   * @param criteria Query criteria for listing communities.
   * @returns The list of matching communities.
   */
  @ApiOperation({
    summary: 'List communities',
  })
  @ApiResponse({
    status: 200,
    description: 'Community list',
    type: [CommunityListItemDto],
    headers: {
      'X-Next-Page': {
        description: 'The index of the next page',
        schema: { type: 'integer' },
      },
      'X-Page': {
        description: 'The index of the current page (starting at 1)',
        schema: { type: 'integer' },
      },
      'X-Per-Page': {
        description: 'The number of items to list per page',
        schema: { type: 'integer' },
      },
      'X-Total': {
        description: 'The total number of items',
        schema: { type: 'integer' },
      },
      'X-Total-Pages': {
        description: 'The total number of pages',
        schema: { type: 'integer' },
      },
      Link: {
        description: 'Pagination link header',
        schema: { type: 'integer' },
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
  async list(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query() criteria: CommunityCriteria,
  ): Promise<CommunityListItemDto[]> {
    const authUser: JwtUser = req['user'] as JwtUser;
    const tokenGroupIds = authUser.groupIds ?? [];
    const callerGroupIds =
      tokenGroupIds.length > 0
        ? tokenGroupIds
        : await this.service.getMemberGroupIds(authUser.userId);

    const result = await this.service.listCommunities(
      criteria,
      isAdmin(authUser),
      callerGroupIds,
    );

    setResHeader(req, res, result.page, result.perPage, result.total);

    return result.data;
  }

  /**
   * Retrieves complete metadata for one community.
   * @param communityId The community identifier.
   * @returns The community metadata payload.
   */
  @ApiOperation({
    summary: 'Get community metadata',
  })
  @ApiParam({
    name: 'communityId',
    description: 'Community identifier',
  })
  @ApiResponse({
    status: 200,
    description: 'Community metadata',
    type: CommunityMetaResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 500, description: 'Internal Error' })
  @Get('/:communityId/meta')
  @ApiBearerAuth()
  @Roles(UserRole.Admin, UserRole.User)
  @Scopes(Scope.ReadGroups, Scope.WriteGroups, Scope.AllGroups)
  async getMeta(
    @Param('communityId') communityId: string,
  ): Promise<CommunityMetaResponseDto> {
    return this.service.getCommunityMeta(communityId);
  }
}
