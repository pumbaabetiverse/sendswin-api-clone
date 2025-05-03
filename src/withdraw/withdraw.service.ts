import { BlockchainHelperService } from '@/blockchain/blockchain-helper.service';
import { BlockchainNetwork, BlockchainToken } from '@/common/const';
import { UsersService } from '@/users/user.service';
import { WalletWithdraw } from '@/withdraw/wallet-withdraw.entity';
import {
  Withdraw,
  WithdrawStatus,
  WithdrawType,
} from '@/withdraw/withdraw.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { err, ok, Result } from 'neverthrow';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventName } from '@/common/event-name';
import { TelegramWithdrawProcessingEvent } from '@/telegram/telegram.dto';
import { User } from '@/users/user.entity';
import { toErr } from '@/common/errors';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class WithdrawService {
  constructor(
    @InjectRepository(Withdraw)
    private withdrawRepository: Repository<Withdraw>,
    @InjectRepository(WalletWithdraw)
    private walletWithdrawRepository: Repository<WalletWithdraw>,
    private usersService: UsersService,
    private readonly blockchainHelperService: BlockchainHelperService,
    private eventEmitter: EventEmitter2,
  ) {}

  async processUserWithdraw(
    userId: number,
    payout: number,
    sourceId: string,
  ): Promise<Result<void, Error>> {
    // Validate user and check for duplicate withdrawals
    const validationResult = await this.validateWithdrawRequest(
      userId,
      sourceId,
    );
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }
    const user = validationResult.value;

    // Select and update wallet balance
    const walletResult =
      await this.selectAppropriateWalletAndUpdateBalance(payout);
    if (walletResult.isErr()) {
      return err(walletResult.error);
    }
    const wallet = walletResult.value;

    // Create and insert a new withdrawal record
    const insertResult = await this.insertNewWithdraw(
      this.withdrawRepository.create({
        userId,
        payout,
        currency: BlockchainToken.USDT,
        walletAddress: user.walletAddress!,
        sourceId,
        type: this.getWithdrawTypeFromSourceId(sourceId),
        status: WithdrawStatus.PENDING,
        fromWalletId: wallet.id,
        network: BlockchainNetwork.OPBNB,
      }),
    );
    if (insertResult.isErr()) {
      return err(insertResult.error);
    }

    // Process the blockchain transaction
    return await this.processOnChainTransaction(wallet, user, payout, sourceId);
  }

  async syncWalletBalances(): Promise<Result<void, Error>> {
    try {
      const wallets = await this.walletWithdrawRepository.find({});
      for (const wallet of wallets) {
        const usdtBalanceResult =
          await this.blockchainHelperService.getTokenBalance(
            wallet.address,
            BlockchainToken.USDT,
            BlockchainNetwork.OPBNB,
          );

        if (usdtBalanceResult.isOk()) {
          wallet.balanceUsdtOpBnb = usdtBalanceResult.value;
        }
      }
      await this.walletWithdrawRepository.save(wallets);
      return ok();
    } catch (error) {
      return toErr(error, 'Unknown error in sync wallet balances');
    }
  }

  private async validateWithdrawRequest(
    userId: number,
    sourceId: string,
  ): Promise<Result<User, Error>> {
    const user = await this.usersService.findById(userId);
    if (!user?.walletAddress) {
      return err(new Error('User does not have a wallet address'));
    }

    const existingWithdraw = await this.withdrawRepository.findOneBy({
      sourceId,
    });
    if (existingWithdraw) {
      return err(new Error('Withdraw already processed'));
    }

    return ok(user);
  }

  private async processOnChainTransaction(
    wallet: WalletWithdraw,
    user: User,
    payout: number,
    sourceId: string,
  ): Promise<Result<void, Error>> {
    // Transfer tokens on blockchain
    const txHashResult = await this.blockchainHelperService.transferToken(
      wallet.privateKey,
      user.walletAddress!,
      BlockchainToken.USDT,
      BlockchainNetwork.OPBNB,
      payout,
    );
    if (txHashResult.isErr()) {
      await this.updateWithdrawBySourceId(sourceId, {
        status: WithdrawStatus.FAIL,
      });
      return err(txHashResult.error);
    }

    const transactionHash = txHashResult.value;

    await this.updateWithdrawBySourceId(sourceId, {
      transactionHash,
      status: WithdrawStatus.PROCESSING,
    });

    // Notify the user via Telegram if possible
    this.notifyUserViaTelegram(user, payout, transactionHash);

    // Get transaction receipt
    const receiptResult =
      await this.blockchainHelperService.getTransactionReceipt(
        transactionHash,
        BlockchainNetwork.OPBNB,
      );

    if (receiptResult.isErr()) {
      await this.updateWithdrawBySourceId(sourceId, {
        status: WithdrawStatus.FAIL,
      });
      return err(receiptResult.error);
    }

    // Update status to success
    await this.updateWithdrawBySourceId(sourceId, {
      status: WithdrawStatus.SUCCESS,
      onChainFee: receiptResult.value.gasUsed.toString(),
    });

    return ok();
  }

  private notifyUserViaTelegram(
    user: User,
    payout: number,
    txHash: string,
  ): void {
    if (user.chatId) {
      this.eventEmitter.emit(EventName.TELEGRAM_WITHDRAW_PROCESSING, {
        userChatId: user.chatId,
        payout,
        txHash,
        network: BlockchainNetwork.OPBNB,
      } satisfies TelegramWithdrawProcessingEvent);
    }
  }

  private async updateWithdrawBySourceId(
    sourceId: string,
    data: QueryDeepPartialEntity<Withdraw>,
  ): Promise<Result<void, Error>> {
    try {
      await this.withdrawRepository.update({ sourceId }, data);
      return ok();
    } catch (error) {
      return toErr(error, 'Unknown error when update withdraw tx hash');
    }
  }

  private async insertNewWithdraw(
    withdraw: Withdraw,
  ): Promise<Result<void, Error>> {
    try {
      await this.withdrawRepository.insert(withdraw);
      return ok();
    } catch (error) {
      return toErr(error, 'Unknown error when insert new withdraw');
    }
  }

  private async selectAppropriateWalletAndUpdateBalance(
    payout: number,
  ): Promise<Result<WalletWithdraw, Error>> {
    try {
      const wallet = await this.findWalletWithSufficientBalance(payout);
      if (!wallet) {
        return err(new Error('No wallet found'));
      }

      return ok(await this.updateWalletBalance(wallet, payout));
    } catch (error) {
      return toErr(error, 'Unknown error when select wallet');
    }
  }

  private async findWalletWithSufficientBalance(
    payout: number,
  ): Promise<WalletWithdraw | null> {
    return await this.walletWithdrawRepository.findOne({
      select: ['id', 'address', 'privateKey', 'lastUsedAt', 'balanceUsdtOpBnb'],
      where: {
        balanceUsdtOpBnb: MoreThanOrEqual(payout),
      },
      order: {
        lastUsedAt: 'ASC',
      },
    });
  }

  private async updateWalletBalance(
    wallet: WalletWithdraw,
    payout: number,
  ): Promise<WalletWithdraw> {
    wallet.lastUsedAt = new Date();
    wallet.balanceUsdtOpBnb -= payout;
    return await this.walletWithdrawRepository.save(wallet);
  }

  private getWithdrawTypeFromSourceId(sourceId: string): WithdrawType {
    if (sourceId.startsWith(WithdrawType.GAME)) {
      return WithdrawType.GAME;
    }
    if (sourceId.startsWith(WithdrawType.REFERRAL)) {
      return WithdrawType.REFERRAL;
    }
    return WithdrawType.OTHER;
  }
}
