import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Team } from 'src/teams/entities/team.entity';
import { TeamMember } from 'src/team-members/entities/team-member.entity';
import { AmbassadorActivity } from 'src/entities/ambassador-activity.entity';


@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'date', nullable: true })
  dob: string;

  @Column({ nullable: true })
  instagram: string;

  @Column({ default: true })
  active: boolean;

  @Column()
  role: 'ambassador' | 'leader';

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'date', nullable: true })
  participationDate: string;

  @ManyToOne(() => Team, (team) => team.members, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  team: Team;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @OneToMany(() => TeamMember, (teamMember) => teamMember.user)
  teamMemberships: TeamMember[];
  
@OneToMany(() => AmbassadorActivity, (activity) => activity.user)
activities: AmbassadorActivity[];


}
