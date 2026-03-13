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
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FilesService } from './files.service';
import { RenameFileDto } from './dto/rename-file.dto';
import { MoveFileDto } from './dto/move-file.dto';
import { User } from '../users/user.entity';

const FIVE_GB = 5 * 1024 * 1024 * 1024;

@Controller()
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('workspaces/:workspaceId/files')
  listFiles(
    @Param('workspaceId') workspaceId: string,
    @Query('folderId') folderId: string,
    @CurrentUser() user: User,
  ) {
    const resolvedFolderId =
      folderId === undefined || folderId === 'null' ? null : folderId;
    return this.filesService.listFiles(workspaceId, resolvedFolderId, user.id);
  }

  @Post('workspaces/:workspaceId/files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const tmpDir = path.join(process.cwd(), 'storage', 'tmp');
          fs.mkdirSync(tmpDir, { recursive: true });
          cb(null, tmpDir);
        },
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}-${file.originalname}`);
        },
      }),
      limits: { fileSize: FIVE_GB },
    }),
  )
  uploadFile(
    @Param('workspaceId') workspaceId: string,
    @Query('folderId') folderId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    const resolvedFolderId =
      folderId === undefined || folderId === 'null' ? null : folderId;
    return this.filesService.uploadFile(workspaceId, resolvedFolderId, file, user.id);
  }

  @Post('files/:id/update')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const tmpDir = path.join(process.cwd(), 'storage', 'tmp');
          fs.mkdirSync(tmpDir, { recursive: true });
          cb(null, tmpDir);
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}-${file.originalname}`);
        },
      }),
      limits: { fileSize: FIVE_GB },
    }),
  )
  updateFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.filesService.updateFile(id, file, user.id);
  }

  @Get('files/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.filesService.findOne(id, user.id);
  }

  @Get('files/:id/download')
  async download(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const file = await this.filesService.downloadFile(id, user.id);
    const absolutePath = path.resolve(file.storagePath);
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    if (file.mimeType) {
      res.setHeader('Content-Type', file.mimeType);
    }
    res.sendFile(absolutePath);
  }

  @Patch('files/:id/rename')
  rename(
    @Param('id') id: string,
    @Body() dto: RenameFileDto,
    @CurrentUser() user: User,
  ) {
    return this.filesService.rename(id, dto, user.id);
  }

  @Patch('files/:id/move')
  move(
    @Param('id') id: string,
    @Body() dto: MoveFileDto,
    @CurrentUser() user: User,
  ) {
    return this.filesService.move(id, dto, user.id);
  }

  @Delete('files/:id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.filesService.remove(id, user.id);
  }

  @Get('files/:id/versions')
  getVersions(@Param('id') id: string, @CurrentUser() user: User) {
    return this.filesService.getVersions(id, user.id);
  }

  @Post('files/:id/versions/:versionId/restore')
  restoreVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUser() user: User,
  ) {
    return this.filesService.restoreVersion(id, versionId, user.id);
  }
}
