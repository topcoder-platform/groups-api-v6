/**
 * Auth0 M2M settings for M2MService, used when USE_KEYCLOAK is not true.
 *
 * Each `M2M_AUTH_*` setting falls back to the matching `AUTH0_*` value used by the Bus
 * client, because DEV SSM only defines the `AUTH0_*` names; without the fallback the
 * Auth0 path had no credentials and posted to localhost, so group deletion failed.
 */
export const M2mConfig = {
  auth0: {
    url:
      process.env.M2M_AUTH_URL ??
      process.env.AUTH0_URL ??
      'http://localhost:4000/oauth/token',
    domain: process.env.M2M_AUTH_DOMAIN ?? 'topcoder-dev.auth0.com',
    audience:
      process.env.M2M_AUTH_AUDIENCE ??
      process.env.AUTH0_AUDIENCE ??
      'https://m2m.topcoder-dev.com/',
    proxyUrl:
      process.env.M2M_AUTH_PROXY_SEREVR_URL ?? process.env.AUTH0_PROXY_SERVER_URL,
    clientId: process.env.M2M_AUTH_CLIENT_ID ?? process.env.AUTH0_CLIENT_ID,
    clientSecret:
      process.env.M2M_AUTH_CLIENT_SECRET ?? process.env.AUTH0_CLIENT_SECRET,
  },
};
