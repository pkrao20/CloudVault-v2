import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { User } from '../users/user.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post('permissions')
  create(@Body() dto: CreatePermissionDto, @CurrentUser() user: User) {
    return this.permissionsService.create(dto, user.id);
  }

  @Delete('permissions/:id')
  revoke(@Param('id') id: string, @CurrentUser() user: User) {
    return this.permissionsService.revoke(id, user.id);
  }

  @Get('me/shared')
  getSharedWithMe(@CurrentUser() user: User) {
    return this.permissionsService.getSharedWithMe(user.id);
  }
}
