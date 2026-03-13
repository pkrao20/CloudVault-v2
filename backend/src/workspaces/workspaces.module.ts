import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { Workspace } from './workspace.entity';
import { WorkspaceMember } from './workspace-member.entity';
import { File } from '../files/file.entity';
import { Folder } from '../folders/folder.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, WorkspaceMember, File, Folder]),
  ],
  providers: [WorkspacesService],
  controllers: [WorkspacesController],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
