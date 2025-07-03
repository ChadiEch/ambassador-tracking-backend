import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNoteDto } from './dto/create-note.dto';
import { Note } from './entities/note.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note) private noteRepo: Repository<Note>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async create(dto: CreateNoteDto, user: User | null) {
    if (!user) {
      throw new Error('User context is required to create a note');
    }

    const note = this.noteRepo.create({
      content: dto.content,
      author: user,
      target_user: user,
    });

    await this.noteRepo.save(note);
    return { message: 'Note submitted successfully' };
  }

  async findAllForAdmin() {
    const notes = await this.noteRepo.find({
      relations: ['author'],
      order: { created_at: 'DESC' },
    });

    return notes.map((note) => ({
      id: note.id,
      userName: note.author?.name || '[Unknown]',
      role: note.author?.role || 'ambassador',
      message: note.content,
      createdAt: note.created_at,
      archived: note.archived || false,
    }));
  }

  async toggleArchive(id: string) {
    const note = await this.noteRepo.findOne({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');

    note.archived = !note.archived;
    await this.noteRepo.save(note);

    return { message: 'Note archive state toggled' };
  }
}
