import { AUTH_CONFIG } from '@/shared/constants/app.constants';

type TokenPayload = {
  sub: string;
  org: string;
  iss: string;
  exp: number;
};

const encodeBase64Url = (value: string): string =>
  btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

export const createMockJwt = (userId: string, orgId: string): { token: string; refreshToken: string; expiresAt: string } => {
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.tokenTtlMinutes * 60 * 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload: TokenPayload = {
    sub: userId,
    org: orgId,
    iss: AUTH_CONFIG.tokenIssuer,
    exp: Math.floor(expiresAt.getTime() / 1000),
  };

  return {
    token: `${header}.${encodeBase64Url(JSON.stringify(payload))}.mock-signature`,
    refreshToken: `${header}.${encodeBase64Url(
      JSON.stringify({ ...payload, typ: 'refresh', exp: payload.exp + 86400 }),
    )}.mock-refresh-signature`,
    expiresAt: expiresAt.toISOString(),
  };
};
