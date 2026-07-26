import { Module } from "@nestjs/common";
import { AffiliateController } from "./affiliate.controller";
import { AffiliateService } from "./affiliate.service";
import { AdsController } from "./ads.controller";
import { AdsService } from "./ads.service";
import { NewsletterController } from "./newsletter.controller";
import { NewsletterService } from "./newsletter.service";
import { MonetizationController } from "./monetization.controller";
import { MonetizationService } from "./monetization.service";
import {
  PlatformController,
  RevenueController,
  GrowthCenterController,
  PartnerController,
} from "./platform.controller";
import {
  GrowthCenterService,
  PartnerService,
  PlatformService,
  RevenueService,
} from "./platform.service";
import { SponsoredController } from "./sponsored.controller";
import { SponsoredService } from "./sponsored.service";

@Module({
  controllers: [
    AffiliateController,
    SponsoredController,
    AdsController,
    NewsletterController,
    PlatformController,
    RevenueController,
    GrowthCenterController,
    PartnerController,
    MonetizationController,
  ],
  providers: [
    AffiliateService,
    SponsoredService,
    AdsService,
    NewsletterService,
    PlatformService,
    RevenueService,
    GrowthCenterService,
    PartnerService,
    MonetizationService,
  ],
  exports: [PlatformService],
})
export class CommercialModule {}
