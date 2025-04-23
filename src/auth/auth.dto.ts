export class AuthUserPayload {
  userId: string;
}

export class LoginResponseDto {
  accessToken: string;
}

export class AdminLoginPayloadDto {
  username: string;
  password: string;
}
