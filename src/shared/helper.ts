import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { omit, assignIn, filter, forEach, includes, pick, some } from 'lodash';
import { Request, Response } from 'express';
import * as qs from 'qs';
import { PrismaService } from 'src/shared/modules/global/prisma.service';
import { GroupStatus } from 'src/shared/enums/groupStatus.enum';
import { GroupRole } from 'src/shared/enums/groupRole.enum';
import { MemberShipType } from 'src/shared/enums/memberShipType.enum';
import * as busApi from 'tc-bus-api-wrapper';
import { CommonConfig } from 'src/shared/config/common.config';
import { validate } from 'uuid';
import { JwtUser } from 'src/shared/modules/global/jwt.service';

const ADMIN_FIELDS = ['createdBy', 'updatedBy'];

// Bus API Client
let busApiClient;

/**
 * Omit some fields if user is not admin
 * @param {Object} data the entity data
 * @param {Array<String>} otherFields the other fields to omit
 * @returns {Object} the fixed data
 */
export function omitAdminFields<T>(data: T, otherFields?: string[]): T {
  let omitFields;
  if (otherFields && otherFields.length > 0) {
    omitFields = [...ADMIN_FIELDS, ...otherFields];
  } else {
    omitFields = ADMIN_FIELDS;
  }

  return omit(data as any, omitFields) as T;
}

/**
 * Get link for a given page.
 * @param {Object} req the HTTP request
 * @param {Number} page the page number
 * @returns {String} link for the page
 */
export function getPageLink(req: Request, page: number) {
  const q = assignIn({}, req.query, { page });
  return `${req.protocol}://${req.get('Host')}${req.baseUrl}${req.path}?${qs.stringify(q)}`;
}

/**
 * Get link for a given page.
 * @param {Object} req the HTTP request
 * @param {Object} res the HTTP response
 * @param {Number} page the page number
 * @param {Number} perPage the perPage number
 * @param {Number} total the total number
 */
export function setResHeader(
  req: Request,
  res: Response,
  page: number,
  perPage: number,
  total: number,
) {
  const totalPages = Math.ceil(total / perPage);
  if (page > 1) {
    res.header('X-Prev-Page', String(page - 1));
  }
  if (page < totalPages) {
    res.header('X-Next-Page', String(page + 1));
  }
  res.header('X-Page', String(page));
  res.header('X-Per-Page', String(perPage));
  res.header('X-Total', String(total));
  res.header('X-Total-Pages', String(totalPages));

  // set Link header
  if (totalPages > 0) {
    let link = `<${getPageLink(req, 1)}>; rel="first", <${getPageLink(req, totalPages)}>; rel="last"`;
    if (page > 1) {
      link += `, <${getPageLink(req, page - 1)}>; rel="prev"`;
    }
    if (page < totalPages) {
      link += `, <${getPageLink(req, page + 1)}>; rel="next"`;
    }
    res.header('Link', link);
  }

  // Allow browsers access pagination data in headers
  let accessControlExposeHeaders =
    (res.getHeader('Access-Control-Expose-Headers') as string) || '';
  accessControlExposeHeaders += accessControlExposeHeaders ? ', ' : '';
  // append new values, to not override values set by someone else
  accessControlExposeHeaders +=
    'X-Page, X-Per-Page, X-Total, X-Total-Pages, X-Prev-Page, X-Next-Page';

  res.header('Access-Control-Expose-Headers', accessControlExposeHeaders);
}

/**
 * Ensure user is member of group.
 * @param {Object} prisma the prisma instance
 * @param {String} groupId the group id
 * @param {String} userId the user id
 */
export async function ensureGroupMember(
  prisma: PrismaService,
  groupId: string,
  userId: string,
) {
  const memberCheckRes = await prisma.groupMembership.findFirst({
    where: {
      id: userId,
      groupId: groupId,
      membershipType: MemberShipType.USER,
    },
  });

  if (!memberCheckRes) {
    throw new ForbiddenException('User is not member of the group');
  }
}

