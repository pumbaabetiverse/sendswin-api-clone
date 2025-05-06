import { Controller, Sse } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Observable } from 'rxjs';
import { Authenticated, AuthUser } from '@/common/decorators/common.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Sse('sse')
  @Authenticated()
  sse(@AuthUser('userId') userId: number): Observable<unknown> {
    return this.notificationService.subscribeToNotifications(userId);
  }
}
