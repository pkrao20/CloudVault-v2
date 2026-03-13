import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  async search(@Query('email') email: string) {
    if (!email) return null;
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    // Return only safe fields
    const { hashedPassword: _, ...safe } = user as any;
    return safe;
  }
}
