import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { Permission } from './permission.entity';
import { File } from '../files/file.entity';
import { Folder } from '../folders/folder.entity';
import { FilesModule } from '../files/files.module';
import { FoldersModule } from '../folders/folders.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, File, Folder]),
    FilesModule,
    FoldersModule,
    WorkspacesModule,
  ],
  providers: [PermissionsService],
  controllers: [PermissionsController],
  exports: [PermissionsService],
})
export class PermissionsModule {}
