import { Module } from '@nestjs/common';
import { BlockchainService } from '@/blockchain/blockchain.service';
import { SettingModule } from '@/setting/setting.module';
import { BlockchainHelperService } from './blockchain-helper.service';

@Module({
  imports: [SettingModule],
  providers: [BlockchainService, BlockchainHelperService],
  exports: [BlockchainService, BlockchainHelperService],
})
export class BlockchainModule {}
