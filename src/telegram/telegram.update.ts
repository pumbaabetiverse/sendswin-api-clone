import { Ctx, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Injectable, Logger } from '@nestjs/common';
import { SettingService } from '@/setting/setting.service';
import { SettingKey } from '@/common/const';

@Update()
@Injectable()
export class TelegramUpdate {
  private logger = new Logger(TelegramUpdate.name);

  constructor(private settingService: SettingService) {}

  @Start()
  async startCommand(@Ctx() ctx: Context) {
    try {
      const miniAppUrl = await this.settingService.getSetting(
        SettingKey.TELE_MINI_APP_URL,
        'https://t.me',
      );

      await ctx.reply(
        `*Let's get started 🎲*\n\nPlease tap the button below to play games.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Play now',
                  web_app: { url: miniAppUrl },
                },
              ],
            ],
          },
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in startCommand: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}
