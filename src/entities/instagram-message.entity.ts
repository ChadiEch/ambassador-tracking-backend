import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class InstagramMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  senderId: string;

  @Column()
  text: string;

  @Column({ unique: true })
  mid: string;

  @CreateDateColumn()
  createdAt: Date;
}
