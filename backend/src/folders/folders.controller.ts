import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameFolderDto } from './dto/rename-folder.dto';
import { MoveFolderDto } from './dto/move-folder.dto';
import { User } from '../users/user.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post('workspaces/:workspaceId/folders')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateFolderDto,
    @CurrentUser() user: User,
  ) {
    return this.foldersService.create(workspaceId, dto, user.id);
  }

  @Get('workspaces/:workspaceId/folders')
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query('parentFolderId') parentFolderId: string,
    @CurrentUser() user: User,
  ) {
    const resolvedParentId =
      parentFolderId === undefined || parentFolderId === 'null'
        ? null
        : parentFolderId;
    return this.foldersService.findAll(workspaceId, resolvedParentId, user.id);
  }

  @Get('workspaces/:workspaceId/folders/:id')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.foldersService.findOne(workspaceId, id, user.id);
  }

  @Patch('folders/:id/rename')
  rename(
    @Param('id') id: string,
    @Body() dto: RenameFolderDto,
    @CurrentUser() user: User,
  ) {
    return this.foldersService.rename(id, dto, user.id);
  }

  @Patch('folders/:id/move')
  move(
    @Param('id') id: string,
    @Body() dto: MoveFolderDto,
    @CurrentUser() user: User,
  ) {
    return this.foldersService.move(id, dto, user.id);
  }

  @Delete('folders/:id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.foldersService.remove(id, user.id);
  }
}
