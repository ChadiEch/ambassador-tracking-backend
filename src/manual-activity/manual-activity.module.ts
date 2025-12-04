import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManualActivityService } from './manual-activity.service';
import { ManualActivityController } from './manual-activity.controller';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AmbassadorActivity, User]),
  ],
  controllers: [ManualActivityController],
  providers: [ManualActivityService],
  exports: [ManualActivityService],
})
export class ManualActivityModule {}