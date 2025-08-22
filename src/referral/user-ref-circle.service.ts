import { InjectRepository } from '@nestjs/typeorm';
import { UserRefCircleEntity } from '@/referral/user-ref-circle.entity';
import { Injectable, Logger } from '@nestjs/common';
import { FindOptionsOrder, FindOptionsWhere, Repository } from 'typeorm';
import dayjs from 'dayjs';
import { UsersService } from '@/users/user.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WithdrawRequestQueueDto } from '@/withdraw/withdraw.dto';
import { SettingService } from '@/setting/setting.service';
import { SettingKey } from '@/common/const';
import {
  buildPaginateResponse,
  PaginationQuery,
  PaginationResponse,
} from '@/common/dto/pagination.dto';
import { composePagination } from '@/common/pagination';
import { DepositOption, DepositResult } from '@/deposits/deposit.entity';
import {
  createWithdrawSourceId,
  WithdrawType,
} from '@/withdraw/withdraw.domain';
import { err, ok, Result } from 'neverthrow';
import { fromPromiseResult } from '@/common/errors';
import { UserRefCircleEntityExt } from '@/referral/user-ref-circle.dto';

@Injectable()
export class UserRefCircleService {
  private readonly logger = new Logger(UserRefCircleService.name);

  constructor(
    @InjectRepository(UserRefCircleEntity)
    private readonly userRefCircleRepository: Repository<UserRefCircleEntity>,
    private readonly userService: UsersService,
    @InjectQueue('withdraw')
    private withdrawQueue: Queue<WithdrawRequestQueueDto>,
    private readonly settingService: SettingService,
  ) {}

  async calculateEarnAmountFromDeposit(
    amount: number,
    depositOption: DepositOption,
    depositResult: DepositResult,
  ): Promise<number> {
    if (
      depositOption == DepositOption.OVER ||
      depositOption == DepositOption.UNDER
    ) {
      return 0;
    }

    if (depositResult == DepositResult.VOID) {
      return 0;
    }

    let refMultiplier = 0;
    if (
      depositOption == DepositOption.ODD ||
      depositOption == DepositOption.EVEN
    ) {
      refMultiplier = await this.settingService.getFloatSetting(
        SettingKey.ODD_EVEN_REF_MULTIPLIER,
        0.01,
      );
    } else if (depositOption == DepositOption.LUCKY_NUMBER) {
      refMultiplier = await this.settingService.getFloatSetting(
        SettingKey.LUCKY_NUMBER_REF_MULTIPLIER,
        0.3,
      );
    } else if (depositOption == DepositOption.LOTTERY_1) {
      refMultiplier = await this.settingService.getFloatSetting(
        SettingKey.LOTTERY_1_REF_MULTIPLIER,
        0.2,
      );
    } else if (depositOption == DepositOption.LOTTERY_2) {
      refMultiplier = await this.settingService.getFloatSetting(
        SettingKey.LOTTERY_2_REF_MULTIPLIER,
        0.2,
      );
    } else if (depositOption == DepositOption.LOTTERY_3) {
      refMultiplier = await this.settingService.getFloatSetting(
        SettingKey.LOTTERY_3_REF_MULTIPLIER,
        0.2,
      );
    } else if (
      depositOption == DepositOption.OVER ||
      depositOption == DepositOption.UNDER
    ) {
      refMultiplier = await this.settingService.getFloatSetting(
        SettingKey.OVER_UNDER_REF_MULTIPLIER,
        0.01,
      );
    }
    return amount * refMultiplier;
  }

  async addCircleContribution(
    userId: number,
    parentId: number,
    amount: number,
    createdAt: Date,
  ): Promise<Result<void, Error>> {
    const circleId = this.generateCircleId(createdAt);
    const parentUser = (await this.userService.findById(parentId)).unwrapOr(
      null,
    );
    if (!parentUser) {
      return err(new Error('Parent user not found'));
    }
    await this.createOrUpdateUserCircle(circleId, userId, parentId, amount, 0);
    await this.createOrUpdateUserCircle(
      circleId,
      parentId,
      parentUser.parentId,
      0,
      amount,
    );

    return ok();
  }

