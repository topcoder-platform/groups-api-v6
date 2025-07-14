import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GlobalProvidersModule } from 'src/shared/modules/global/globalProviders.module';
import { HealthCheckController } from './health-check/healthCheck.controller';
import { GroupController } from './group/group.controller';
import { GroupMembershipController } from './group-membership/groupMembership.controller';
import { GroupRoleController } from './group-role/groupRole.controller';
import { SubGroupController } from './subgroup/subGroup.controller';
// import { AppealController } from './appeal/appeal.controller';
// import { ContactRequestsController } from './contact/contactRequests.controller';
// import { ReviewController } from './review/review.controller';
// import { ProjectResultController } from './project-result/projectResult.controller';
// import { ReviewOpportunityController } from './review-opportunity/reviewOpportunity.controller';
// import { ReviewApplicationController } from './review-application/reviewApplication.controller';
import { GroupService } from './group/group.service';
import { GroupMembershipService } from './group-membership/groupMembership.service';
import { GroupRoleService } from './group-role/groupRole.service';
import { SubGroupService } from './subgroup/subGroup.service';
// import { ReviewOpportunityService } from './review-opportunity/reviewOpportunity.service';
// import { ReviewApplicationService } from './review-application/reviewApplication.service';
// import { ReviewHistoryController } from './review-history/reviewHistory.controller';
// import { ChallengeApiService } from 'src/shared/modules/global/challenge.service';

@Module({
  imports: [HttpModule, GlobalProvidersModule],
  controllers: [
    HealthCheckController,
    GroupController,
    GroupMembershipController,
    GroupRoleController,
    SubGroupController,
    // AppealController,
    // ContactRequestsController,
    // ReviewController,
    // ProjectResultController,
    // ReviewOpportunityController,
    // ReviewApplicationController,
    // ReviewHistoryController
  ],
  providers: [
    GroupService,
    GroupMembershipService,
    GroupRoleService,
    SubGroupService,
  ],
})
export class ApiModule {}
