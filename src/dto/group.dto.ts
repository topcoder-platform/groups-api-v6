import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { PaginationDto } from './pagination.dto';
import { Transform } from 'class-transformer';
import { transformBoolean } from 'src/shared/helper';
import { ALLOWED_FIELD_NAMES } from 'src/api/group/group.service';
import {
  MemberShipType,
  memberShipAllTypes,
} from 'src/shared/enums/memberShipType.enum';
import { GroupStatus, groupAllStatus } from 'src/shared/enums/groupStatus.enum';

export class CreateGroupDto {
  @ApiProperty({
    name: 'name',
    description: 'group name',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 150)
  name: string;

  @ApiProperty({
    name: 'description',
    description: 'group description',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 2048)
  @IsOptional()
  description?: string | null;

  @ApiProperty({
    name: 'organizationId',
    description: 'group organization id',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({
    name: 'domain',
    description: 'group domain',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  domain?: string;

  @ApiProperty({
    name: 'ssoId',
    description: 'group sso id',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  ssoId?: string;

  @ApiProperty({
    name: 'privateGroup',
    description: 'the flag whether group is private',
    type: 'boolean',
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  privateGroup: boolean;

  @ApiProperty({
    name: 'selfRegister',
    description: 'the flag whether group is self register',
    type: 'boolean',
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  selfRegister: boolean;

  @ApiPropertyOptional({
    description: 'Group status',
    enum: groupAllStatus,
    example: GroupStatus.ACTIVE,
  })
  @Transform(
    ({ value }) => GroupStatus[value.toUpperCase() as keyof typeof GroupStatus],
  )
  @IsNotEmpty()
  @IsEnum(GroupStatus)
  status: GroupStatus = GroupStatus.ACTIVE;
}

export class UpdateGroupDto extends CreateGroupDto {
  @ApiProperty({
    name: 'oldId',
    description: 'group old id',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  oldId?: string | null;
}

export class PatchGroupDto {
  @ApiProperty({
    name: 'oldId',
    description: 'group old id',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  oldId: string;
}

export class GroupResponseDto extends UpdateGroupDto {
  @ApiProperty({
    name: 'id',
    description: 'Group id',
    type: 'string',
  })
  id: string;

  @ApiProperty({
    name: 'createdBy',
    description: 'created by',
    type: 'string',
  })
  createdBy?: string;

  @ApiProperty({
    name: 'createdAt',
    description: 'created time',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    name: 'updatedBy',
    description: 'updated by',
    type: 'string',
  })
  updatedBy?: string | null;

  @ApiProperty({
    name: 'updatedAt',
    description: 'updated time',
    type: Date,
  })
  updatedAt: Date;
}

export class GroupWithSubAndParentResponseDto extends GroupResponseDto {
  @ApiProperty({
    name: 'parentGroups',
    description: 'Parent Groups',
    type: [GroupResponseDto],
  })
  parentGroups?: GroupResponseDto[];

  @ApiProperty({
    name: 'subGroups',
    description: 'Sub Groups',
    type: [GroupResponseDto],
  })
  subGroups?: GroupResponseDto[];
}

export class GetGroupResponseDto extends GroupWithSubAndParentResponseDto {
  @ApiProperty({
    name: 'flattenGroupIdTree',
    description: 'Flatten group id trees',
    type: [String],
  })
  flattenGroupIdTree?: string[];
}

export class GroupCriteria extends PaginationDto {
  @ApiProperty({
    name: 'memberId',
    description: 'the member id',
    type: 'string',
    example: '40159127',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  memberId?: string;

  @ApiProperty({
    name: 'universalUID',
    description: 'the meber universal uid',
    type: 'string',
    example: '00000000',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  universalUID?: string;

  @ApiPropertyOptional({
    name: 'membershipType',
    description: 'the member ship type',
    enum: MemberShipType,
    type: 'string',
    example: MemberShipType.USER,
    required: false,
  })
  @IsOptional()
  @IsIn(memberShipAllTypes)
  membershipType?: MemberShipType;

  @ApiPropertyOptional({
    name: 'name',
    description: 'the group name',
    type: 'string',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    name: 'oldId',
    description: 'the group oldId',
    type: 'string',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  oldId?: string;

  @ApiPropertyOptional({
    name: 'ssoId',
    description: 'the group ssoId',
    type: 'string',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  ssoId?: string;

  @ApiPropertyOptional({
    name: 'organizationId',
    description: 'the organization id',
    type: 'string',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({
    name: 'selfRegister',
    description: 'the flag of self register',
    type: 'boolean',
    required: false,
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  @IsOptional()
  selfRegister?: boolean;

  @ApiPropertyOptional({
    name: 'privateGroup',
    description: 'the flag of private group',
    type: 'boolean',
    required: false,
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  @IsOptional()
  privateGroup?: boolean;

  @ApiPropertyOptional({
    name: 'status',
    description: 'the group status',
    enum: GroupStatus,
    type: 'string',
    example: GroupStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsIn(groupAllStatus)
  status?: GroupStatus;

  @ApiPropertyOptional({
    name: 'includeSubGroups',
    description: 'the flag of whether include subGroups',
    type: 'boolean',
    default: false,
    required: false,
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  @IsOptional()
  includeSubGroups: boolean = false;

  @ApiPropertyOptional({
    name: 'includeParentGroup',
    description: 'the flag of whether include parent group',
    type: 'boolean',
    default: false,
    required: false,
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  @IsOptional()
  includeParentGroup: boolean = false;

  @ApiPropertyOptional({
    name: 'oneLevel',
    description: 'the search level for parentGroups and subGroups',
    type: 'boolean',
    default: true,
    required: false,
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  @IsOptional()
  oneLevel: boolean = true;
}

export class GetGroupCriteria {
  @ApiPropertyOptional({
    name: 'includeSubGroups',
    description: 'the flag of whether include subGroups',
    type: 'boolean',
    default: false,
    required: false,
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  @IsOptional()
  includeSubGroups: boolean = false;

  @ApiPropertyOptional({
    name: 'includeParentGroup',
    description: 'the flag of whether include parent group',
    type: 'boolean',
    default: false,
    required: false,
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  @IsOptional()
  includeParentGroup: boolean = false;

  @ApiPropertyOptional({
    name: 'flattenGroupIdTree',
    description: 'the flatten group id tree',
    type: 'boolean',
    default: false,
    required: false,
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  @IsOptional()
  flattenGroupIdTree: boolean = false;

  @ApiPropertyOptional({
    name: 'skipCache',
    description: 'skip cache',
    type: 'boolean',
    default: false,
    required: false,
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  @IsOptional()
  skipCache: boolean = false;

  @ApiPropertyOptional({
    name: 'oneLevel',
    description: 'the search level for parentGroups and subGroups',
    type: 'boolean',
    default: true,
    required: false,
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  @IsOptional()
  oneLevel: boolean = true;

  @ApiPropertyOptional({
    name: 'fields',
    description: `the group fields to show, must be in [${ALLOWED_FIELD_NAMES.join(',')}]`,
    type: 'string',
    example: 'id,name,createdAt',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  fields?: string;
}
