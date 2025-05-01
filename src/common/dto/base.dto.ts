export class BaseEntityDto {
  id: number | string;
}

export class NoticeResponse {
  success: boolean;
}

export class ActionResponse {
  success: boolean;
  message: string;
}
