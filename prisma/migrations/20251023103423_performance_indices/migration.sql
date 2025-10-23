-- CreateIndex
CREATE INDEX "Group_status_organizationId_idx" ON "Group"("status", "organizationId");

-- CreateIndex
CREATE INDEX "Group_domain_idx" ON "Group"("domain");

-- CreateIndex
CREATE INDEX "Group_ssoId_idx" ON "Group"("ssoId");

-- CreateIndex
CREATE INDEX "Group_privateGroup_status_idx" ON "Group"("privateGroup", "status");

-- CreateIndex
CREATE INDEX "GroupMember_memberId_membershipType_idx" ON "GroupMember"("memberId", "membershipType");

-- CreateIndex
CREATE INDEX "User_universalUID_idx" ON "User"("universalUID");
