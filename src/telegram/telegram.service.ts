// src/telegram/telegram.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { SettingService } from '@/setting/setting.service';
import {
  Deposit,
  DepositOption,
  DepositResult,
} from '@/deposits/deposit.entity';
import { SettingKey } from '@/common/const';
import { getTransactionUrl } from '@/common/web3.client';

@Injectable()
export class TelegramService {
  private logger = new Logger(TelegramService.name);

  constructor(
    @InjectBot() private bot: Telegraf,
    private settingService: SettingService,
  ) {}

  async sendMessage(
    chatId: number,
    message: string,
    extra: ExtraReplyMessage = {},
  ): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, message, extra);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in sendMessage: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async sendNewGameResultMessage(
    chatId: number,
    deposit: Deposit,
  ): Promise<void> {
    try {
      let optionDisplay = 'Ⓞ ODD';

      if (deposit.option == DepositOption.UNDER) {
        optionDisplay = 'Ⓔ EVEN';
      } else if (deposit.option == DepositOption.LUCKY_NUMBER) {
        optionDisplay = '🍀 GOLDEN 7';
      }

      // Format the result for better readability
      let resultDisplay: string;
      switch (deposit.result) {
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

  🔢 Order ID: \`${deposit.orderId}\`
  🎲 Your choice: ${optionDisplay}
  💰 Amount: ${deposit.amount} USDT
  🏆 Result: ${resultDisplay}
  `;

      // Add an extra message for winners
      const extra =
        deposit.result === DepositResult.WIN
          ? `\n🎉 Congratulations! Your payout of ${deposit.payout} USDT will be processed shortly.\n\n⚠️ *Important*: If you do not receive your payout within 5 minutes, please contact our customer support.`
          : '';

      const supportUrl = await this.settingService.getSetting(
        SettingKey.TELE_CUSTOMER_SUPPORT_URL,
        'https://t.me',
      );

      // Send the notification to the user
      await this.sendMessage(chatId, message + extra, {
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
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in sendNewGameResultMessage: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async sendWithdrawalSuccessMessage(
    chatId: number,
    payout: number,
    transactionHash: string,
    network: string,
  ): Promise<void> {
    try {
      await this.sendMessage(
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
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in sendWithdrawalSuccessMessage: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}
