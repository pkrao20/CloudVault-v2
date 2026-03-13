import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsUUID()
  parentFolderId?: string;
}
