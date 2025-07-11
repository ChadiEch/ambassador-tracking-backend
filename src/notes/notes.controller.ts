// src/notes/notes.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(@Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(createNoteDto);
  }

  @Get('/admin')
  findAllAdmin() {
    return this.notesService.findAllForAdmin();
  }

@Get('/mine')
getMyNotes(@Query('userId') userId: string) {
  return this.notesService.findAllByAuthor(userId);
}


  @Patch('/admin/:id/toggle-archive')
  toggleArchive(@Param('id') id: string) {
    return this.notesService.toggleArchive(id);
  }
}
