import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { File } from './file.entity';
import { User } from '../users/user.entity';

@Entity('file_versions')
@Unique(['fileId', 'versionNumber'])
export class FileVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileId: string;

  @ManyToOne(() => File, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: File;

  @Column()
  versionNumber: number;

  @Column()
  storagePath: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column()
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  checksum: string;
}
