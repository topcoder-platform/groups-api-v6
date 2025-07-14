import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const groupData: Prisma.GroupCreateManyInput[] = [
  {
    id: '2fd8ba9f-e229-40f8-9f3e-6a75aba7c8f1',
    name: 'Wipro - Topgear - Group_265111',
    description: 'Wipro Topgear group for internal challenges',
    organizationId: '111',
    domain: '',
    ssoId: '',
    oldId: '20000014',
    privateGroup: false,
    selfRegister: false,
    status: 'active',
    createdBy: '00000000',
    createdAt: '2019-10-11T07:21:13.326Z',
    updatedBy: '00000000',
    updatedAt: '2020-11-06T14:52:25.864Z',
  },
  {
    id: '546bb184-1338-4979-b4a4-f0e82e2602a8',
    ssoId: '',
    updatedBy: '00000000',
    description: 'AAA',
    privateGroup: false,
    oldId: '20000013',
    organizationId: '222',
    createdAt: '2020-11-01T05:44:17.593Z',
    selfRegister: false,
    createdBy: '00000000',
    domain: '',
    name: 'Wipro - Topgear - AABB',
    updatedAt: '2020-11-01T07:32:40.691Z',
    status: 'inactive',
  },
  {
    id: 'fabcb683-d749-47da-81f4-91f5f80a8571',
    ssoId: '',
    updatedBy: '00000000',
    description: 'BBBB',
    privateGroup: false,
    oldId: '',
    organizationId: '333',
    createdAt: '2020-11-01T05:44:26.546Z',
    selfRegister: false,
    createdBy: '00000000',
    domain: '',
    name: 'Wipro - Topgear - BBB',
    updatedAt: '2020-11-01T05:45:50.048Z',
    status: 'inactive',
  },
  {
    id: '0eda0b91-3cc5-4778-8e5f-1d9a67ecae12',
    ssoId: '',
    updatedBy: '40029484',
    description: 'test group api',
    privateGroup: false,
    oldId: '',
    organizationId: '222',
    createdAt: '2023-02-24T09:40:19.708Z',
    selfRegister: true,
    createdBy: '40029484',
    domain: 'developer',
    name: '4group1',
    updatedAt: '2023-02-24T09:41:06.140Z',
    status: 'active',
  },
  {
    id: '304b042f-19f1-4d06-9788-104572eca795',
    ssoId: '',
    updatedBy: '1',
    description: 'Test Group',
    privateGroup: false,
    oldId: '1',
    organizationId: '222',
    createdAt: '2017-05-18T10:29:38.000Z',
    selfRegister: false,
    createdBy: '1',
    domain: '',
    name: 'TestGroup',
    status: 'active',
    updatedAt: '2017-05-18T10:29:38.000Z',
  },
  {
    id: 'd55cc318-b1f4-4fb9-b3fa-991f0a237baf',
    ssoId: '',
    updatedBy: '00000000',
    description: 'desc1-updated-4',
    privateGroup: false,
    oldId: '1',
    organizationId: '111',
    createdAt: '2022-06-24T05:57:26.298Z',
    selfRegister: false,
    createdBy: '00000000',
    domain: '',
    name: 'group1-updated-4',
    updatedAt: '2022-06-24T05:57:32.958Z',
    status: 'active',
  },
  {
    id: '042a9dac-19a4-464a-8e8b-c1b1fd18e55b',
    ssoId: '',
    updatedBy: '40029484',
    description: 'desc1-updated-1',
    privateGroup: false,
    oldId: '1',
    organizationId: '222',
    createdAt: '2022-06-24T05:56:51.613Z',
    selfRegister: false,
    createdBy: '40029484',
    domain: 'add_domain',
    name: 'group1-updated-1',
    updatedAt: '2022-06-24T05:57:08.406Z',
    status: 'active',
  },
  {
    id: '110692e5-3bc9-47d5-b7c8-70fefaba0662',
    ssoId: '',
    updatedBy: '00000000',
    description: 'desc1-updated-2',
    privateGroup: false,
    oldId: '1',
    organizationId: '111',
    createdAt: '2022-06-24T05:57:26.374Z',
    selfRegister: false,
    createdBy: '00000000',
    domain: '',
    name: 'group1-updated-2',
    updatedAt: '2022-06-24T05:58:19.701Z',
    status: 'active',
  },
  {
    id: 'e2e2a0ee-f02e-4756-8cd9-7c25f83d5f5b',
    ssoId: '',
    updatedBy: '305384',
    description: 'Test Group 12345715P',
    privateGroup: false,
    oldId: '1234',
    organizationId: '111',
    createdAt: '2023-02-23T19:03:11.575Z',
    selfRegister: true,
    createdBy: '305384',
    domain: '',
    name: 'Test Group 12345717P',
    updatedAt: '2023-02-23T19:59:31.018Z',
    status: 'active',
  },
  {
    id: 'beb4cb39-6e06-45ec-b1da-b02d3529f2a7',
    ssoId: '',
    updatedBy: '305384',
    description: 'Test Cached Group',
    privateGroup: false,
    oldId: '12345',
    organizationId: '111',
    createdAt: '2023-02-27T18:05:15.938Z',
    selfRegister: true,
    createdBy: '305384',
    domain: '',
    name: 'Test Cached Group',
    updatedAt: '2023-02-27T18:06:20.116Z',
    status: 'active',
  },
  {
    id: '11111111-2222-3333-9999-444444444444',
    ssoId: '',
    updatedBy: '305384',
    description: 'Test Deleted Group',
    privateGroup: false,
    oldId: '12345',
    organizationId: '222',
    createdAt: '2023-02-27T18:05:15.938Z',
    selfRegister: true,
    createdBy: '305384',
    domain: '',
    name: 'Test Deleted Group',
    updatedAt: '2023-02-27T18:06:20.116Z',
    status: 'active',
  },
];

