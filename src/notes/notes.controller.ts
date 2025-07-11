import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  // Ambassadors create notes (no auth yet — user is null)
@Post()
create(@Body() createNoteDto: CreateNoteDto) {
  const mockLeaderUser = { id: 'leader-id', name: 'Mock Leader', role: 'leader' } as any;
  return this.notesService.create(createNoteDto, mockLeaderUser); // Replace with real user context in production
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
