import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WithdrawService } from '@/withdraw/withdraw.service';
import { WalletWithdraw } from '@/withdraw/wallet-withdraw.entity';

@Injectable()
export class AdminWalletWithdrawService extends TypeOrmCrudService<WalletWithdraw> {
  private readonly logger = new Logger(AdminWalletWithdrawService.name);

  constructor(
    @InjectRepository(WalletWithdraw)
    readonly repository: Repository<WalletWithdraw>,
    private readonly withdrawService: WithdrawService,
  ) {
    super(repository);
  }

  @Cron(CronExpression.EVERY_10_MINUTES, {
    waitForCompletion: true,
  })
  async syncAllBalances() {
    await this.withdrawService.syncWalletBalances();
  }
}