const userData: Prisma.UserCreateInput[] = [
  {
    id: '8uHVTW2WHp8BbBPX7J0YTAwgYbYTfjsM',
    universalUID: '8uHVTW2WHp8BbBPX7J0YTAwgYbYTfjsM',
    createdBy: 'admin',
  },
  {
    id: '999f3f28-1549-4d35-ba40-b1b3512142dd',
    universalUID: '10000021',
    createdBy: 'admin',
  },
  {
    id: '999f3f28-1549-4d35-ba40-b1b3512142de',
    universalUID: '10000022',
    createdBy: 'admin',
  },
  {
    id: '999f3f28-1549-4d35-ba40-b1b351214333',
    universalUID: '22838965',
    createdBy: 'admin',
  },
];

const groupMembershipData: Prisma.GroupMembershipCreateManyInput[] = [
  {
    id: 'b29f3f28-1549-4d35-ba40-b1b3512142cc',
    groupId: '2fd8ba9f-e229-40f8-9f3e-6a75aba7c8f1',
    createdAt: '2020-11-24T10:36:19.598Z',
    createdBy: '40159127',
    memberId: '40159127',
    membershipType: 'user',
  },
  {
    id: 'aabd863f-52a1-49c2-8b68-2d58f77405b5',
    groupId: '2fd8ba9f-e229-40f8-9f3e-6a75aba7c8f1',
    createdAt: '2020-02-08T18:59:40.240Z',
    createdBy: '00000000',
    memberId: '23274118',
    membershipType: 'user',
  },
  {
    id: '189e8a5c-28c5-423e-834f-e8f1e2ff85fc',
    groupId: '2fd8ba9f-e229-40f8-9f3e-6a75aba7c8f1',
    createdAt: '2020-02-08T18:59:40.106Z',
    createdBy: '00000001',
    memberId: '22838965',
    membershipType: 'user',
  },
  {
    id: '999f3f28-1549-4d35-ba40-b1b3512142df',
    groupId: '2fd8ba9f-e229-40f8-9f3e-6a75aba7c8f1',
    createdAt: '2020-02-08T18:59:40.106Z',
    createdBy: '00000001',
    memberId: '8uHVTW2WHp8BbBPX7J0YTAwgYbYTfjsM',
    membershipType: 'user',
    roles: [
      {
        role: 'groupAdmin',
        createdAt: '2020-02-09T18:59:40.106Z',
        createdBy: '20000002',
      },
      {
        role: 'groupManager',
        createdAt: '2020-02-19T18:59:40.106Z',
        createdBy: '20000003',
      },
    ],
  },
  {
    id: '999f3f28-1549-4d35-ba40-b1b3512142a1',
    groupId: 'd55cc318-b1f4-4fb9-b3fa-991f0a237baf',
    createdAt: '2020-02-08T18:59:40.106Z',
    createdBy: '00000001',
    memberId: '22838965',
    membershipType: 'user',
    roles: [
      {
        role: 'groupManager',
        createdAt: '2020-02-09T18:59:40.106Z',
        createdBy: '20000002',
      },
    ],
  },
  {
    id: '999f3f28-1549-4d35-ba40-b1b3512142a2',
    groupId: 'd55cc318-b1f4-4fb9-b3fa-991f0a237baf',
    createdAt: '2020-02-08T18:59:40.106Z',
    createdBy: '00000001',
    memberId: '22838966',
    membershipType: 'user',
  },
  {
    id: '999f3f28-1549-4d35-ba40-b1b3512142a3',
    groupId: 'd55cc318-b1f4-4fb9-b3fa-991f0a237baf',
    createdAt: '2020-02-08T18:59:40.106Z',
    createdBy: '00000001',
    memberId: '999f3f28-1549-4d35-ba40-b1b351214333',
    membershipType: 'user',
  },
  {
    id: '999f3f28-1549-4d35-ba40-b1b3512142a4',
    groupId: '546bb184-1338-4979-b4a4-f0e82e2602a8',
    createdAt: '2020-02-08T18:59:40.106Z',
    createdBy: '00000001',
    memberId: '8uHVTW2WHp8BbBPX7J0YTAwgYbYTfjsM',
    membershipType: 'user',
    roles: [
      {
        role: 'groupManager',
        createdAt: '2020-02-09T18:59:40.106Z',
        createdBy: '20000002',
      },
    ],
  },
  {
    id: '999f3f28-1549-4d35-ba40-b1b3512142a5',
    groupId: 'fabcb683-d749-47da-81f4-91f5f80a8571',
    createdAt: '2020-02-08T18:59:40.106Z',
    createdBy: '00000001',
    memberId: '8uHVTW2WHp8BbBPX7J0YTAwgYbYTfjsM',
    membershipType: 'user',
    roles: [
      {
        role: 'groupManager',
        createdAt: '2020-02-09T18:59:40.106Z',
        createdBy: '20000002',
      },
    ],
  },
];

