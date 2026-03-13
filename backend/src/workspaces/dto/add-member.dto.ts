import { IsUUID, IsIn } from 'class-validator';

export class AddMemberDto {
  @IsUUID()
  userId: string;

  @IsIn(['viewer', 'editor', 'owner'])
  role: string;
}
