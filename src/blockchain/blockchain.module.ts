import { Module } from '@nestjs/common';
import { SettingModule } from '@/setting/setting.module';
import { BlockchainHelperService } from '@/blockchain/blockchain-helper.service';

@Module({
  imports: [SettingModule],
  providers: [BlockchainHelperService],
  exports: [BlockchainHelperService],
})
export class BlockchainModule {}
