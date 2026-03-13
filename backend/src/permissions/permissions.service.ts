import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { FilesService } from '../files/files.service';
import { FoldersService } from '../folders/folders.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    private readonly filesService: FilesService,
    private readonly foldersService: FoldersService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  private async canGrantPermission(
    resourceType: string,
    resourceId: string,
    grantingUserId: string,
  ): Promise<boolean> {
    if (resourceType === 'file') {
      // Check if granting user is the owner of the file or a workspace owner/editor
      const file = await this.filesService['fileRepo'].findOne({
        where: { id: resourceId },
      });
      if (!file) return false;

      if (file.ownerId === grantingUserId) return true;

      const member = await this.workspacesService.getMember(
        file.workspaceId,
        grantingUserId,
      );
      if (member && (member.role === 'owner' || member.role === 'editor')) return true;

      // Check if granting user has 'share' permission
      const perm = await this.permRepo.findOne({
        where: {
          resourceType,
          resourceId,
          userId: grantingUserId,
          permissionType: 'share',
        },
      });
      return !!perm;
    } else if (resourceType === 'folder') {
      const folder = await this.foldersService.findById(resourceId);
      if (!folder) return false;

      if (folder.ownerId === grantingUserId) return true;

      const member = await this.workspacesService.getMember(
        folder.workspaceId,
        grantingUserId,
      );
      if (member && (member.role === 'owner' || member.role === 'editor')) return true;

      const perm = await this.permRepo.findOne({
        where: {
          resourceType,
          resourceId,
          userId: grantingUserId,
          permissionType: 'share',
        },
      });
      return !!perm;
    }
    return false;
  }

  async create(dto: CreatePermissionDto, grantingUserId: string) {
    const canGrant = await this.canGrantPermission(
      dto.resourceType,
      dto.resourceId,
      grantingUserId,
    );
    if (!canGrant) {
      throw new ForbiddenException(
        'You do not have permission to grant access to this resource',
      );
    }

    const existing = await this.permRepo.findOne({
      where: {
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        userId: dto.userId,
      },
    });
    if (existing) {
      throw new ConflictException('Permission already exists for this user and resource');
    }

    const permission = this.permRepo.create({
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      userId: dto.userId,
      permissionType: dto.permissionType,
      grantedBy: grantingUserId,
    });
    return this.permRepo.save(permission);
  }

  async revoke(id: string, userId: string) {
    const perm = await this.permRepo.findOne({ where: { id } });
    if (!perm) {
      throw new NotFoundException('Permission not found');
    }

    // Resource owner or the one who granted permission can revoke
    const canRevoke =
      perm.grantedBy === userId ||
      (await this.canGrantPermission(perm.resourceType, perm.resourceId, userId));

    if (!canRevoke) {
      throw new ForbiddenException('You cannot revoke this permission');
    }

    await this.permRepo.remove(perm);
    return { message: 'Permission revoked' };
  }

  async getSharedWithMe(userId: string) {
    const permissions = await this.permRepo.find({
      where: { userId },
      relations: ['granter'],
    });

    const filePerms = permissions.filter((p) => p.resourceType === 'file');
    const folderPerms = permissions.filter((p) => p.resourceType === 'folder');

    return {
      files: filePerms.map((p) => ({
        id: p.id,
        resourceId: p.resourceId,
        permissionType: p.permissionType,
        grantedAt: p.grantedAt,
        grantedBy: p.granter
          ? { id: p.granter.id, name: (p.granter as any).name, email: (p.granter as any).email }
          : null,
      })),
      folders: folderPerms.map((p) => ({
        id: p.id,
        resourceId: p.resourceId,
        permissionType: p.permissionType,
        grantedAt: p.grantedAt,
        grantedBy: p.granter
          ? { id: p.granter.id, name: (p.granter as any).name, email: (p.granter as any).email }
          : null,
      })),
    };
  }
}