  async userRefCirclePagination(
    options:
      | FindOptionsWhere<UserRefCircleEntity>
      | FindOptionsWhere<UserRefCircleEntity>[],
    pagination: PaginationQuery,
    order: FindOptionsOrder<UserRefCircleEntity>,
  ): Promise<Result<PaginationResponse<UserRefCircleEntityExt>, Error>> {
    const { limit, skip, page } = composePagination(pagination);
    const result = await fromPromiseResult(
      this.userRefCircleRepository.findAndCount({
        where: options,
        order,
        skip,
        take: limit,
      }),
    );
    if (result.isErr()) {
      return err(result.error);
    }
    const [items, total] = result.value;

    // Fetch telegramFullName for each user
    const itemsWithTelegramFullName = await Promise.all(
      items.map(async (item) => {
        const result = await this.userService.getTelegramFullNameCached(
          item.userId,
        );
        if (result.isOk() && result.value) {
          return {
            ...item,
            telegramFullName: result.value,
          };
        }
        return item;
      }),
    );

    return ok(
      buildPaginateResponse(itemsWithTelegramFullName, total, page, limit),
    );
  }

  async withdrawCircle(
    userId: number,
    circleId: number,
  ): Promise<Result<void, Error>> {
    const currentCircleId = this.generateCircleId();

    if (circleId >= currentCircleId) {
      return err(new Error('Cannot withdraw from current or future circles'));
    }

    const userRefCircle = await this.userRefCircleRepository.findOne({
      where: { userId, circleId },
    });

    if (!userRefCircle) {
      return err(new Error('User ref circle not found'));
    }

    if (userRefCircle.isWithdrawn) {
      return err(new Error('User ref circle is already withdrawn'));
    }

    const minimumWithdraw = await this.settingService.getFloatSetting(
      SettingKey.MINIMUM_REF_WITHDRAW_AMOUNT,
      0.1,
    );

    if (userRefCircle.earnFromChild < minimumWithdraw) {
      return err(
        Error('Withdraw amount must be greater than ' + minimumWithdraw),
      );
    }

    userRefCircle.isWithdrawn = true;
    await this.userRefCircleRepository.save(userRefCircle);

    await this.withdrawQueue.add('withdraw-ref', {
      userId,
      payout: userRefCircle.earnFromChild,
      sourceId: createWithdrawSourceId(WithdrawType.REFERRAL, userRefCircle.id),
    });
    return ok();
  }

  async getAggregateUserRef(userId: number): Promise<
    Result<
      {
        childCount: number;
        totalEarned: number;
      },
      Error
    >
  > {
    const [childCountResult, totalEarnedResult] = await Promise.all([
      this.userService.countUserChild(userId),
      this.getTotalEarnedFromChild(userId),
    ]);

    if (childCountResult.isErr()) {
      return err(childCountResult.error);
    }

    if (totalEarnedResult.isErr()) {
      return err(totalEarnedResult.error);
    }

    return ok({
      childCount: childCountResult.value,
      totalEarned: totalEarnedResult.value,
    });
  }

  private async createOrUpdateUserCircle(
    circleId: number,
    userId: number,
    parentId: number | undefined,
    contributeToParent: number,
    earnFromChild: number,
  ): Promise<Result<UserRefCircleEntity, Error>> {
    const userRefCircleResult = await fromPromiseResult(
      this.userRefCircleRepository.findOne({
        where: { circleId, userId },
      }),
    );

    if (userRefCircleResult.isErr()) {
      return err(userRefCircleResult.error);
    }

    const userRefCircle = userRefCircleResult.value;

    if (userRefCircle) {
      userRefCircle.contributeToParent += contributeToParent;
      userRefCircle.earnFromChild += earnFromChild;
      return fromPromiseResult(
        this.userRefCircleRepository.save(userRefCircle),
      );
    }

    return fromPromiseResult(
      this.userRefCircleRepository.save(
        this.userRefCircleRepository.create({
          circleId,
          userId,
          parentId,
          contributeToParent,
          earnFromChild,
          isWithdrawn: false,
        }),
      ),
    );
  }

  private generateCircleId(date: Date = new Date()): number {
    const year = dayjs(date).year();
    const weekNumber = dayjs(date).week();

    return year * 54 + weekNumber;
  }

  private getCircleInfo(circleId: number): { year: number; week: number } {
    const year = Math.floor(circleId / 54);
    const week = circleId % 54;

    return { year, week };
  }

  private async getTotalEarnedFromChild(
    userId: number,
  ): Promise<Result<number, Error>> {
    return fromPromiseResult(
      this.userRefCircleRepository.sum('earnFromChild', {
        userId,
      }),
    ).map((value) => value ?? 0);
  }
}
