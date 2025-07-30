import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WarningsService } from './warnings.service';
import { WarningsController } from './warnings.controller';
import { WarningsCron } from './warnings.cron';

import { Warning } from './entities/warning.entity';
import { WarningConfig } from './entities/warning-config.entity';
import { User } from '../users/entities/user.entity';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warning, WarningConfig, User, AmbassadorActivity]),
  ],
  controllers: [WarningsController],
  providers: [WarningsService, WarningsCron],
  exports: [WarningsService],
})
export class WarningsModule {}
