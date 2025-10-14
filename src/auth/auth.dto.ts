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

export class UsernameLoginPayload {
  username: string;
  password: string;
}

export class UsernameRegisterPayload {
  username: string;
  password: string;
  inviteCode?: string;
}

export class LoginResultPayload {
  token: string;
}
