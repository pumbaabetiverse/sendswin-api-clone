import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '@/setting/setting.entity';
import { SettingKey } from '@/common/const';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async getSetting(key: SettingKey, defaultValue: string) {
    // Check if the value is in cache
    const cachedValue = await this.cacheManager.get<string>(key);
    if (cachedValue) {
      return cachedValue;
    }

    // If not in cache, fetch from database
    const setting = await this.settingsRepository.findOneBy({ key });
    if (setting) {
      // Update cache with the fetched value
      await this.cacheManager.set(key, setting.value);
      return setting.value;
    }

    // If setting doesn't exist, create it with default value
    await this.settingsRepository.save(
      this.settingsRepository.create({
        key,
        value: defaultValue,
      }),
    );

    // Cache the default value
    await this.cacheManager.set(key, defaultValue);

    return defaultValue;
  }

  async setSetting(key: SettingKey, value: string) {
    const setting = await this.settingsRepository.findOneBy({ key });
    let savedSetting: Setting;

    if (setting) {
      setting.value = value;
      savedSetting = await this.settingsRepository.save(setting);
    } else {
      savedSetting = await this.settingsRepository.save(
        this.settingsRepository.create({
          key,
          value,
        }),
      );
    }

    // Update the cache with the new value
    await this.cacheManager.set(key, savedSetting.value);

    return savedSetting;
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
