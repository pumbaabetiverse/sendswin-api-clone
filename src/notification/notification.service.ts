import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { fromEvent } from 'rxjs';
import { fromSyncResult } from '@/common/errors';
import { Result } from 'neverthrow';
import { NotificationEvent } from '@/notification/notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly emitter: EventEmitter2) {}

  /**
   * Send a notification to a specific user or all users
   * @param userId - The ID of the user to send the notification to, or null to send to all users
   * @param data - The data to include in the notification (can be any type)
   */
  sendNotification(
    userId: number,
    data: NotificationEvent,
  ): Result<boolean, Error> {
    return fromSyncResult(() =>
      this.emitter.emit(`notification.${userId}`, { data }),
    );
  }

  /**
   * Subscribe to notifications for a specific user
   * @param userId - The ID of the user to subscribe to notifications for
   * @returns An observable that emits notification data for the specified user
   */
  subscribeToNotifications(userId: number) {
    return fromEvent(this.emitter, `notification.${userId}`);
  }
}
