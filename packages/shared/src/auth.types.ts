export interface JwtAccessPayload {
  sub: string; // user id
  username: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}
