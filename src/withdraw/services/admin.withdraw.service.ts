import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdraw } from '../withdraw.entity';
import { WithdrawService } from '@/withdraw/withdraw.service';
import {
  createWithdrawSourceId,
  WithdrawType,
} from '@/withdraw/withdraw.domain';
import { err, Result } from 'neverthrow';
import { SettingKey } from '@/common/const';
import { SettingService } from '@/setting/setting.service';

@Injectable()
export class AdminWithdrawService extends TypeOrmCrudService<Withdraw> {
  constructor(
    @InjectRepository(Withdraw)
    private readonly repository: Repository<Withdraw>,
    private readonly withdrawService: WithdrawService,
    private readonly settingService: SettingService,
  ) {
    super(repository);
  }

  async refundUser(
    userId: number,
    payout: number,
    txId: string,
  ): Promise<Result<void, Error>> {
    return await this.withdrawService.processUserWithdraw(
      userId,
      payout,
      createWithdrawSourceId(WithdrawType.REFUND, txId),
    );
  }

  async directWithdrawFromPool(
    toAddress: string,
    payout: number,
    fromWalletId: number,
  ): Promise<Result<string, Error>> {
    const whiteList = (
      await this.settingService.getSetting(
        SettingKey.WHITELIST_WALLET_WITHDRAW,
        '',
      )
    )
      .split(',')
      .map((w) => w.toLowerCase());

    if (!whiteList.includes(toAddress.toLowerCase())) {
      return err(new Error('Wallet address is not in whitelist'));
    }

    return await this.withdrawService.processDirectWithdraw(
      toAddress,
      payout,
      fromWalletId,
    );
  }
}
