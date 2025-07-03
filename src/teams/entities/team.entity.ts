import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { TeamMember } from 'src/team-members/entities/team-member.entity';

@Entity()
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

@ManyToOne(() => User, { eager: true }) // or lazy: true
@JoinColumn({ name: 'leaderId' }) // <-- this creates a `leaderId` column
leader: User;


@OneToMany(() => TeamMember, (teamMember) => teamMember.team)
members: TeamMember[];


  @CreateDateColumn()
  createdAt: Date;
}
