import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PaginationDto } from './pagination.dto';
import { GroupRole } from 'src/shared/enums/groupRole.enum';
import { Transform } from 'class-transformer';

export class GroupRoleDto {
  @ApiProperty({
    name: 'groupId',
    description: 'group id',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiPropertyOptional({
    name: 'role',
    description: 'Group role',
    enum: GroupRole,
    example: GroupRole.GROUP_MANAGER,
  })
  @Transform(({ value }) => {
    if (value === 'groupManager') {
      return GroupRole.GROUP_MANAGER;
    }
    if (value === 'groupAdmin') {
      return GroupRole.GROUP_ADMIN;
    }
    return value; //eslint-disable-line @typescript-eslint/no-unsafe-return
  })
  @IsNotEmpty()
  @IsEnum(GroupRole)
  role: GroupRole;
}

export class GroupRoleResponseDto {
  @ApiProperty({
    name: 'groupId',
    description: 'Group id',
    type: 'string',
  })
  groupId: string;

  @ApiProperty({
    name: 'role',
    description: 'Group role',
    type: 'string',
  })
  role: string;
}

export class GroupRoleCriteria extends PaginationDto {}
