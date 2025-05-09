import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';

import { AdminCrud } from '@/common/decorators/common.decorator';
import { Crud, CrudController } from '@dataui/crud';
import { ActionResponse } from '@/common/dto/base.dto';
import { Withdraw } from '@/withdraw/withdraw.entity';
import { AdminWithdrawService } from '@/withdraw/services/admin.withdraw.service';
import {
  DirectWithdrawRequestDto,
  RefundRequestDto,
} from '@/withdraw/dto/refund.dto';
import { TelegramAdminService } from '@/telegram-admin/telegram-admin.service';

@Crud({
  model: {
    type: Withdraw,
  },
  routes: {
    only: ['getOneBase', 'getManyBase', 'updateOneBase'],
  },
  validation: {
    transform: true,
  },
})
@Controller('admin/withdraw')
@AdminCrud()
export class AdminWithdrawController implements CrudController<Withdraw> {
  private readonly logger = new Logger(AdminWithdrawController.name);

  constructor(
    public service: AdminWithdrawService,
    private readonly telegramAdminService: TelegramAdminService,
  ) {}

  @Post('actions/refund')
  @HttpCode(HttpStatus.OK)
  async refund(@Body() body: RefundRequestDto): Promise<ActionResponse> {
    const result = await this.service.refundUser(
      body.userId,
      body.amount,
      body.txId,
    );

    if (result.isErr()) {
      this.logger.error(result.error.message, result.error.stack);
      this.telegramAdminService.notify(
        `Failed to refund to user ${body.userId} with ${body.amount} USDT due to ${result.error.message}`,
      );
      return {
        success: false,
        message: result.error.message,
      };
    }

    this.telegramAdminService.notify(
      `Successfully refunded to user ${body.userId} with ${body.amount} USDT, source id: ${body.txId}`,
    );
    return {
      success: true,
      message: 'Refund request sent',
    };
  }

  @Post('actions/direct-withdraw')
  @HttpCode(HttpStatus.OK)
  async directWithdraw(
    @Body() body: DirectWithdrawRequestDto,
  ): Promise<ActionResponse> {
    const result = await this.service.directWithdrawFromPool(
      body.toAddress,
      body.amount,
      body.walletWithdrawId,
    );

    if (result.isErr()) {
      this.telegramAdminService.notify(
        `Failed to direct withdraw from pool ${body.walletWithdrawId} to ${body.toAddress} with ${body.amount} USDT due to ${result.error.message}`,
      );
      this.logger.error(result.error.message, result.error.stack);
      return {
        success: false,
        message: result.error.message,
      };
    }

    this.telegramAdminService.notify(
      `Successfully direct withdraw from pool ${body.walletWithdrawId} to ${body.toAddress} with ${body.amount} USDT, txHash: ${result.value}`,
    );
    return {
      success: true,
      message: result.value,
    };
  }
}
