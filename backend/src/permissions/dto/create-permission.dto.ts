import { IsIn, IsUUID } from 'class-validator';

export class CreatePermissionDto {
  @IsIn(['file', 'folder'])
  resourceType: string;

  @IsUUID()
  resourceId: string;

  @IsUUID()
  userId: string;

  @IsIn(['read', 'write', 'share'])
  permissionType: string;
}
