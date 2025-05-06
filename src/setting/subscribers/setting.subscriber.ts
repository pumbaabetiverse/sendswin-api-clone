import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Setting } from '../setting.entity';

@EventSubscriber()
export class SettingSubscriber implements EntitySubscriberInterface<Setting> {
  constructor(
    dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Setting;
  }

  async afterUpdate(event: UpdateEvent<Setting>) {
    if (event.entity?.key && event.entity?.value !== undefined) {
      await this.cacheManager.set(`${event.entity.key}`, event.entity.value);
    }
  }
  async afterRemove(event: RemoveEvent<Setting>) {
    if (event.entity?.key) {
      await this.cacheManager.del(event.entity.key);
    }
  }
}
