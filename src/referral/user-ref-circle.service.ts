import { InjectRepository } from '@nestjs/typeorm';
import { UserRefCircleEntity } from '@/referral/user-ref-circle.entity';
import { Injectable, Logger } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import dayjs from 'dayjs';
import { UsersService } from '@/users/user.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WithdrawRequestQueueDto } from '@/withdraw/withdraw.dto';
import { SettingService } from '@/setting/setting.service';
import { SettingKey } from '@/common/const';

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

  async addCircleContribution(
    userId: number,
    parentId: number,
    amount: number,
    createdAt: Date,
  ) {
    try {
      const circleId = this.generateCircleId(createdAt);
      const userRefCircle = await this.userRefCircleRepository.findOne({
        where: { userId, circleId },
      });

      if (!userRefCircle) {
        await this.userRefCircleRepository.insert(
          this.userRefCircleRepository.create({
            circleId,
            userId,
            parentId,
            contributeToParent: amount,
            earnFromChild: 0,
            isWithdrawn: false,
          }),
        );
      } else {
        userRefCircle.contributeToParent += amount;
        await this.userRefCircleRepository.save(userRefCircle);
      }

      const parentRefCircle = await this.userRefCircleRepository.findOne({
        where: { userId: parentId, circleId },
      });

      if (!parentRefCircle) {
        const parentUser = await this.userService.findById(parentId);
        if (!parentUser) {
          return;
        }
        await this.userRefCircleRepository.insert(
          this.userRefCircleRepository.create({
            circleId,
            userId: parentId,
            parentId: parentUser.parentId,
            isWithdrawn: false,
            contributeToParent: 0,
            earnFromChild: amount,
          }),
        );
      } else {
        parentRefCircle.earnFromChild += amount;
        await this.userRefCircleRepository.save(parentRefCircle);
      }
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error(err.message, err.stack);
      }
    }
  }

  async getUserRefCircleAndChildren(userId: number, circleIds: number[]) {
    const userRefCircles = await this.userRefCircleRepository.findBy({
      userId,
      circleId: In(circleIds),
    });

    const childRefCircles = await this.userRefCircleRepository.findBy({
      parentId: userId,
      circleId: In(circleIds),
    });

    return {
      userRefCircles,
      childRefCircles,
    };
  }

  async withdrawCircle(userId: number, circleId: number) {
    const currentCircleId = this.generateCircleId();

    if (circleId >= currentCircleId) {
      throw new Error('Cannot withdraw from current or future circles');
    }

    const userRefCircle = await this.userRefCircleRepository.findOne({
      where: { userId, circleId },
    });

    if (!userRefCircle) {
      throw new Error('User ref circle not found');
    }

    if (userRefCircle.isWithdrawn) {
      throw new Error('User ref circle is already withdrawn');
    }

    const minimumWithdraw = await this.settingService.getFloatSetting(
      SettingKey.MINIMUM_REF_WITHDRAW_AMOUNT,
      0.1,
    );

    if (userRefCircle.earnFromChild < minimumWithdraw) {
      throw new Error(
        'Withdraw amount must be greater than ' + minimumWithdraw,
      );
    }

    userRefCircle.isWithdrawn = true;
    await this.userRefCircleRepository.save(userRefCircle);

    await this.withdrawQueue.add('withdraw-ref', {
      userId,
      payout: userRefCircle.earnFromChild,
      userRefCircleId: userRefCircle.id,
    });
  }

  generateCircleId(date: Date = new Date()): number {
    const year = dayjs(date).year();
    const weekNumber = dayjs(date).week();

    return year * 54 + weekNumber;
  }

  getCircleInfo(circleId: number): { year: number; week: number } {
    const year = Math.floor(circleId / 54);
    const week = circleId % 54;

    return { year, week };
  }
}
