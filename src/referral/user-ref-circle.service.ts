import { InjectRepository } from '@nestjs/typeorm';
import { UserRefCircleEntity } from '@/referral/user-ref-circle.entity';
import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import dayjs from 'dayjs';
import { UsersService } from '@/users/user.service';

@Injectable()
export class UserRefCircleService {
  private readonly logger = new Logger(UserRefCircleService.name);

  constructor(
    @InjectRepository(UserRefCircleEntity)
    private readonly userRefCircleRepository: Repository<UserRefCircleEntity>,
    private readonly userService: UsersService,
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
