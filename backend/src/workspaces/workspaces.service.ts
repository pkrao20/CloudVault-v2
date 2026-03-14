import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './workspace.entity';
import { WorkspaceMember } from './workspace-member.entity';
import { File } from '../files/file.entity';
import { Folder } from '../folders/folder.entity';
import { Permission } from '../permissions/permission.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
    @InjectRepository(Folder)
    private readonly folderRepo: Repository<Folder>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
  ) {}

  async create(dto: CreateWorkspaceDto, userId: string) {
    const workspace = this.workspaceRepo.create({
      name: dto.name,
      ownerId: userId,
    });
    const saved = await this.workspaceRepo.save(workspace);

    const member = this.memberRepo.create({
      workspaceId: saved.id,
      userId,
      role: 'owner',
    });
    await this.memberRepo.save(member);

    return saved;
  }

  async findAllForUser(userId: string) {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['workspace'],
    });
    return memberships
      .filter((m) => m.workspace && !m.workspace.deletedAt)
      .map((m) => m.workspace);
  }

  async findOne(id: string, userId: string) {
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const member = await this.memberRepo.findOne({
      where: { workspaceId: id, userId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const members = await this.memberRepo.find({
      where: { workspaceId: id },
      relations: ['user'],
    });

    const safeMembers = members.map((m) => {
      if (m.user) {
        const { hashedPassword, ...safeUser } = m.user as any;
        return { ...m, user: safeUser };
      }
      return m;
    });

    return { ...workspace, members: safeMembers };
  }

  async remove(id: string, userId: string) {
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete this workspace');
    }
    await this.workspaceRepo.softDelete(id);
    return { message: 'Workspace deleted' };
  }

  async addMember(id: string, dto: AddMemberDto, userId: string) {
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const currentMember = await this.memberRepo.findOne({
      where: { workspaceId: id, userId },
    });
    if (!currentMember) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
    if (currentMember.role !== 'owner' && currentMember.role !== 'editor') {
      throw new ForbiddenException('Only owner or editor can add members');
    }

    const existing = await this.memberRepo.findOne({
      where: { workspaceId: id, userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException('User is already a member');
    }

    const member = this.memberRepo.create({
      workspaceId: id,
      userId: dto.userId,
      role: dto.role,
    });
    const savedMember = await this.memberRepo.save(member);

    // Bulk-grant permissions on all existing files and folders in the workspace
    const permissionType =
      dto.role === 'owner' ? 'share' : dto.role === 'editor' ? 'write' : 'read';

    const [files, folders] = await Promise.all([
      this.fileRepo.find({ where: { workspaceId: id } }),
      this.folderRepo.find({ where: { workspaceId: id } }),
    ]);

    const permsToInsert = [
      ...files.map((f) => ({
        resourceType: 'file',
        resourceId: f.id,
        userId: dto.userId,
        permissionType,
        grantedBy: userId,
      })),
      ...folders.map((f) => ({
        resourceType: 'folder',
        resourceId: f.id,
        userId: dto.userId,
        permissionType,
        grantedBy: userId,
      })),
    ];

    if (permsToInsert.length > 0) {
      await this.permRepo
        .createQueryBuilder()
        .insert()
        .into(Permission)
        .values(permsToInsert)
        .orIgnore()
        .execute();
    }

    return savedMember;
  }

  async removeMember(id: string, targetUserId: string, userId: string) {
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can remove members');
    }

    const member = await this.memberRepo.findOne({
      where: { workspaceId: id, userId: targetUserId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.memberRepo.remove(member);
    return { message: 'Member removed' };
  }

  async getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    return this.memberRepo.findOne({ where: { workspaceId, userId } });
  }

  async sync(workspaceId: string, since: string, userId: string) {
    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const sinceDate = new Date(since);

    // Get all files (including soft-deleted) modified or deleted after 'since'
    const allFiles = await this.fileRepo.find({
      where: { workspaceId },
      withDeleted: true,
    });

    const activeFiles = allFiles.filter(
      (f) => !f.deletedAt && f.updatedAt > sinceDate,
    );
    const deletedFiles = allFiles.filter(
      (f) => f.deletedAt && f.deletedAt > sinceDate,
    );

    // Get all folders (including soft-deleted) modified or deleted after 'since'
    const allFolders = await this.folderRepo.find({
      where: { workspaceId },
      withDeleted: true,
    });

    const activeFolders = allFolders.filter(
      (f) => !f.deletedAt && f.updatedAt > sinceDate,
    );
    const deletedFolders = allFolders.filter(
      (f) => f.deletedAt && f.deletedAt > sinceDate,
    );

    return {
      files: activeFiles,
      folders: activeFolders,
      deletedFiles: deletedFiles.map((f) => ({ id: f.id, deletedAt: f.deletedAt })),
      deletedFolders: deletedFolders.map((f) => ({
        id: f.id,
        deletedAt: f.deletedAt,
      })),
    };
  }
}