/**
 * Check the group name whether exists
 * @param name the group name
 * @param groupId the group id
 * @param prismaTx the prisma transaction
 */
export async function checkGroupName(
  name: string,
  groupId: string,
  prismaTx?: any,
) {
  const prismaFilter = {
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  } as any;

  const prismaIns = prismaTx ? prismaTx : this.prisma;

  const group = await prismaIns.group.findFirst(prismaFilter);

  if (group && group.id !== groupId) {
    throw new ConflictException(`The group name "${name}" is already used`);
  }
}

/**
 * Check the group whether exists
 * @param prismaTx the prisma client
 * @param groupId the group id
 * @param isAdmin the flag whether user is admin
 */
export async function checkGroupExists(
  prismaTx: any,
  groupId: string,
  isAdmin: boolean,
) {
  const prismaFilter = {
    where: {
      id: groupId,
      status: isAdmin ? undefined : GroupStatus.ACTIVE,
    },
  };

  const existing = await prismaTx.group.findUnique(prismaFilter);

  if (!existing) {
    throw new NotFoundException(`Not found Group of id ${groupId}`);
  }

  return existing; //eslint-disable-line @typescript-eslint/no-unsafe-return
}

/**
 * Check the group member whether exists
 * @param prismaTx the prisma client
 * @param groupId the group id
 * @param memberId the member id
 */
export async function checkGroupMember(
  prismaTx: any,
  groupId: string,
  memberId: string,
) {
  const prismaFilter = {
    where: {
      groupId: groupId,
      memberId: memberId,
    },
  } as any;

  const existing = await prismaTx.groupMembership.findFirst(prismaFilter);

  if (!existing) {
    throw new ForbiddenException('User is not member of the group');
  }
}

/**
 * Ensure user exists
 * @param prismaTx the prisma client
 * @param userId the user id
 * @param authUser auth user
 */
export async function ensureUserExists(
  prismaTx: any,
  userId: string,
  authUser: JwtUser,
) {
  let prismaFilter;

  if (validate(userId)) {
    prismaFilter = {
      where: {
        id: userId,
      },
    };
  } else {
    prismaFilter = {
      where: {
        universalUID: userId,
      },
    };
  }

  let existing = await prismaTx.user.findFirst(prismaFilter);

  // If not exist, create new user
  if (!existing) {
    if (validate(userId)) {
      existing = await prismaTx.user.create({
        data: {
          id: userId,
          universalUID: '00000000',
          createdBy: authUser.userId ? authUser.userId : '00000000',
        },
      });
    } else {
      existing = await prismaTx.user.create({
        data: {
          universalUID: userId,
          createdBy: authUser.userId ? authUser.userId : '00000000',
        },
      });
    }
  }

  return existing; //eslint-disable-line @typescript-eslint/no-unsafe-return
}

/**
 * Return whether the user has one of the group roles or not.
 * @param {Object} prismaTx the prismaTx
 * @param {String} groupId the group id
 * @param {String} userId the user id
 * @param {Array} roles an array of group roles
 * @returns {Boolean} true if user has one of the group roles
 */
export async function hasGroupRole(
  prismaTx: any,
  groupId: string,
  userId: string | undefined,
  roles: GroupRole[],
) {
  const membership = await prismaTx.groupMembership.findFirst({
    where: {
      groupId: groupId,
      memberId: userId || '',
      membershipType: MemberShipType.USER,
    },
  });

  if (!membership) {
    return false;
  }
  const existRoles = membership.roles || [];
  return some(existRoles, (r) => some(roles, (role) => r.role === role));
}

/**
 * Transform the string to boolean
 * @param {String} value the string to parse
 * @returns {boolean | String} the transformed value
 */
