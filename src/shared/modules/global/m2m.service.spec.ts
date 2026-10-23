/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
const saved = { ...process.env };

const auth0Env = {
  M2M_AUTH_URL: 'https://tenant.example/oauth/token',
  M2M_AUTH_AUDIENCE: 'https://m2m.example/',
  M2M_AUTH_PROXY_SEREVR_URL: 'https://proxy.example/token',
  M2M_AUTH_CLIENT_ID: 'auth0-groups',
  M2M_AUTH_CLIENT_SECRET: 'auth0-secret',
  AUTH0_URL: 'https://tenant.example/oauth/token',
  AUTH0_AUDIENCE: 'https://m2m.example/',
  AUTH0_PROXY_SERVER_URL: 'https://proxy.example/token',
  AUTH0_CLIENT_ID: 'auth0-bus',
  AUTH0_CLIENT_SECRET: 'auth0-bus-secret',
};
const keycloakEnv = {
  KEYCLOAK_ISSUER: 'https://keycloak.example/realms/m2m',
  KEYCLOAK_AUDIENCE: 'https://api.example',
  KEYCLOAK_TOKEN_URL: 'https://keycloak.example/m2m/token',
  KEYCLOAK_CLIENT_ID: 'm2m-groups',
  KEYCLOAK_CLIENT_SECRET: 'keycloak-secret',
};

/** Load the config and service modules fresh with the given environment. */
function load(env: Record<string, string>) {
  process.env = { ...saved, ...auth0Env, ...keycloakEnv, ...env };
  let loaded: any;
  jest.isolateModules(() => {
    const core = require('tc-core-library-js');
    const provider = { getMachineToken: jest.fn().mockResolvedValue('token') };
    const m2m = jest.spyOn(core.auth, 'm2m').mockReturnValue(provider);
    const { CommonConfig } = require('../../config/common.config');
    const { M2MService } = require('./m2m.service');
    loaded = { CommonConfig, service: new M2MService(), m2m, provider };
  });
  return loaded;
}

describe('USE_KEYCLOAK provider selection', () => {
  afterEach(() => {
    process.env = { ...saved };
  });

  it('keeps the Auth0 settings when USE_KEYCLOAK is not true', async () => {
    const { CommonConfig, service, m2m, provider } = load({ USE_KEYCLOAK: 'false' });
    expect(CommonConfig.AUTH0_URL).toBe(auth0Env.AUTH0_URL);
    expect(CommonConfig.AUTH0_CLIENT_ID).toBe('auth0-bus');
    expect(CommonConfig.AUTH0_PROXY_SERVER_URL).toBe(auth0Env.AUTH0_PROXY_SERVER_URL);
    expect(m2m).toHaveBeenCalledWith({
      AUTH0_URL: auth0Env.M2M_AUTH_URL,
      AUTH0_AUDIENCE: auth0Env.M2M_AUTH_AUDIENCE,
      AUTH0_PROXY_SERVER_URL: auth0Env.M2M_AUTH_PROXY_SEREVR_URL,
      AUTH0_CLIENT_ID: 'auth0-groups',
      AUTH0_CLIENT_SECRET: 'auth0-secret',
    });
    await expect(service.getM2MToken()).resolves.toBe('token');
    expect(provider.getMachineToken).toHaveBeenCalledWith();
  });

  it('gives the bus wrapper the Keycloak settings when USE_KEYCLOAK=true', () => {
    const { CommonConfig } = load({ USE_KEYCLOAK: 'true' });
    expect(CommonConfig.AUTH0_URL).toBe(keycloakEnv.KEYCLOAK_TOKEN_URL);
    expect(CommonConfig.AUTH0_AUDIENCE).toBe(keycloakEnv.KEYCLOAK_AUDIENCE);
    expect(CommonConfig.AUTH0_CLIENT_ID).toBe('m2m-groups');
    expect(CommonConfig.AUTH0_CLIENT_SECRET).toBe('keycloak-secret');
  });

  it('falls back to the AUTH0_* settings when M2M_AUTH_* are not set', () => {
    for (const name of Object.keys(auth0Env).filter((key) => key.startsWith('M2M_AUTH_'))) {
      delete (auth0Env as Record<string, string>)[name];
    }
    const { m2m } = load({ USE_KEYCLOAK: 'false' });
    expect(m2m).toHaveBeenCalledWith({
      AUTH0_URL: auth0Env.AUTH0_URL,
      AUTH0_AUDIENCE: auth0Env.AUTH0_AUDIENCE,
      AUTH0_PROXY_SERVER_URL: auth0Env.AUTH0_PROXY_SERVER_URL,
      AUTH0_CLIENT_ID: 'auth0-bus',
      AUTH0_CLIENT_SECRET: 'auth0-bus-secret',
    });
  });

  it('defaults to Auth0 when USE_KEYCLOAK is unset', () => {
    delete saved.USE_KEYCLOAK;
    const { CommonConfig } = load({});
    expect(CommonConfig.AUTH0_CLIENT_ID).toBe('auth0-bus');
  });
});
