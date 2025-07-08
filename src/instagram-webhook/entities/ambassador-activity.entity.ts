import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity()
export class AmbassadorActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mediaType: string;

  @Column()
  permalink: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column()
  userInstagramId: string;

  @ManyToOne(() => User, (user) => user.activities, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
