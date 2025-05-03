import { BlockchainHelperService } from '@/blockchain/blockchain-helper.service';
import { BlockchainNetwork, BlockchainToken } from '@/common/const';
import { TelegramService } from '@/telegram/telegram.service';
import { UsersService } from '@/users/user.service';
import { WalletWithdraw } from '@/withdraw/wallet-withdraw.entity';
import { Withdraw, WithdrawStatus } from '@/withdraw/withdraw.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefWithdraw } from '@/withdraw/ref-withdraw.entity';

@Injectable()
export class WithdrawService {
  constructor(
    @InjectRepository(Withdraw)
    private withdrawRepository: Repository<Withdraw>,
    @InjectRepository(RefWithdraw)
    private refWithdrawRepository: Repository<RefWithdraw>,
    @InjectRepository(WalletWithdraw)
    private walletWithdrawRepository: Repository<WalletWithdraw>,
    private usersService: UsersService,
    private readonly blockchainHelperService: BlockchainHelperService,
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

    const sourceId = `deposit_${depositOrderId}`;

    if (await this.withdrawRepository.findOneBy({ sourceId })) {
      throw new Error('Withdraw already processed');
    }

    const wallets = await this.walletWithdrawRepository.find({
      select: ['id', 'address', 'privateKey', 'lastUsedAt'],
      order: {
        lastUsedAt: 'ASC',
      },
    });

    for (const wallet of wallets) {
      wallet.lastUsedAt = new Date();

      const usdtBalance = await this.blockchainHelperService.getTokenBalance(
        wallet.address,
        BlockchainToken.USDT,
        BlockchainNetwork.OPBNB,
      );
      if (usdtBalance) {
        wallet.balanceUsdtOpBnb = usdtBalance;
      }
      await this.walletWithdrawRepository.save(wallet);

      if (!usdtBalance || usdtBalance < payout) {
        continue;
      }

      const withdraw = await this.withdrawRepository.save(
        this.withdrawRepository.create({
          userId,
          payout,
          currency: BlockchainToken.USDT,
          walletAddress: user.walletAddress,
          sourceId,
          status: WithdrawStatus.PENDING,
          fromWalletId: wallet.id,
          network: BlockchainNetwork.OPBNB,
        }),
      );

      const receipt = await this.blockchainHelperService.transferToken(
        wallet.privateKey,
        user.walletAddress,
        BlockchainToken.USDT,
        BlockchainNetwork.OPBNB,
        payout,
      );

      if (receipt) {
        withdraw.onChainFee = receipt.gasUsed.toString();
        withdraw.transactionHash = receipt.transactionHash;
        withdraw.status = WithdrawStatus.SUCCESS;

        if (user.chatId) {
          await this.telegramService.sendWithdrawalSuccessMessage(
            Number(user.chatId),
            payout,
            receipt.transactionHash,
            BlockchainNetwork.OPBNB,
          );
        }
      } else {
        withdraw.status = WithdrawStatus.FAIL;
      }

      await this.withdrawRepository.save(withdraw);

      break;
    }
  }

  async processRefWithdrawOnChain(
    userId: number,
    payout: number,
    userRefCircleId: number,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user?.walletAddress) {
      throw new Error('User does not have a wallet address');
    }

    if (await this.refWithdrawRepository.findOneBy({ userRefCircleId })) {
      throw new Error('Withdraw already processed');
    }

    const wallets = await this.walletWithdrawRepository.find({
      select: ['id', 'address', 'privateKey', 'lastUsedAt'],
      order: {
        lastUsedAt: 'ASC',
      },
    });

    for (const wallet of wallets) {
      wallet.lastUsedAt = new Date();

      const usdtBalance = await this.blockchainHelperService.getTokenBalance(
        wallet.address,
        BlockchainToken.USDT,
        BlockchainNetwork.OPBNB,
      );
      if (usdtBalance) {
        wallet.balanceUsdtOpBnb = usdtBalance;
      }
      await this.walletWithdrawRepository.save(wallet);

      if (!usdtBalance || usdtBalance < payout) {
        continue;
      }

      const withdraw = await this.refWithdrawRepository.save(
        this.refWithdrawRepository.create({
          userId,
          payout,
          currency: BlockchainToken.USDT,
          walletAddress: user.walletAddress,
          userRefCircleId,
          status: WithdrawStatus.PENDING,
          fromWalletId: wallet.id,
          network: BlockchainNetwork.OPBNB,
        }),
      );

      const receipt = await this.blockchainHelperService.transferToken(
        wallet.privateKey,
        user.walletAddress,
        BlockchainToken.USDT,
        BlockchainNetwork.OPBNB,
        payout,
      );

      if (receipt) {
        withdraw.onChainFee = receipt.gasUsed.toString();
        withdraw.transactionHash = receipt.transactionHash;
        withdraw.status = WithdrawStatus.SUCCESS;

        if (user.chatId) {
          await this.telegramService.sendWithdrawalSuccessMessage(
            Number(user.chatId),
            payout,
            receipt.transactionHash,
            BlockchainNetwork.OPBNB,
          );
        }
      } else {
        withdraw.status = WithdrawStatus.FAIL;
      }

      await this.refWithdrawRepository.save(withdraw);

      break;
    }
  }

  async syncWalletBalances(): Promise<void> {
    const wallets = await this.walletWithdrawRepository.find({});
    for (const wallet of wallets) {
      const usdtBalance = await this.blockchainHelperService.getTokenBalance(
        wallet.address,
        BlockchainToken.USDT,
        BlockchainNetwork.OPBNB,
      );
      if (usdtBalance) {
        wallet.balanceUsdtOpBnb = usdtBalance;
      }
    }
    await this.walletWithdrawRepository.save(wallets);
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
