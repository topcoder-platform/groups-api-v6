import { Injectable } from '@nestjs/common';
import { auth } from 'tc-core-library-js';
import { M2mConfig } from '../../config/m2m.config';

/**
 * Obtains this workload's M2M token from the provider selected by `USE_KEYCLOAK`.
 *
 * With `USE_KEYCLOAK=true` the core uses `KEYCLOAK_TOKEN_URL`, `KEYCLOAK_AUDIENCE`,
 * `KEYCLOAK_CLIENT_ID` and `KEYCLOAK_CLIENT_SECRET` and ignores the Auth0 options.
 * Otherwise it uses the Auth0 settings from {@link M2mConfig} (`M2M_AUTH_*`), as the
 * service did before the Keycloak migration. Injected into group and event services.
 */
@Injectable()
export class M2MService {
  private readonly m2m = auth.m2m(M2MService.auth0Options());

  /**
   * Map the `M2M_AUTH_*` settings to the core's Auth0 option names.
   * Takes no parameters; returns the options object passed to `auth.m2m`.
   */
  static auth0Options(): Record<string, string | undefined> {
    const config = M2mConfig.auth0;
    return {
      AUTH0_URL: config.url,
      AUTH0_AUDIENCE: config.audience,
      AUTH0_PROXY_SERVER_URL: config.proxyUrl,
      AUTH0_CLIENT_ID: config.clientId,
      AUTH0_CLIENT_SECRET: config.clientSecret,
    };
  }

  /**
   * Return a cached or new token from the active provider.
   * Takes no parameters; rejects on configuration or issuance failure.
   */
  async getM2MToken(): Promise<string> {
    return this.m2m.getMachineToken();
  }
}
