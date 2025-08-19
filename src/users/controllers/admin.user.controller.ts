import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';

import { AdminCrud } from '@/common/decorators/common.decorator';
import { Crud, CrudController } from '@dataui/crud';
import { AdminUserService } from '../services/admin.user.service';
import { User } from '../user.entity';
import { AdminNotifyUserRequest } from '@/users/admin.user.dto';
import { ActionResponse } from '@/common/dto/base.dto';
import { UsersService } from '@/users/user.service';
import { TelegramService } from '@/telegram/telegram.service';

@Crud({
  model: {
    type: User,
  },
  routes: {
    only: ['getOneBase', 'getManyBase', 'updateOneBase'],
  },
  validation: {
    transform: true,
  },
})
@Controller('admin/user')
@AdminCrud()
export class AdminUserController implements CrudController<User> {
  private readonly logger = new Logger(AdminUserController.name);

  constructor(
    public service: AdminUserService,
    private userService: UsersService,
    private telegramService: TelegramService,
  ) {}

  @Post('actions/notify')
  @HttpCode(HttpStatus.OK)
  async notifyUser(
    @Body() body: AdminNotifyUserRequest,
  ): Promise<ActionResponse> {
    if (body.isAll) {
      const users = (await this.userService.findAll()).unwrapOr([] as User[]);
      for (let i = 0; i < users.length; i++) {
        try {
          const user = users[i];
          await this.telegramService.pushSendMessageQueue(
            Number(user.chatId),
            body.message,
            {
              parse_mode: 'Markdown',
            },
            200 * i,
          );
        } catch (err) {
          this.logger.error(err);
        }
      }
      return {
        success: true,
        message: '',
      };
    }

    const userIds = body.userIds.split(',').map((id) => parseInt(id));
    for (let i = 0; i < userIds.length; i++) {
      try {
        const userId = userIds[i];
        const user = (await this.userService.findById(userId)).unwrapOr(null);
        if (!user) {
          continue;
        }
        await this.telegramService.pushSendMessageQueue(
          Number(user.chatId),
          body.message,
          {
            parse_mode: 'Markdown',
          },
          200 * i,
        );
      } catch (err) {
        this.logger.error(err);
      }
    }

    return {
      success: true,
      message: '',
    };
  }
}