export function transformBoolean(value: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

/**
 * Parse comma separated string to return array of values.
 * @param {String} s the string to parse
 * @param {Array} allowedValues the allowed values
 * @returns {Array} the parsed values
 */
export function parseCommaSeparatedString(s, allowedValues) {
  if (!s) {
    return null;
  }
  const values = s.split(',');
  // used to check duplicate values
  const mapping = {};
  forEach(values, (value) => {
    if (value.trim().length === 0) {
      throw new BadRequestException('The input string is empty');
    }
    if (allowedValues && !includes(allowedValues, value)) {
      throw new BadRequestException(
        `Field name ${value} is not allowed, allowed field names: ${JSON.stringify(allowedValues)}`,
      );
    }
    if (mapping[value]) {
      throw new BadRequestException(
        `There are duplicate field names: ${value}`,
      );
    }
    mapping[value] = true;
  });
  return values; //eslint-disable-line @typescript-eslint/no-unsafe-return
}

/**
 * Get Bus API Client
 * @return {Object} Bus API Client Instance
 */
function getBusApiClient() {
  // if there is no bus API client instance, then create a new instance
  if (!busApiClient) {
    busApiClient = busApi(
      pick(CommonConfig, [
        'AUTH0_URL',
        'AUTH0_AUDIENCE',
        'TOKEN_CACHE_TIME',
        'AUTH0_CLIENT_ID',
        'AUTH0_CLIENT_SECRET',
        'BUSAPI_URL',
        'KAFKA_ERROR_TOPIC',
        'AUTH0_PROXY_SERVER_URL',
      ]),
    );
  }

  return busApiClient; //eslint-disable-line @typescript-eslint/no-unsafe-return
}

/**
 * Post bus event.
 * @param {String} topic the event topic
 * @param {Object} payload the event payload
 */
export async function postBusEvent(topic, payload) {
  const client = getBusApiClient();

  await client.postEvent({
    topic,
    originator: 'topcoder-groups-api',
    timestamp: new Date().toISOString(),
    'mime-type': 'application/json',
    payload,
  });
}

/**
 * Delete groups
 * @param prismaTx the prisma client
 * @param group the group
 * @returns deleted groups
 */
export async function deleteGroupCascade(prismaTx: any, groupId: any) {
  let groupsToDelete = [groupId];

  const rootGroup = await prismaTx.group.findUnique({
    where: {
      id: groupId,
    },
    include: {
      subGroups: {
        include: {
          subGroups: {
            include: {
              subGroups: true,
            },
          },
        },
      },
    },
  });

  const childrenIds: string[] = [];

  rootGroup.subGroups.forEach((groupL1) => {
    childrenIds.push(groupL1.id);
    groupL1.subGroups.forEach((groupL2) => {
      childrenIds.push(groupL2.id);
      groupL2.subGroups.forEach((groupL3) => {
        childrenIds.push(groupL3.id);
      });
    });
  });

  groupsToDelete = groupsToDelete.concat(childrenIds);

  const memberships = await prismaTx.groupMembership.findMany({
    where: {
      memberId: {
        in: childrenIds,
      },
      membershipType: MemberShipType.GROUP,
    },
  });

  const notDelete: string[] = [];
  memberships.forEach((item) => {
    if (!includes(groupsToDelete, item.groupId)) {
      notDelete.push(item.memberId);
    }
  });

  groupsToDelete = filter(groupsToDelete, (item) => !includes(notDelete, item));

  await prismaTx.groupMembership.deleteMany({
    where: {
      OR: [
        {
          memberId: {
            in: groupsToDelete,
          },
        },
        {
          groupId: {
            in: groupsToDelete,
          },
        },
      ],
    },
  });

  const result = await prismaTx.group.findMany({
    where: {
      id: {
        in: groupsToDelete,
      },
    },
  });

  await prismaTx.group.deleteMany({
    where: {
      id: {
        in: groupsToDelete,
      },
    },
  });

  return result; //eslint-disable-line @typescript-eslint/no-unsafe-return
}
