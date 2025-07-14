import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationDto } from './pagination.dto';
import {
  MemberShipType,
  memberShipAllTypes,
} from 'src/shared/enums/memberShipType.enum';
import { Transform } from 'class-transformer';
import { transformBoolean } from 'src/shared/helper';

export class AddGroupMemberBulkItemDto {
  @ApiProperty({
    name: 'memberId',
    description: 'member id',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({
    name: 'membershipType',
    description: 'the member ship type',
    enum: MemberShipType,
    type: 'string',
  })
  @IsIn(memberShipAllTypes)
  membershipType: MemberShipType;
}

export class AddGroupMemberDto {
  @ApiProperty({
    name: 'memberId',
    description: 'member id',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  memberId?: string;

  @ApiProperty({
    name: 'universalUID',
    description: 'universal UID',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  universalUID?: string;

  @ApiProperty({
    name: 'membershipType',
    description: 'the member ship type',
    enum: MemberShipType,
    type: 'string',
  })
  @IsIn(memberShipAllTypes)
  @IsOptional()
  membershipType?: MemberShipType;

  @ApiProperty({
    name: 'members',
    description: 'member to add',
    type: [AddGroupMemberBulkItemDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsOptional()
  members?: AddGroupMemberBulkItemDto[];
}

export class DeleteGroupMemberDto {
  @ApiProperty({
    name: 'universalUID',
    description: 'universal UID',
    type: 'string',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  universalUID?: string;
}

export class DeleteGroupMemberBulkDto {
  @ApiProperty({
    name: 'members',
    description: 'member ids',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  members: string[];
}

export class GetMemberGroupsDto {
  @ApiProperty({
    name: 'uuid',
    description: 'whether return uuid',
    type: 'boolean',
    default: false,
    required: false,
  })
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  @IsOptional()
  uuid: boolean = false;
}

export class GetGroupMembersCountDto {
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
}

export class ListGroupsMemberCountDto {
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

  @ApiProperty({
    name: 'universalUID',
    description: 'universal UID',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  universalUID?: string;

  @ApiProperty({
    name: 'organizationId',
    description: 'organization id',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  organizationId?: string;
}

export class GroupMemberResponseDto {
  @ApiProperty({
    name: 'id',
    description: 'Group member id',
    type: 'string',
  })
  id: string;

  @ApiProperty({
    name: 'groupId',
    description: 'Group id',
    type: 'string',
  })
  groupId: string;

  @ApiProperty({
    name: 'groupName',
    description: 'Group name',
    type: 'string',
  })
  groupName: string;

  @ApiProperty({
    name: 'memberId',
    description: 'Member id',
    type: 'string',
  })
  memberId: string;

  @ApiProperty({
    name: 'universalUID',
    description: 'universal UID',
    type: 'string',
  })
  universalUID: string;

  @ApiProperty({
    name: 'membershipType',
    description: 'the member ship type',
    enum: MemberShipType,
    type: 'string',
  })
  membershipType: MemberShipType;

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
}

export class GroupMemberBulkItemDto {
  @ApiProperty({
    name: 'memberId',
    description: 'Member id',
    type: 'string',
  })
  memberId: string;

  @ApiProperty({
    name: 'status',
    description: 'status',
    type: 'string',
  })
  status: string;
}

export class GroupMemberBulkResponseDto {
  @ApiProperty({
    name: 'groupId',
    description: 'Group id',
    type: 'string',
  })
  groupId: string;

  @ApiProperty({
    name: 'members',
    description: 'Members data',
    type: [GroupMemberBulkItemDto],
  })
  members: GroupMemberBulkItemDto[];
}

export class CountResponseDto {
  @ApiProperty({
    name: 'count',
    description: 'count',
    type: 'number',
  })
  count: number;
}

export class GroupValidityCheckResponseDto {
  @ApiProperty({
    name: 'check',
    description: 'check',
    type: 'boolean',
  })
  check: boolean;
}

export class GroupMemberCriteria extends PaginationDto {}
