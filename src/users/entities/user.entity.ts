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
import { Note } from 'src/notes/entities/note.entity';
import { Warning } from 'src/warnings/entities/warning.entity';
import { UserDeactivation } from './UserDeactivation.entity';

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
  role: 'ambassador' | 'leader' | 'admin';

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

  @Column({ nullable: true })
  photoUrl?: string;

  @Column({ nullable: true })
  link?: string;

  @OneToMany(() => TeamMember, (teamMember) => teamMember.user)
  teamMemberships: TeamMember[];

  @OneToMany(() => Note, (note) => note.author)
  authoredNotes: Note[];

  @OneToMany(() => AmbassadorActivity, (activity) => activity.user)
  activities: AmbassadorActivity[];

  @OneToMany(() => Warning, (w) => w.user)
  warnings: Warning[];

  @Column({ type: 'boolean', default: false })
  warningEscalated?: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  warningPausedUntil?: Date;
  
  @Column({ default: 0, nullable: false })
  warningsCount: number;

  @Column({ type: 'text', nullable: true })
  deactivationReason?: string;

  @OneToMany(() => UserDeactivation, d => d.user)
  deactivations: UserDeactivation[];
}