async function clearDB() {
  await prisma.groupMembership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();
}

async function main() {
  console.log(`Clear DB data ...`);

  await clearDB();

  console.log(`Start seeding ...`);

  const groupObjs = await prisma.group.createManyAndReturn({
    data: groupData,
  });
  console.log(`Created group data `);

  await prisma.group.update({
    where: {
      id: groupObjs[0].id,
    },
    data: {
      subGroups: {
        connect: [
          { id: groupObjs[1].id },
          { id: groupObjs[2].id },
          { id: groupObjs[3].id },
        ],
      },
    },
  });

  groupMembershipData.push({
    groupId: groupObjs[0].id,
    memberId: groupObjs[1].id,
    membershipType: 'group',
    createdBy: 'test',
  });

  groupMembershipData.push({
    groupId: groupObjs[0].id,
    memberId: groupObjs[2].id,
    membershipType: 'group',
    createdBy: 'test',
  });

  groupMembershipData.push({
    groupId: groupObjs[0].id,
    memberId: groupObjs[3].id,
    membershipType: 'group',
    createdBy: 'test',
  });

  await prisma.group.update({
    where: {
      id: groupObjs[1].id,
    },
    data: {
      subGroups: {
        connect: [{ id: groupObjs[4].id }, { id: groupObjs[5].id }],
      },
    },
  });

  groupMembershipData.push({
    groupId: groupObjs[1].id,
    memberId: groupObjs[4].id,
    membershipType: 'group',
    createdBy: 'test',
  });

  groupMembershipData.push({
    groupId: groupObjs[1].id,
    memberId: groupObjs[5].id,
    membershipType: 'group',
    createdBy: 'test',
  });

  await prisma.group.update({
    where: {
      id: groupObjs[2].id,
    },
    data: {
      subGroups: {
        connect: [{ id: groupObjs[4].id }, { id: groupObjs[6].id }],
      },
    },
  });

  groupMembershipData.push({
    groupId: groupObjs[2].id,
    memberId: groupObjs[4].id,
    membershipType: 'group',
    createdBy: 'test',
  });

  groupMembershipData.push({
    groupId: groupObjs[2].id,
    memberId: groupObjs[5].id,
    membershipType: 'group',
    createdBy: 'test',
  });

  await prisma.group.update({
    where: {
      id: groupObjs[4].id,
    },
    data: {
      subGroups: {
        connect: [{ id: groupObjs[7].id }],
      },
    },
  });

  groupMembershipData.push({
    groupId: groupObjs[4].id,
    memberId: groupObjs[7].id,
    membershipType: 'group',
    createdBy: 'test',
  });

  await prisma.group.update({
    where: {
      id: groupObjs[7].id,
    },
    data: {
      subGroups: {
        connect: [{ id: groupObjs[8].id }, { id: groupObjs[5].id }],
      },
    },
  });

  groupMembershipData.push({
    groupId: groupObjs[7].id,
    memberId: groupObjs[8].id,
    membershipType: 'group',
    createdBy: 'test',
  });

  groupMembershipData.push({
    groupId: groupObjs[7].id,
    memberId: groupObjs[5].id,
    membershipType: 'group',
    createdBy: 'test',
  });

  console.log(`Created group relationship `);

  await prisma.user.createManyAndReturn({
    data: userData,
  });
  console.log(`Created user data `);

  await prisma.groupMembership.createManyAndReturn({
    data: groupMembershipData,
  });
  console.log(`Created group membership data `);

  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
