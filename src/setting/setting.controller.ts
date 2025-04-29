import { Controller, Get, ParseArrayPipe, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { SettingService } from './setting.service';
import { GetSettingResponse } from './dto/setting.dto';

@Controller('setting')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Get('list')
  @ApiOkResponse({
    type: GetSettingResponse,
  })
  async settings(
    @Query('keys', ParseArrayPipe) keys: string[],
  ): Promise<GetSettingResponse> {
    const data = await this.settingService.getExposeSettings(keys);
    return { data };
  }
}
