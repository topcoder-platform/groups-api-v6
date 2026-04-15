-- CreateTable
CREATE TABLE "CommunityMetadata" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "communityName" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "subdomains" TEXT[],
    "groupIds" TEXT[],
    "authorizedGroupIds" TEXT[],
    "terms" INTEGER[],
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "hideSearch" BOOLEAN NOT NULL DEFAULT false,
    "hideFilter" BOOLEAN NOT NULL DEFAULT false,
    "chevronOverAvatar" BOOLEAN NOT NULL DEFAULT false,
    "footerText" TEXT,
    "leaderboardApiUrl" TEXT,
    "newsFeed" TEXT,
    "challengeFilter" JSONB,
    "challengeListing" JSONB,
    "menuItems" JSONB NOT NULL,
    "logos" JSONB NOT NULL,
    "additionalLogos" TEXT[],
    "accessDeniedPage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMetadata_communityId_key" ON "CommunityMetadata"("communityId");

-- CreateIndex
CREATE INDEX "CommunityMetadata_communityId_idx" ON "CommunityMetadata"("communityId");

-- CreateIndex
CREATE INDEX "CommunityMetadata_hidden_idx" ON "CommunityMetadata"("hidden");

-- CreateIndex
CREATE INDEX "CommunityMetadata_subdomains_idx" ON "CommunityMetadata"("subdomains");

