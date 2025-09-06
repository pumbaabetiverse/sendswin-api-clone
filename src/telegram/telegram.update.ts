import { Ctx, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Injectable, Logger } from '@nestjs/common';
import { SettingService } from '@/setting/setting.service';
import { SettingKey } from '@/common/const';
import { UsersService } from '@/users/user.service';

@Update()
@Injectable()
export class TelegramUpdate {
  private logger = new Logger(TelegramUpdate.name);

  constructor(
    private readonly settingService: SettingService,
    private readonly userService: UsersService,
  ) {}

  @Start()
  async startCommand(@Ctx() ctx: Context) {
    if (!ctx.message) {
      return;
    }

    const firstName = ctx.message.from.first_name || '';
    const lastName = ctx.message.from.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    const miniAppUrl = await this.settingService.getSetting(
      SettingKey.TELE_MINI_APP_URL,
      'https://t.me',
    );

    await ctx.reply(
      `👋 *Welcome, ${fullName}!*\n\nPlease tap the button below to play games.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🎲 Play now',
                web_app: { url: miniAppUrl },
              },
            ],
          ],
        },
      },
    );
  }
}
