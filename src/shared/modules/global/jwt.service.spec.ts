import { generateKeyPairSync } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { AuthConfig } from '../../config/auth.config';
import { Scope } from '../../enums/scopes.enum';
import { UserRole } from '../../enums/userRole.enum';
import { JwtService } from './jwt.service';

const ALLOWED_ISSUER = 'https://issuer.example/';
const SECOND_ALLOWED_ISSUER = 'https://second-issuer.example/';
const AUDIENCE = 'https://audience.example/';
const USER_AUDIENCE = 'https://app.example/v6';
const AUTH_SECRET = 'test-shared-auth-secret';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

describe('JwtService validation', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAuthConfig = {
    authSecret: AuthConfig.authSecret,
    validIssuers: [...AuthConfig.validIssuers],
    audience: AuthConfig.jwt.audience,
    ignoreExpiration: AuthConfig.jwt.ignoreExpiration,
  };

  let service: JwtService;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    AuthConfig.authSecret = AUTH_SECRET;
    AuthConfig.validIssuers = [ALLOWED_ISSUER, SECOND_ALLOWED_ISSUER];
    AuthConfig.jwt.audience = AUDIENCE;
    AuthConfig.jwt.ignoreExpiration = false;
    service = new JwtService();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    AuthConfig.authSecret = originalAuthConfig.authSecret;
    AuthConfig.validIssuers = originalAuthConfig.validIssuers;
    AuthConfig.jwt.audience = originalAuthConfig.audience;
    AuthConfig.jwt.ignoreExpiration = originalAuthConfig.ignoreExpiration;
  });

  it('accepts an RS256 admin token with a non-M2M audience', async () => {
    const signingKeySpy = jest
      .spyOn(service as any, 'getSigningKey')
      .mockResolvedValue(publicKey);
    const token = sign(
      {
        roles: [UserRole.Admin],
        userId: '12345',
        scope: 'openid profile offline_access',
        gty: 'authorization_code',
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: 'test-key-id',
        issuer: SECOND_ALLOWED_ISSUER,
        audience: USER_AUDIENCE,
        expiresIn: 300,
      },
    );

    await expect(service.validateToken(token)).resolves.toEqual(
      expect.objectContaining({
        roles: [UserRole.Admin],
        userId: '12345',
        isMachine: false,
      }),
    );
    expect(signingKeySpy).toHaveBeenCalledWith(
      SECOND_ALLOWED_ISSUER,
      'test-key-id',
    );
  });

  it('accepts an RS256 client-credentials token with the configured audience', async () => {
    jest.spyOn(service as any, 'getSigningKey').mockResolvedValue(publicKey);
    const token = sign(
      {
        scope: Scope.AllGroups,
        gty: 'client-credentials',
        sub: 'test-client@clients',
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: 'test-key-id',
        issuer: ALLOWED_ISSUER,
        audience: AUDIENCE,
        expiresIn: 300,
      },
    );

    await expect(service.validateToken(token)).resolves.toEqual({
      scopes: expect.arrayContaining([
        Scope.AllGroups,
        Scope.ReadGroups,
        Scope.WriteGroups,
      ]),
      userId: 'test-client@clients',
      isMachine: true,
    });
  });

  it('rejects static test tokens in production', async () => {
    await expect(service.validateToken('admin-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.validateToken('m2m-token-all')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('keeps static tokens available only under NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test';

    await expect(service.validateToken('admin-token')).resolves.toEqual({
      roles: [UserRole.Admin],
      isMachine: false,
    });
  });

  it('rejects an RS256 client-credentials token with the wrong audience', async () => {
    jest.spyOn(service as any, 'getSigningKey').mockResolvedValue(publicKey);
    const token = sign(
      {
        scope: Scope.ReadGroups,
        gty: 'client-credentials',
        sub: 'test-client@clients',
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: 'test-key-id',
        issuer: ALLOWED_ISSUER,
        audience: 'https://wrong-audience.example/',
        expiresIn: 300,
      },
    );

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an RS256 client-credentials token without an audience', async () => {
    jest.spyOn(service as any, 'getSigningKey').mockResolvedValue(publicKey);
    const token = sign(
      {
        scope: Scope.ReadGroups,
        gty: 'client-credentials',
        sub: 'test-client@clients',
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: 'test-key-id',
        issuer: ALLOWED_ISSUER,
        expiresIn: 300,
      },
    );

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('still checks audience when client-credentials tokens contain user claims', async () => {
    jest.spyOn(service as any, 'getSigningKey').mockResolvedValue(publicKey);
    const token = sign(
      {
        scope: Scope.ReadGroups,
        gty: 'client-credentials',
        roles: [UserRole.Admin],
        userId: '12345',
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: 'test-key-id',
        issuer: ALLOWED_ISSUER,
        audience: 'https://wrong-audience.example/',
        expiresIn: 300,
      },
    );

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a client-credentials token when AUTH0_AUDIENCE is unavailable', async () => {
    AuthConfig.jwt.audience = undefined;
    const signingKeySpy = jest.spyOn(service as any, 'getSigningKey');
    const token = sign(
      {
        scope: Scope.ReadGroups,
        gty: 'client-credentials',
        sub: 'test-client@clients',
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: 'test-key-id',
        issuer: ALLOWED_ISSUER,
        audience: AUDIENCE,
        expiresIn: 300,
      },
    );

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(signingKeySpy).not.toHaveBeenCalled();
  });

  it('does not require AUTH0_AUDIENCE for an RS256 user token', async () => {
    AuthConfig.jwt.audience = undefined;
    jest.spyOn(service as any, 'getSigningKey').mockResolvedValue(publicKey);
    const token = sign(
      { roles: [UserRole.Admin], userId: '12345' },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: 'test-key-id',
        issuer: ALLOWED_ISSUER,
        audience: USER_AUDIENCE,
        expiresIn: 300,
      },
    );

    await expect(service.validateToken(token)).resolves.toEqual(
      expect.objectContaining({
        roles: [UserRole.Admin],
        userId: '12345',
        isMachine: false,
      }),
    );
  });

  it('rejects an unlisted issuer before requesting its signing key', async () => {
    const signingKeySpy = jest.spyOn(service as any, 'getSigningKey');
    const token = sign({ roles: [UserRole.Admin] }, privateKey, {
      algorithm: 'RS256',
      keyid: 'test-key-id',
      issuer: 'https://unlisted-issuer.example/',
      audience: AUDIENCE,
      expiresIn: 300,
    });

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(signingKeySpy).not.toHaveBeenCalled();
  });

  it('rejects an RS256 token without a key ID', async () => {
    const signingKeySpy = jest.spyOn(service as any, 'getSigningKey');
    const token = sign({ roles: [UserRole.Admin] }, privateKey, {
      algorithm: 'RS256',
      issuer: ALLOWED_ISSUER,
      audience: AUDIENCE,
      expiresIn: 300,
    });

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(signingKeySpy).not.toHaveBeenCalled();
  });

  it('accepts a legacy HS256 admin token without kid or audience', async () => {
    const token = sign(
      {
        roles: [UserRole.Admin],
        userId: '12345',
        handle: 'admin-user',
      },
      AUTH_SECRET,
      {
        algorithm: 'HS256',
        issuer: ALLOWED_ISSUER,
        expiresIn: 300,
      },
    );

    await expect(service.validateToken(token)).resolves.toEqual(
      expect.objectContaining({
        roles: [UserRole.Admin],
        userId: '12345',
        handle: 'admin-user',
        isMachine: false,
      }),
    );
  });

  it('rejects an HS256 token signed with a different secret', async () => {
    const token = sign({ roles: [UserRole.Admin] }, 'wrong-secret', {
      algorithm: 'HS256',
      issuer: ALLOWED_ISSUER,
      expiresIn: 300,
    });

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('still verifies signatures when NODE_ENV is missing', async () => {
    delete process.env.NODE_ENV;
    const token = sign({ roles: [UserRole.Admin] }, 'wrong-secret', {
      algorithm: 'HS256',
      issuer: ALLOWED_ISSUER,
      expiresIn: 300,
    });

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an HS256 token when AUTH_SECRET is unavailable', async () => {
    AuthConfig.authSecret = undefined;
    const token = sign({ roles: [UserRole.Admin] }, AUTH_SECRET, {
      algorithm: 'HS256',
      issuer: ALLOWED_ISSUER,
      expiresIn: 300,
    });

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an expired HS256 admin token', async () => {
    const token = sign({ roles: [UserRole.Admin] }, AUTH_SECRET, {
      algorithm: 'HS256',
      issuer: ALLOWED_ISSUER,
      expiresIn: -60,
    });

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('accepts an HS256 admin token with a non-M2M audience', async () => {
    const token = sign(
      {
        roles: [UserRole.Admin],
        userId: '12345',
        scope: 'openid profile offline_access',
        gty: 'authorization_code',
      },
      AUTH_SECRET,
      {
        algorithm: 'HS256',
        issuer: ALLOWED_ISSUER,
        audience: USER_AUDIENCE,
        expiresIn: 300,
      },
    );

    await expect(service.validateToken(token)).resolves.toEqual(
      expect.objectContaining({
        roles: [UserRole.Admin],
        userId: '12345',
        isMachine: false,
      }),
    );
  });

  it('validates AUTH0_AUDIENCE for an HS256 client-credentials token', async () => {
    const token = sign(
      {
        scope: Scope.ReadGroups,
        gty: 'client-credentials',
        sub: 'test-client@clients',
      },
      AUTH_SECRET,
      {
        algorithm: 'HS256',
        issuer: ALLOWED_ISSUER,
        audience: 'https://wrong-audience.example/',
        expiresIn: 300,
      },
    );

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects unsupported signing algorithms', async () => {
    const token = sign({ roles: [UserRole.Admin] }, AUTH_SECRET, {
      algorithm: 'HS384',
      issuer: ALLOWED_ISSUER,
      expiresIn: 300,
    });

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
