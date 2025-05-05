// src/telegram/telegram.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { SettingService } from '@/setting/setting.service';
import { DepositOption, DepositResult } from '@/deposits/deposit.entity';
import { SettingKey } from '@/common/const';
import { getTransactionUrl } from '@/common/web3.client';
import { TelegramNewGameEvent } from '@/telegram/telegram.dto';
import { Result } from 'neverthrow';
import { Message } from 'telegraf/typings/core/types/typegram';
import { fromPromiseResult } from '@/common/errors';

@Injectable()
export class TelegramService {
  private logger = new Logger(TelegramService.name);

  constructor(
    @InjectBot() private bot: Telegraf,
    private settingService: SettingService,
  ) {}

  async sendNewGameResultMessage(
    payload: TelegramNewGameEvent,
  ): Promise<Result<Message.TextMessage, Error>> {
    let optionDisplay = '';

    if (payload.option == DepositOption.EVEN) {
      optionDisplay = '🟢🟢 EVEN';
    } else if (payload.option == DepositOption.ODD) {
      optionDisplay = '🔴 ODD';
    } else if (payload.option == DepositOption.LUCKY_NUMBER) {
      optionDisplay = '🍀 GOLDEN 7';
    }

    // Format the result for better readability
    let resultDisplay: string;
    switch (payload.result) {
      case DepositResult.WIN:
        resultDisplay = '✅ WIN';
        break;
      case DepositResult.LOSE:
        resultDisplay = '❌ LOSE';
        break;
      default:
        resultDisplay = '⚠️ VOID';
        break;
    }

    // Create a message with all required deposit information
    const message = `
  🎮 *New Game Result*

  🔢 Order ID: \`${payload.orderId}\`
  🎲 Your choice: ${optionDisplay}
  💰 Amount: ${payload.amount} USDT
  🏆 Result: ${resultDisplay}
  `;

    // Add an extra message for winners
    const extra =
      payload.result === DepositResult.WIN
        ? `\n🎉 Congratulations! Your payout of ${payload.payout} USDT will be processed shortly.\n\n⚠️ *Important*: If you do not receive your payout within 5 minutes, please contact our customer support.`
        : '\n❗ Oops! You didn’t win this round. Better luck next time.\n\n⚠️ *Reminder*: Play smart, play responsibly. If you have any issues, feel free to contact our customer support.';

    const supportUrl = await this.settingService.getSetting(
      SettingKey.TELE_CUSTOMER_SUPPORT_URL,
      'https://t.me',
    );

    // Send the notification to the user
    return await this.sendMessage(Number(payload.userChatId), message + extra, {
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
  }

  async sendWithdrawalSuccessMessage(
    chatId: number,
    payout: number,
    transactionHash: string,
    network: string,
  ): Promise<Result<Message.TextMessage, Error>> {
    return await this.sendMessage(
      chatId,
      `✅ *Withdrawal Successful!*\n\n` +
        `💰 Amount: *${payout} USDT*\n` +
        `🔗 Transaction Hash: \`${transactionHash}\`\n\n` +
        `⏱ Your transaction is being processed and may take a few minutes to be confirmed on the blockchain.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🔍 View on OpBNB Scan',
                url: getTransactionUrl(network, transactionHash),
              },
            ],
          ],
        },
      },
    );
  }

  private async sendMessage(
    chatId: number,
    message: string,
    extra: ExtraReplyMessage = {},
  ): Promise<Result<Message.TextMessage, Error>> {
    return fromPromiseResult(
      this.bot.telegram.sendMessage(chatId, message, extra),
      'Error send message',
    );
  }
}
