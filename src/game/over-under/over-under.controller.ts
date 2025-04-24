import { Controller, Get } from '@nestjs/common';
import { OverUnderRoundWallet } from './dto/over-under.dto';
import { OverUnderService } from './over-under.service';
import { Authenticated } from '@/common/decorators/common.decorator';

@Controller('game/over-under')
export class OverUnderController {
  constructor(private readonly overUnderService: OverUnderService) {}

  @Get('wallet')
  @Authenticated()
  getRoundWallet(): Promise<OverUnderRoundWallet> {
    return this.overUnderService.getRoundWallet();
  }
}
