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

  constructor(public service: AdminWithdrawService) {}

  @Post('actions/refund')
  @HttpCode(HttpStatus.OK)
  async refund(@Body() body: RefundRequestDto): Promise<ActionResponse> {
    const result = await this.service.refundUser(
      body.userId,
      body.amount,
      body.txId,
    );
    if (result.isOk()) {
      return {
        success: true,
        message: 'Refund request sent',
      };
    } else {
      this.logger.error(result.error.message, result.error.stack);
      return {
        success: false,
        message: result.error.message,
      };
    }
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
      this.logger.error(result.error.message, result.error.stack);
      return {
        success: false,
        message: result.error.message,
      };
    }

    return {
      success: true,
      message: result.value,
    };
  }
}
