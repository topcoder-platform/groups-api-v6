export const CommonConfig = {
  CHALLENGE_API_URL:
    process.env.CHALLENGE_API_URL ?? 'http://localhost:4000/challenges/',

  BUSAPI_URL: process.env.BUSAPI_URL ?? 'http://localhost:4000/eventBus',
  AUTH0_URL: process.env.AUTH0_URL ?? 'http://localhost:4000/oauth/token',
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE ?? 'http://localhost:4000',
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID ?? '',
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET ?? '',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME ?? 86400000,
  AUTH0_PROXY_SERVER_URL:
    process.env.AUTH0_PROXY_SERVER_URL ?? 'http://localhost:4000/oauth/token',

  KAFKA_ERROR_TOPIC: process.env.KAFKA_ERROR_TOPIC ?? 'common.error.reporting',
  KAFKA_GROUP_CREATE_TOPIC:
    process.env.KAFKA_GROUP_CREATE_TOPIC ?? 'groups.notification.create',
  KAFKA_GROUP_BULK_CREATE_TOPIC:
    process.env.KAFKA_GROUP_BULK_CREATE_TOPIC ??
    'groups.notification.bulk.create',
  KAFKA_GROUP_UPDATE_TOPIC:
    process.env.KAFKA_GROUP_UPDATE_TOPIC ?? 'groups.notification.update',
  KAFKA_GROUP_DELETE_TOPIC:
    process.env.KAFKA_GROUP_DELETE_TOPIC ?? 'groups.notification.delete',
  KAFKA_GROUP_MEMBER_ADD_TOPIC:
    process.env.KAFKA_GROUP_MEMBER_ADD_TOPIC ??
    'groups.notification.member.add',
  KAFKA_GROUP_MEMBER_DELETE_TOPIC:
    process.env.KAFKA_GROUP_MEMBER_DELETE_TOPIC ??
    'groups.notification.member.delete',
  KAFKA_SUBGROUP_CREATE_TOPIC:
    process.env.KAFKA_SUBGROUP_CREATE_TOPIC ?? 'subgroups.notification.create',
  KAFKA_SUBGROUP_DELETE_TOPIC:
    process.env.KAFKA_SUBGROUP_CREATE_TOPIC ?? 'subgroups.notification.delete',
  KAFKA_GROUP_MEMBER_ROLE_ADD_TOPIC:
    process.env.KAFKA_GROUP_MEMBER_ROLE_ADD_TOPIC ??
    'groups.notification..member.role.add',
  KAFKA_GROUP_MEMBER_ROLE_DELETE_TOPIC:
    process.env.KAFKA_GROUP_MEMBER_ROLE_DELETE_TOPIC ??
    'groups.notification..member.role.delete',
};
