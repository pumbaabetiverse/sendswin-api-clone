import { Injectable } from '@nestjs/common';
import { NotificationService } from '@/notification/notification.service';
import { TelegramService } from '@/telegram/telegram.service';
import { User } from '@/users/user.entity';
import { BlockchainNetwork } from '@/common/const';
import { ok, Result } from 'neverthrow';
import { getTransactionUrl } from '@/common/web3.client';

@Injectable()
export class WithdrawNotificationService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly telegramService: TelegramService,
  ) {}

  async sendUserWithdrawNotification(
    user: User,
    payout: number,
    txHash: string,
    network: BlockchainNetwork = BlockchainNetwork.OPBNB,
  ) {
    if (user.chatId) {
      await this.sendWithdrawalSuccessMessage(
        Number(user.chatId),
        payout,
        txHash,
        network,
      );
    }
    this.sendAppNotification(user, payout, txHash, network);
  }

  private async sendWithdrawalSuccessMessage(
    chatId: number,
    payout: number,
    transactionHash: string,
    network: string,
  ): Promise<Result<void, Error>> {
    await this.telegramService.pushSendMessageQueue(
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
    return ok();
  }

  private sendAppNotification(
    user: User,
    payout: number,
    txHash: string,
    network: BlockchainNetwork = BlockchainNetwork.OPBNB,
  ): void {
    this.notificationService.sendNotification(user.id, {
      type: 'new_withdraw',
      data: {
        payout,
        txHash,
        network,
      },
    });
  }
}
