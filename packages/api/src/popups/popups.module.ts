import { Module } from '@nestjs/common';
import { PopupsService } from './popups.service';
import { PopupsController } from './popups.controller';
import { ClickController } from './click.controller';
import { PopupBundleService } from './popup-bundle.service';
import { PopupBundleController } from './popup-bundle.controller';

@Module({
  controllers: [PopupsController, ClickController, PopupBundleController],
  providers: [PopupsService, PopupBundleService],
  exports: [PopupsService, PopupBundleService],
})
export class PopupsModule {}
