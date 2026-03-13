import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { FoldersModule } from './folders/folders.module';
import { FilesModule } from './files/files.module';
import { PermissionsModule } from './permissions/permissions.module';
import { User } from './users/user.entity';
import { Workspace } from './workspaces/workspace.entity';
import { WorkspaceMember } from './workspaces/workspace-member.entity';
import { Folder } from './folders/folder.entity';
import { File } from './files/file.entity';
import { FileVersion } from './files/file-version.entity';
import { Permission } from './permissions/permission.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'cloudvault',
      entities: [
        User,
        Workspace,
        WorkspaceMember,
        Folder,
        File,
        FileVersion,
        Permission,
      ],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    WorkspacesModule,
    FoldersModule,
    FilesModule,
    PermissionsModule,
  ],
})
export class AppModule {}
