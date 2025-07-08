// src/entities/instagram-message.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('instagram_message') // or whatever your table is called
export class InstagramMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  senderId: string;

  @Column()
  text: string;

  @Column()
  mid: string;

  @CreateDateColumn()
  createdAt: Date;
}
