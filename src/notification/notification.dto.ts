export class NotificationEvent {
  type: string;
  data: object;
}

export enum NotificationType {
  NEW_GAME = 'new_game',
  NEW_WITHDRAW = 'new_withdraw',
}
