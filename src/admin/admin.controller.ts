import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** Overall site statistics */
  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  /** AWS S3 storage breakdown */
  @Get('storage')
  getStorage() {
    return this.adminService.getStorageStats();
  }

  /** Conversion analytics */
  @Get('analytics')
  getAnalytics() {
    return this.adminService.getAnalytics();
  }

  /** Paginated user list */
  @Get('users')
  getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getUsers(Number(page), Number(limit));
  }

  /** Promote a user to admin role (use ADMIN_SECRET header for extra security) */
  @Post('promote')
  promote(@Body('email') email: string) {
    return this.adminService.promoteToAdmin(email);
  }
}
