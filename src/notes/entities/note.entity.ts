import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';


@Entity()
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.authoredNotes)
@JoinColumn({ name: 'authorId' })
author: User;

@Column()
authorId: string;

  @ManyToOne(() => User)
  target_user: User;

  @Column('text')
  content: string;

  @Column({ default: false })
  archived: boolean; // ✅ Add this line

  @CreateDateColumn()
  created_at: Date;
}
