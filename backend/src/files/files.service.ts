import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { File } from './file.entity';
import { FileVersion } from './file-version.entity';
import { Folder } from '../folders/folder.entity';
import { Permission } from '../permissions/permission.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { RenameFileDto } from './dto/rename-file.dto';
import { MoveFileDto } from './dto/move-file.dto';

const MAX_VERSIONS = 10;

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
    @InjectRepository(FileVersion)
    private readonly versionRepo: Repository<FileVersion>,
    @InjectRepository(Folder)
    private readonly folderRepo: Repository<Folder>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  private async checkEditorOrOwner(workspaceId: string, userId: string) {
    const member = await this.workspacesService.getMember(workspaceId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
    if (member.role !== 'editor' && member.role !== 'owner') {
      throw new ForbiddenException('Editor or owner role required');
    }
    return member;
  }

  private async checkWorkspaceMember(workspaceId: string, userId: string) {
    const member = await this.workspacesService.getMember(workspaceId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
    return member;
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  async listFiles(workspaceId: string, folderId: string | null, userId: string) {
    await this.checkWorkspaceMember(workspaceId, userId);

    const where: any = { workspaceId };
    if (folderId) {
      where.folderId = folderId;
    } else {
      where.folderId = IsNull();
    }

    return this.fileRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async uploadFile(
    workspaceId: string,
    folderId: string | null,
    uploadedFile: Express.Multer.File,
    userId: string,
  ) {
    await this.checkEditorOrOwner(workspaceId, userId);

    // If folderId provided, verify it exists in this workspace; fall back to root if not
    let resolvedFolderId: string | null = null;
    if (folderId) {
      const folder = await this.folderRepo.findOne({
        where: { id: folderId, workspaceId },
      });
      resolvedFolderId = folder ? folder.id : null;
    }

    // Create the file record first to get an ID
    const fileRecord = this.fileRepo.create({
      name: uploadedFile.originalname,
      size: uploadedFile.size,
      folderId: resolvedFolderId,
      workspaceId,
      ownerId: userId,
      storagePath: '', // Will be updated after moving
      mimeType: uploadedFile.mimetype || null,
      currentVersionNumber: 1,
    });
    const saved = await this.fileRepo.save(fileRecord);

    // Move temp file to final storage path
    const sanitizedName = this.sanitizeFilename(uploadedFile.originalname);
    const destDir = path.join(process.cwd(), 'storage', workspaceId, saved.id);
    fs.mkdirSync(destDir, { recursive: true });
    const destFile = path.join(destDir, `v1_${sanitizedName}`);

    fs.renameSync(uploadedFile.path, destFile);

    // Create version record
    const version = this.versionRepo.create({
      fileId: saved.id,
      versionNumber: 1,
      storagePath: destFile,
      size: uploadedFile.size,
      createdBy: userId,
    });
    const savedVersion = await this.versionRepo.save(version);

    // Update file record with storagePath and currentVersionId
    saved.storagePath = destFile;
    saved.currentVersionId = savedVersion.id;
    await this.fileRepo.save(saved);

    return saved;
  }

  async updateFile(id: string, uploadedFile: Express.Multer.File, userId: string) {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const member = await this.workspacesService.getMember(file.workspaceId, userId);
    if (!member || (member.role !== 'editor' && member.role !== 'owner')) {
      // Allow if user has a write permission on this file
      const perm = await this.permRepo.findOne({
        where: { resourceType: 'file', resourceId: id, userId, permissionType: 'write' },
      });
      if (!perm) throw new ForbiddenException('You do not have permission to update this file');
    }

    // Fetch existing versions to enforce max limit
    const allVersions = await this.versionRepo.find({
      where: { fileId: id },
      order: { versionNumber: 'ASC' },
    });

    const newVersionNumber = Number(file.currentVersionNumber) + 1;
    const sanitizedName = this.sanitizeFilename(file.name);
    const destDir = path.join(process.cwd(), 'storage', file.workspaceId, id);
    fs.mkdirSync(destDir, { recursive: true });
    const destFile = path.join(destDir, `v${newVersionNumber}_${sanitizedName}`);

    fs.renameSync(uploadedFile.path, destFile);

    const newVersion = this.versionRepo.create({
      fileId: id,
      versionNumber: newVersionNumber,
      storagePath: destFile,
      size: uploadedFile.size,
      createdBy: userId,
    });
    const savedVersion = await this.versionRepo.save(newVersion);

    // Enforce max 10 versions
    if (allVersions.length >= MAX_VERSIONS) {
      const toDelete = allVersions.slice(0, allVersions.length - MAX_VERSIONS + 1);
      for (const v of toDelete) {
        if (fs.existsSync(v.storagePath)) {
          try { fs.unlinkSync(v.storagePath); } catch { /* ignore */ }
        }
        await this.versionRepo.remove(v);
      }
    }

    file.storagePath = destFile;
    file.size = uploadedFile.size;
    file.mimeType = uploadedFile.mimetype || file.mimeType;
    file.currentVersionId = savedVersion.id;
    file.currentVersionNumber = newVersionNumber;
    await this.fileRepo.save(file);

    return file;
  }

  async findOne(id: string, userId: string) {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const member = await this.workspacesService.getMember(file.workspaceId, userId);
    if (!member) {
      const perm = await this.permRepo.findOne({
        where: { resourceType: 'file', resourceId: id, userId },
      });
      if (!perm) throw new ForbiddenException('You do not have access to this file');
    }

    const version = await this.versionRepo.findOne({
      where: { id: file.currentVersionId },
    });

    return { ...file, currentVersion: version };
  }

  async downloadFile(id: string, userId: string) {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const member = await this.workspacesService.getMember(file.workspaceId, userId);
    if (!member) {
      const perm = await this.permRepo.findOne({
        where: { resourceType: 'file', resourceId: id, userId },
      });
      if (!perm) throw new ForbiddenException('You do not have access to this file');
    }

    if (!fs.existsSync(file.storagePath)) {
      throw new NotFoundException('File not found on disk');
    }

    return file;
  }

  async rename(id: string, dto: RenameFileDto, userId: string) {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    await this.checkEditorOrOwner(file.workspaceId, userId);
    file.name = dto.name;
    return this.fileRepo.save(file);
  }

  async move(id: string, dto: MoveFileDto, userId: string) {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    await this.checkEditorOrOwner(file.workspaceId, userId);
    file.folderId = dto.folderId || null;
    return this.fileRepo.save(file);
  }

  async remove(id: string, userId: string) {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const member = await this.workspacesService.getMember(file.workspaceId, userId);
    if (!member || (member.role !== 'editor' && member.role !== 'owner')) {
      const perm = await this.permRepo.findOne({
        where: { resourceType: 'file', resourceId: id, userId, permissionType: 'write' },
      });
      if (!perm) throw new ForbiddenException('You do not have permission to delete this file');
    }

    await this.fileRepo.softDelete(id);
    return { message: 'File deleted' };
  }

  async getVersions(id: string, userId: string) {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const member = await this.workspacesService.getMember(file.workspaceId, userId);
    if (!member) {
      const perm = await this.permRepo.findOne({
        where: { resourceType: 'file', resourceId: id, userId },
      });
      if (!perm) throw new ForbiddenException('You do not have access to this file');
    }

    return this.versionRepo.find({
      where: { fileId: id },
      order: { versionNumber: 'DESC' },
    });
  }

  async restoreVersion(fileId: string, versionId: string, userId: string) {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const member = await this.workspacesService.getMember(file.workspaceId, userId);
    if (!member || (member.role !== 'editor' && member.role !== 'owner')) {
      const perm = await this.permRepo.findOne({
        where: { resourceType: 'file', resourceId: fileId, userId, permissionType: 'write' },
      });
      if (!perm) throw new ForbiddenException('You do not have permission to restore versions of this file');
    }

    const version = await this.versionRepo.findOne({
      where: { id: versionId, fileId },
    });
    if (!version) {
      throw new NotFoundException('Version not found');
    }

    // Check max versions
    const allVersions = await this.versionRepo.find({
      where: { fileId },
      order: { versionNumber: 'ASC' },
    });

    const newVersionNumber = Number(file.currentVersionNumber) + 1;

    // Copy the old version file to a new path
    const sanitizedName = this.sanitizeFilename(file.name);
    const destDir = path.join(process.cwd(), 'storage', file.workspaceId, fileId);
    fs.mkdirSync(destDir, { recursive: true });
    const newFilePath = path.join(destDir, `v${newVersionNumber}_${sanitizedName}`);

    if (!fs.existsSync(version.storagePath)) {
      throw new BadRequestException('Source version file not found on disk');
    }
    fs.copyFileSync(version.storagePath, newFilePath);

    const newVersion = this.versionRepo.create({
      fileId,
      versionNumber: newVersionNumber,
      storagePath: newFilePath,
      size: version.size,
      createdBy: userId,
      checksum: version.checksum,
    });
    const savedNewVersion = await this.versionRepo.save(newVersion);

    // Enforce max 10 versions: delete oldest if over limit
    if (allVersions.length >= MAX_VERSIONS) {
      const toDelete = allVersions.slice(0, allVersions.length - MAX_VERSIONS + 1);
      for (const v of toDelete) {
        if (fs.existsSync(v.storagePath)) {
          try {
            fs.unlinkSync(v.storagePath);
          } catch (err) {
            // ignore errors when deleting old version files
          }
        }
        await this.versionRepo.remove(v);
      }
    }

    // Update file record
    file.storagePath = newFilePath;
    file.currentVersionId = savedNewVersion.id;
    file.currentVersionNumber = newVersionNumber;
    await this.fileRepo.save(file);

    return file;
  }

}
