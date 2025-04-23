import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '@/setting/setting.entity';
import { SettingKey } from '@/common/const';

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
  ) {
  }

  async getSetting(key: SettingKey, defaultValue: string) {
    const setting = await this.settingsRepository.findOneBy({ key });
    if (setting) {
      return setting.value;
    }
    await this.settingsRepository.save(this.settingsRepository.create({
      key,
      value: defaultValue,
    }));
    return defaultValue;
  }

  async setSetting(key: SettingKey, value: string) {
    const setting = await this.settingsRepository.findOneBy({ key });
    if (setting) {
      setting.value = value;
      return await this.settingsRepository.save(setting);
    }
    return await this.settingsRepository.save(this.settingsRepository.create({
      key,
      value,
    }));
  }

  async getNumberSetting(key: SettingKey, defaultValue: number) {
    const stringValue = await this.getSetting(key, defaultValue.toString());
    return parseInt(stringValue, 10);
  }

  async getFloatSetting(key: SettingKey, defaultValue: number) {
    const stringValue = await this.getSetting(key, defaultValue.toString());
    return parseFloat(stringValue);
  }
}
