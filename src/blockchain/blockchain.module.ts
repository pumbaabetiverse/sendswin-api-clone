import { Module } from '@nestjs/common';
import { BlockchainService } from '@/blockchain/blockchain.service';
import { SettingModule } from '@/setting/setting.module';

@Module({
  imports: [SettingModule],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
