import { Injectable } from '@nestjs/common';
import {
  Deposit,
  DepositOption,
  DepositResult,
} from '@/deposits/deposit.entity';
import { ok, Result } from 'neverthrow';
import { SettingKey } from '@/common/const';
import { SettingService } from '@/setting/setting.service';
import { TelegramService } from '@/telegram/telegram.service';
import { User } from '@/users/user.entity';
import { NotificationService } from '@/notification/notification.service';

@Injectable()
export class DepositNotificationService {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly settingService: SettingService,
    private readonly notificationService: NotificationService,
  ) {}

  async sendNewGameNotification(user: User, deposit: Deposit) {
    if (user.chatId) {
      await this.sendNewGameResult(
        Number(user.chatId),
        deposit.orderId,
        deposit.option!,
        deposit.result,
        '',
        deposit.amount,
        deposit.payout,
      );
    }
    this.sendAppNotification(user, deposit);
  }

  private sendAppNotification(user: User, deposit: Deposit): void {
    this.notificationService.sendNotification(user.id, {
      type: 'new_game',
      data: {
        orderId: deposit.orderId,
        result: deposit.result,
        amount: deposit.amount,
        payout: deposit.payout,
        option: deposit.option!,
      },
    });
  }

  private async sendNewGameResult(
    chatId: number,
    orderId: string,
    option: DepositOption,
    result: DepositResult,
    reason: string,
    amount: number,
    payout: number,
  ): Promise<Result<void, Error>> {
    let optionDisplay = '';

    if (option == DepositOption.EVEN) {
      optionDisplay = '🟢🟢 EVEN';
    } else if (option == DepositOption.ODD) {
      optionDisplay = '🔴 ODD';
    } else if (option == DepositOption.LUCKY_NUMBER) {
      optionDisplay = '🍀 GOLDEN 7';
    } else if (option == DepositOption.LOTTERY_1) {
      optionDisplay = '🍀 LOTTERY 1';
    } else if (option == DepositOption.LOTTERY_2) {
      optionDisplay = '🍀 LOTTERY 2';
    } else if (option == DepositOption.LOTTERY_3) {
      optionDisplay = '🍀 LOTTERY 3';
    } else if (option == DepositOption.OVER) {
      optionDisplay = '⬆️ BIG';
    } else if (option == DepositOption.UNDER) {
      optionDisplay = '⬇️ SMALL';
    }

    // Format the result for better readability
    let resultDisplay: string;
    switch (result) {
      case DepositResult.WIN:
        resultDisplay = '✅ WIN';
        break;
      case DepositResult.LOSE:
        resultDisplay = '❌ LOSE';
        break;
      default:
        resultDisplay = '⚠️ INVALID';
        break;
    }
    // Create a message with all required deposit information
    const message = `
  🎮 *New Game Result*

  🔢 Order ID: \`${orderId}\`
  🎲 Your choice: ${optionDisplay}
  💰 Amount: ${amount} USDT
  🏆 Result: ${resultDisplay}
  `;

    // Add an extra message for winners
    const extra =
      result === DepositResult.WIN
        ? `\n🎉 Congratulations! Your payout of ${payout} USDT will be processed shortly.\n\n⚠️ *Important*: If you do not receive your payout within 5 minutes, please contact our customer support.`
        : '\n❗ Oops! You didn’t win this round. Better luck next time.\n\n⚠️ *Reminder*: Play smart, play responsibly. If you have any issues, feel free to contact our customer support.';

    const supportUrl = await this.settingService.getSetting(
      SettingKey.TELE_CUSTOMER_SUPPORT_URL,
      'https://t.me',
    );

    await this.telegramService.pushSendMessageQueue(chatId, message + extra, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🧑‍💼 Customer Support',
              url: supportUrl, // Replace it with your actual support contact
            },
          ],
        ],
      },
      parse_mode: 'Markdown',
    });
    return ok();
  }
}
