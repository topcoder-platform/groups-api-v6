import { loadAuthConfig, parseValidIssuers } from './auth.config';

describe('authentication configuration', () => {
  it('parses the global JSON issuer list', () => {
    expect(
      parseValidIssuers(
        '["https://api.topcoder-dev.com", "https://topcoder-dev.auth0.com/", "https://api.topcoder-dev.com"]',
      ),
    ).toEqual([
      'https://api.topcoder-dev.com',
      'https://topcoder-dev.auth0.com/',
    ]);
  });

  it('accepts a comma-separated issuer list', () => {
    expect(
      parseValidIssuers(
        'https://api.topcoder.com, https://topcoder.auth0.com/',
      ),
    ).toEqual(['https://api.topcoder.com', 'https://topcoder.auth0.com/']);
  });

  it('fails closed for a non-array JSON issuer value', () => {
    expect(parseValidIssuers('{"issuer":"https://issuer.example/"}')).toEqual(
      [],
    );
  });

  it('uses the standard v6 environment variable names', () => {
    const config = loadAuthConfig({
      NODE_ENV: 'production',
      AUTH_SECRET: 'shared-secret',
      VALID_ISSUERS: '["https://configured-issuer.example/"]',
      AUTH0_AUDIENCE: 'https://configured-audience.example/',
      AUTH0_ISSUER: 'https://legacy-issuer.example/',
      TOKEN_AUDIENCE: 'https://legacy-audience.example/',
    });

    expect(config).toEqual({
      authSecret: 'shared-secret',
      validIssuers: ['https://configured-issuer.example/'],
      jwt: {
        audience: 'https://configured-audience.example/',
        clockTolerance: 30,
        ignoreExpiration: false,
      },
    });
  });

  it('enforces expiration outside production too', () => {
    const config = loadAuthConfig({
      NODE_ENV: 'development',
      VALID_ISSUERS: '["https://configured-issuer.example/"]',
      AUTH0_AUDIENCE: 'https://configured-audience.example/',
    });

    expect(config.jwt.ignoreExpiration).toBe(false);
  });
});
