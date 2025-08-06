import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserDeactivation } from './entities/UserDeactivation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDeactivation]) // ✅ REGISTER BOTH ENTITIES
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
