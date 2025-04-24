import { BlockchainHelperService } from '@/blockchain/blockchain-helper.service';
import { BlockchainNetwork, BlockchainToken } from '@/common/const';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletWithdraw } from '../wallet-withdraw.entity';

@Injectable()
export class AdminWalletWithdrawService extends TypeOrmCrudService<WalletWithdraw> {
  private readonly logger = new Logger(AdminWalletWithdrawService.name);
  constructor(
    @InjectRepository(WalletWithdraw)
    readonly repository: Repository<WalletWithdraw>,
    private readonly blockchainHelperService: BlockchainHelperService,
  ) {
    super(repository);
  }

  @Cron(CronExpression.EVERY_10_MINUTES, {
    waitForCompletion: true,
  })
  async syncAllBalances() {
    const items = await this.repository.find({});
    if (!items.length) return;
    return Promise.allSettled(items.map((v) => this.#syncBalance(v)));
  }

  async #syncBalance(wallet: WalletWithdraw) {
    try {
      const balance = await this.blockchainHelperService.getTokenBalance(
        wallet.address,
        BlockchainToken.USDT,
        BlockchainNetwork.OPBNB,
      );
      if (typeof balance === 'number') {
        await this.repository.update(
          {
            id: wallet.id,
          },
          {
            balanceUsdtOpBnb: balance,
          },
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }
}
