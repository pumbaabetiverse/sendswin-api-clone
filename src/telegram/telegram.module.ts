import { forwardRef, Module } from '@nestjs/common';
import { TelegramService } from '@/telegram/telegram.service';
import { UsersModule } from '@/users/user.module';
import { SettingModule } from '@/setting/setting.module';
import { DepositsModule } from '@/deposits/deposit.module';
import { BinanceModule } from '@/binance/binance.module';
import { TelegramUpdate } from '@/telegram/telegram.update';

@Module({
  imports: [
    UsersModule,
    forwardRef(() => DepositsModule),
    SettingModule,
    BinanceModule,
  ],
  providers: [TelegramService, TelegramUpdate],
  exports: [TelegramService],
})
export class TelegramModule {}
