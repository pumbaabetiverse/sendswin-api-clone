import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { UsersService } from '@/users/user.service';
import {
  LoginResultPayload,
  UsernameLoginPayload,
  UsernameRegisterPayload,
} from '@/auth/auth.dto';
import { AuthSignService } from '@/auth/auth-sign.service';
import { compare } from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly userService: UsersService,
    private readonly authSignService: AuthSignService,
  ) {}

  @Post('/register/username')
  async registerByUsername(
    @Body() body: UsernameRegisterPayload,
  ): Promise<LoginResultPayload> {
    const userResult = await this.userService.createUserWithPassword(
      body.username,
      body.password,
      body.inviteCode,
    );

    if (userResult.isErr()) {
      throw new BadRequestException(userResult.error.message);
    }

    const signResult = await this.authSignService.genUserToken(
      userResult.value.id,
    );
    if (signResult.isErr()) {
      throw new BadRequestException(signResult.error.message);
    }

    return {
      token: signResult.value,
    };
  }

  @Post('/login/username')
  async loginByUsername(
    @Body() body: UsernameLoginPayload,
  ): Promise<LoginResultPayload> {
    const telegramId = `user_${body.username}`;
    const userResult = await this.userService.findByTelegramId(telegramId);

    if (userResult.isErr() || !userResult.value) {
      throw new BadRequestException('Invalid username or password');
    }

    if (
      !userResult.value.password ||
      !(await compare(body.password, userResult.value.password))
    ) {
      throw new BadRequestException('Invalid username or password');
    }

    const signResult = await this.authSignService.genUserToken(
      userResult.value.id,
    );
    if (signResult.isErr()) {
      throw new BadRequestException(signResult.error.message);
    }

    return {
      token: signResult.value,
    };
  }
}
