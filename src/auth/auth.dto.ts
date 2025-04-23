export class AuthUserPayload {
  userId: number;
}

export class AdminUserPayload {
  userId: string;
}

export class LoginResponseDto {
  accessToken: string;
}

export class AdminLoginPayloadDto {
  username: string;
  password: string;
}
