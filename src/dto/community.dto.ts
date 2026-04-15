import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';
import { transformBoolean } from 'src/shared/helper';

/**
 * Represents one menu item displayed in community navigation.
 */
export class CommunityMenuItemDto {
  @ApiProperty({
    description: 'Menu item title',
    type: 'string',
  })
  title: string;

  @ApiProperty({
    description: 'Target URL for the menu item',
    type: 'string',
  })
  url: string;

  @ApiPropertyOptional({
    description: 'Whether the link opens in a new browser tab',
    type: 'boolean',
  })
  openNewTab?: boolean;
}

/**
 * Represents a logo entry with image and target URL.
 */
export class CommunityLogoDto {
  @ApiProperty({
    description: 'Logo image path',
    type: 'string',
  })
  img: string;

  @ApiProperty({
    description: 'Logo link URL',
    type: 'string',
  })
  url: string;
}

/**
 * Represents optional access-denied content settings for a community.
 */
export class CommunityAccessDeniedPageDto {
  @ApiProperty({
    description: 'Contentful viewport identifier',
    type: 'string',
  })
  viewportId: string;

  @ApiPropertyOptional({
    description: 'Optional content space name',
    type: 'string',
  })
  spaceName?: string;
}

/**
 * Represents challenge filter JSON stored for a community.
 */
export class CommunityChallengeFilterDto {
  @ApiPropertyOptional({
    description: 'Allowed group identifiers',
    type: [String],
  })
  groupIds?: string[];

  @ApiPropertyOptional({
    description: 'Optional OR filter clauses',
    type: [Object],
  })
  or?: Record<string, unknown>[];

  @ApiPropertyOptional({
    description: 'Optional tag filters',
    type: [String],
  })
  tags?: string[];
}

/**
 * Represents challenge listing behavior settings for a community.
 */
export class CommunityChallengeListingDto {
  @ApiPropertyOptional({
    description: 'Whether to skip community filtering by default',
    type: 'boolean',
  })
  ignoreCommunityFilterByDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Whether challenge links open in new tabs',
    type: 'boolean',
  })
  openChallengesInNewTabs?: boolean;
}

/**
 * Full response shape for a community metadata record.
 */
export class CommunityMetaResponseDto {
  @ApiProperty({
    description: 'Internal metadata identifier',
    type: 'string',
  })
  id: string;

  @ApiProperty({
    description: 'Community identifier',
    type: 'string',
  })
  communityId: string;

  @ApiProperty({
    description: 'Community display name',
    type: 'string',
  })
  communityName: string;

  @ApiPropertyOptional({
    description: 'Community description',
    type: 'string',
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Community image filename',
    type: 'string',
  })
  image?: string | null;

  @ApiProperty({
    description: 'Community subdomains',
    type: [String],
  })
  subdomains: string[];

  @ApiProperty({
    description: 'Community group IDs',
    type: [String],
  })
  groupIds: string[];

  @ApiProperty({
    description: 'Authorized group IDs for gated access',
    type: [String],
  })
  authorizedGroupIds: string[];

  @ApiProperty({
    description: 'Applicable terms IDs',
    type: [Number],
  })
  terms: number[];

  @ApiProperty({
    description: 'Flag indicating hidden community',
    type: 'boolean',
  })
  hidden: boolean;

  @ApiProperty({
    description: 'Flag indicating whether search is hidden',
    type: 'boolean',
  })
  hideSearch: boolean;

  @ApiProperty({
    description: 'Flag indicating whether filters are hidden',
    type: 'boolean',
  })
  hideFilter: boolean;

  @ApiProperty({
    description: 'Flag indicating chevron overlay on avatar',
    type: 'boolean',
  })
  chevronOverAvatar: boolean;

  @ApiPropertyOptional({
    description: 'Community footer text',
    type: 'string',
  })
  footerText?: string | null;

  @ApiPropertyOptional({
    description: 'Leaderboard API URL',
    type: 'string',
  })
  leaderboardApiUrl?: string | null;

  @ApiPropertyOptional({
    description: 'News feed URL',
    type: 'string',
  })
  newsFeed?: string | null;

  @ApiPropertyOptional({
    description: 'Challenge filter settings',
    type: CommunityChallengeFilterDto,
  })
  challengeFilter?: CommunityChallengeFilterDto | null;

  @ApiPropertyOptional({
    description: 'Challenge listing settings',
    type: CommunityChallengeListingDto,
  })
  challengeListing?: CommunityChallengeListingDto | null;

  @ApiPropertyOptional({
    description: 'Additional community metadata JSON payload',
    type: Object,
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Menu entries for the community',
    type: [CommunityMenuItemDto],
  })
  menuItems: CommunityMenuItemDto[];

  @ApiProperty({
    description: 'Community logos',
    type: [CommunityLogoDto],
  })
  logos: CommunityLogoDto[];

  @ApiProperty({
    description: 'Additional logo image paths',
    type: [String],
  })
  additionalLogos: string[];

  @ApiPropertyOptional({
    description: 'Access denied page content settings',
    type: CommunityAccessDeniedPageDto,
  })
  accessDeniedPage?: CommunityAccessDeniedPageDto | null;

  @ApiProperty({
    description: 'Record creation timestamp',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Record update timestamp',
    type: Date,
  })
  updatedAt: Date;
}

/**
 * Slim projection for community listing.
 */
export class CommunityListItemDto {
  @ApiProperty({
    description: 'Community identifier',
    type: 'string',
  })
  communityId: string;

  @ApiProperty({
    description: 'Community display name',
    type: 'string',
  })
  communityName: string;

  @ApiPropertyOptional({
    description: 'Community description',
    type: 'string',
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Community image filename',
    type: 'string',
  })
  image?: string | null;

  @ApiProperty({
    description: 'Community subdomains',
    type: [String],
  })
  subdomains: string[];

  @ApiProperty({
    description: 'Community group IDs',
    type: [String],
  })
  groupIds: string[];

  @ApiProperty({
    description: 'Authorized group IDs for gated access',
    type: [String],
  })
  authorizedGroupIds: string[];

  @ApiProperty({
    description: 'Flag indicating hidden community',
    type: 'boolean',
  })
  hidden: boolean;

  @ApiProperty({
    description: 'Menu entries for the community',
    type: [CommunityMenuItemDto],
  })
  menuItems: CommunityMenuItemDto[];

  @ApiProperty({
    description: 'Community logos',
    type: [CommunityLogoDto],
  })
  logos: CommunityLogoDto[];

  @ApiPropertyOptional({
    description: 'Community footer text',
    type: 'string',
  })
  footerText?: string | null;
}

/**
 * Query criteria for listing communities.
 */
export class CommunityCriteria extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Include hidden communities in the results',
    default: false,
    type: 'boolean',
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  @IsOptional()
  includeHidden: boolean = false;

  @ApiPropertyOptional({
    description: 'Filter by subdomain',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  subdomain?: string;
}
