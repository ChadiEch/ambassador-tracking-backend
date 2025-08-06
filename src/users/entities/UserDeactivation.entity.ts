import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity()
export class UserDeactivation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.deactivations)
  user: User;

  @Column()
  reason: string;

  @Column('int')
  rating: number;

  @Column({ nullable: true })
  note?: string;

  @Column()
  date: Date;
}
