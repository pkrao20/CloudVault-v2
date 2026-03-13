import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Folder } from './folder.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameFolderDto } from './dto/rename-folder.dto';
import { MoveFolderDto } from './dto/move-folder.dto';

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder)
    private readonly folderRepo: Repository<Folder>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  private async checkWorkspaceMembership(workspaceId: string, userId: string) {
    const member = await this.workspacesService.getMember(workspaceId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
    return member;
  }

  private async checkEditorOrOwner(workspaceId: string, userId: string) {
    const member = await this.checkWorkspaceMembership(workspaceId, userId);
    if (member.role !== 'editor' && member.role !== 'owner') {
      throw new ForbiddenException('Editor or owner role required');
    }
    return member;
  }

  async create(workspaceId: string, dto: CreateFolderDto, userId: string) {
    await this.checkEditorOrOwner(workspaceId, userId);

    if (dto.parentFolderId) {
      const parent = await this.folderRepo.findOne({
        where: { id: dto.parentFolderId, workspaceId },
      });
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    const folder = this.folderRepo.create({
      name: dto.name,
      ownerId: userId,
      workspaceId,
      parentFolderId: dto.parentFolderId || null,
    });
    return this.folderRepo.save(folder);
  }

  async findAll(workspaceId: string, parentFolderId: string | null, userId: string) {
    await this.checkWorkspaceMembership(workspaceId, userId);

    const where: any = { workspaceId };
    if (parentFolderId === null || parentFolderId === undefined) {
      where.parentFolderId = IsNull();
    } else {
      where.parentFolderId = parentFolderId;
    }

    return this.folderRepo.find({ where });
  }

  async findOne(workspaceId: string, id: string, userId: string) {
    await this.checkWorkspaceMembership(workspaceId, userId);
    const folder = await this.folderRepo.findOne({ where: { id, workspaceId } });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return folder;
  }

  async rename(id: string, dto: RenameFolderDto, userId: string) {
    const folder = await this.folderRepo.findOne({ where: { id } });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    await this.checkEditorOrOwner(folder.workspaceId, userId);
    folder.name = dto.name;
    return this.folderRepo.save(folder);
  }

  async move(id: string, dto: MoveFolderDto, userId: string) {
    const folder = await this.folderRepo.findOne({ where: { id } });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    await this.checkEditorOrOwner(folder.workspaceId, userId);

    const newParentId = dto.parentFolderId;

    if (newParentId) {
      // Validate no circular moves
      if (newParentId === id) {
        throw new BadRequestException('Cannot move a folder into itself');
      }
      // Check if newParentId is a descendant of this folder
      const isCircular = await this.isDescendant(id, newParentId);
      if (isCircular) {
        throw new BadRequestException('Circular folder move detected');
      }

      const parent = await this.folderRepo.findOne({
        where: { id: newParentId, workspaceId: folder.workspaceId },
      });
      if (!parent) {
        throw new NotFoundException('Target parent folder not found');
      }
    }

    folder.parentFolderId = newParentId || null;
    return this.folderRepo.save(folder);
  }

  private async isDescendant(ancestorId: string, potentialDescendantId: string): Promise<boolean> {
    // Walk up from potentialDescendant to see if we hit ancestorId
    let current = await this.folderRepo.findOne({ where: { id: potentialDescendantId } });
    const visited = new Set<string>();
    while (current && current.parentFolderId) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      if (current.parentFolderId === ancestorId) return true;
      current = await this.folderRepo.findOne({ where: { id: current.parentFolderId } });
    }
    return false;
  }

  async remove(id: string, userId: string) {
    const folder = await this.folderRepo.findOne({ where: { id } });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    await this.checkEditorOrOwner(folder.workspaceId, userId);
    await this.folderRepo.softDelete(id);
    return { message: 'Folder deleted' };
  }

  async findById(id: string): Promise<Folder | null> {
    return this.folderRepo.findOne({ where: { id } });
  }
}
