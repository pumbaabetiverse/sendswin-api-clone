import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '@/users/user.service';
import { Withdraw, WithdrawStatus } from '@/withdraw/withdraw.entity';
import { BlockchainService } from '@/blockchain/blockchain.service';
import { WalletWithdraw } from '@/withdraw/wallet-withdraw.entity';
import { BlockchainNetwork, BlockchainToken } from '@/common/const';
import { TelegramService } from '@/telegram/telegram.service';

@Injectable()
export class WithdrawService {
  constructor(
    @InjectRepository(Withdraw)
    private withdrawRepository: Repository<Withdraw>,
    @InjectRepository(WalletWithdraw)
    private walletWithdrawRepository: Repository<WalletWithdraw>,
    private usersService: UsersService,
    private blockchainService: BlockchainService,
    private telegramService: TelegramService,
  ) {}

  async processWithdrawOnChain(
    userId: number,
    payout: number,
    depositOrderId: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user?.walletAddress) {
      throw new Error('User does not have a wallet address');
    }

    if (await this.withdrawRepository.findOneBy({ depositOrderId })) {
      throw new Error('Withdraw already processed');
    }

    const wallets = await this.walletWithdrawRepository.find({
      order: {
        lastUsedAt: 'ASC',
      },
    });

    for (const wallet of wallets) {
      wallet.lastUsedAt = new Date();
      await this.walletWithdrawRepository.save(wallet);

      const usdtBalance = await this.blockchainService.getTokenBalance(
        wallet.address,
        BlockchainToken.USDT,
        BlockchainNetwork.opBNB,
      );

      if (usdtBalance < payout) {
        continue;
      }

      const withdraw = await this.withdrawRepository.save(
        this.withdrawRepository.create({
          userId,
          payout,
          currency: BlockchainToken.USDT,
          walletAddress: user.walletAddress,
          depositOrderId,
          status: WithdrawStatus.PENDING,
          fromWalletId: wallet.id,
          network: BlockchainNetwork.opBNB,
        }),
      );

      const receipt = await this.blockchainService.transferToken(
        wallet.privateKey,
        user.walletAddress,
        BlockchainToken.USDT,
        BlockchainNetwork.opBNB,
        payout,
      );

      if (receipt) {
        withdraw.onChainFee = receipt.gasUsed.toString();
        withdraw.transactionHash = receipt.hash;
        withdraw.status = WithdrawStatus.SUCCESS;

        if (user.chatId) {
          const scanUrl = `https://opbnbscan.com`;
          await this.telegramService.sendMessage(
            Number(user.chatId),
            `✅ *Withdrawal Successful!*\n\n` +
              `💰 Amount: *${payout} USDT*\n` +
              `🔗 Transaction Hash: \`${receipt.hash}\`\n\n` +
              `⏱ Your transaction is being processed and may take a few minutes to be confirmed on the blockchain.`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🔍 View on OpBNB Scan',
                      url: `${scanUrl}/tx/${receipt.hash}`,
                    },
                  ],
                ],
              },
            },
          );
        }
      } else {
        withdraw.status = WithdrawStatus.FAIL;
      }

      await this.withdrawRepository.save(withdraw);

      break;
    }
  }

  // async processWithdrawBinance(userId: number, payout: number, depositOrderId: string): Promise<void> {
  //   const user = await this.usersService.findById(userId);
  //   if (!user?.walletAddress) {
  //     throw new Error(
  //       'User does not have a wallet address',
  //     );
  //   }
  //
  //   if (await this.withdrawRepository.findOneBy({ depositOrderId })) {
  //     throw new Error(
  //       'Withdraw already processed',
  //     );
  //   }
  //
  //   const withdraw = await this.withdrawRepository.save(this.withdrawRepository.create({
  //     userId,
  //     payout: payout.toString(),
  //     currency: 'USDT',
  //     walletAddress: user.walletAddress,
  //     depositOrderId,
  //     status: WithdrawStatus.PENDING,
  //   }));
  //
  //   try {
  //     const res = await this.binanceClient.withdraw('USDT', user.walletAddress, 'BSC', payout);
  //     console.log(res);
  //     await this.withdrawRepository.update(withdraw.id, {
  //       status: WithdrawStatus.SUCCESS,
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     await this.withdrawRepository.update(withdraw.id, {
  //       status: WithdrawStatus.FAIL,
  //     });
  //   }
  // }
}
