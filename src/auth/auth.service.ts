import { Injectable } from '@nestjs/common';
import { AdminUserService } from '../admin/services/admin-user.service';
import { AuthSignService } from './auth-sign.service';
import { AdminLoginPayloadDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly authSignService: AuthSignService,
  ) {}

  async loginAdmin(options: AdminLoginPayloadDto) {
    const user = await this.adminUserService.verify(options);
    return this.authSignService.genAdminToken(user.id);
  }
}
