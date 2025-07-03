// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>
  ) {}

  async validateLogin(username: string, password: string) {
    const user = await this.usersRepo.findOneBy({ username });

    if (!user || user.password !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // In a real app, return a JWT token
    return {
      token: 'dummy-token',
      role: user.role,
      userId: user.id,
    };
  }
}
