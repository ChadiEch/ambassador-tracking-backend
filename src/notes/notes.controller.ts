import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  // Ambassadors create notes (no auth yet — user is null)
  @Post()
  create(@Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(createNoteDto, null);
  }

  // Admin view for moderation
  @Get('/admin')
  findAllAdmin() {
    return this.notesService.findAllForAdmin();
  }

  // Admin toggles archive state
  @Patch('/admin/:id/toggle-archive')
  toggleArchive(@Param('id') id: string) {
    return this.notesService.toggleArchive(id);
  }
}
