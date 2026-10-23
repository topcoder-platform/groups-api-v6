# Keycloak M2M migration branch

This code is isolated on `keycloak_m2M`. Do not deploy this branch until the
workload and its callers are ready. Existing DEV services continue using Auth0.
The core dependency is pinned to a reviewed Keycloak prerelease commit, including
transitive wrapper uses through the pnpm override. No npm latest dependency is used.
Both the dependency and the override use the `codeload.github.com` tarball URL, the
same form as the other v6 services. The earlier `github:` override form did not apply
to `tc-bus-api-wrapper`'s nested copy, which stayed on Auth0 core 3.0.1, so bus
publishing would have failed. `pnpm-lock.yaml` resolves a single 4.0.0-keycloak.1
(core commit `e844764`).

`CHALLENGE_API_URL` is the Challenge API base, for example
`https://api.topcoder-dev.com/v6/challenges`. Group deletion appends `?groups=[...]` to
it. In DEV it is `/config/groups-api-v6/appvar/CHALLENGE_API_URL`. The older
`CHALLENGE_API` parameter is not read by this service.

## Provider switch: `USE_KEYCLOAK`

`USE_KEYCLOAK=true` makes this service get its M2M tokens from Keycloak, using
`KEYCLOAK_TOKEN_URL`, `KEYCLOAK_AUDIENCE`, `KEYCLOAK_CLIENT_ID` and
`KEYCLOAK_CLIENT_SECRET` (optional `KEYCLOAK_SCOPE` narrows the client's defaults).
`KEYCLOAK_ISSUER` is also required. Unset or `false` restores the Auth0 behaviour from
before the migration:

- `M2MService` (challenge lookups) uses `M2M_AUTH_URL`, `M2M_AUTH_AUDIENCE`,
  `M2M_AUTH_PROXY_SEREVR_URL`, `M2M_AUTH_CLIENT_ID` and `M2M_AUTH_CLIENT_SECRET`.
- The Bus client uses `AUTH0_URL`, `AUTH0_AUDIENCE`, `AUTH0_PROXY_SERVER_URL`,
  `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`.

`tc-core-library-js` reads the flag (`auth.useKeycloak`), and `CommonConfig` gets the
Bus settings from `auth.wrapperSettings`, so the service and the core always agree.
Any value other than `true`/`false` fails at startup. In DEV the flag is
`/config/common/global-appvar/USE_KEYCLOAK`.

Incoming machine tokens: with `true`, Keycloak tokens are accepted, plus Auth0 tokens
while `LEGACY_M2M_ISSUERS`/`LEGACY_M2M_AUDIENCE` are set. With `false`, Auth0 tokens
are accepted through `LEGACY_M2M_*`, plus Keycloak tokens while `KEYCLOAK_ISSUER` and
`KEYCLOAK_AUDIENCE` are set, so callers that have not switched yet keep working.

**Rollback:** set `USE_KEYCLOAK=false` and force a new deployment so tasks re-read SSM.
No code or dependency change is needed. Keep the Auth0 settings above in SSM until
Keycloak has been accepted.

The DEV issuer is `https://keycloak.topcoder-dev.com/realms/topcoder-m2m-dev`,
audience `https://api.topcoder-dev.com`, and managed endpoint
`https://keycloak.topcoder-dev.com/m2m/token`.

Member sessions remain Auth0. Keep `VALID_ISSUERS` and `AUTH_SECRET` where legacy
member HMAC tokens are supported. Set `AUTH_USER_AUDIENCES` to a JSON array, or
explicitly retain existing user-token audience behavior with
`ALLOW_LEGACY_USER_AUDIENCE=true`. Never apply that exception to M2M tokens.
`LEGACY_M2M_ISSUERS` and `LEGACY_M2M_AUDIENCE` let Auth0 machine tokens pass the same
normalizer (see the provider switch above).

`tc-core-library-js` owns signature, issuer, audience, lifetime, and machine/user
classification. Service adapters must use its verified `kind`, `isMachine`, and
`scopes` rather than decode/reclassify claims. Scope guards delegate exact matching
to the library with explicit all/any policy. Existing business roles and documented
scope aliases remain endpoint policy; adding OAuth scopes to a user token never
grants machine access. No permissive fallback or synthetic token path is available.

Before rollout run this project's `nvm use`, `pnpm lint`, `pnpm build`, and targeted
authentication tests. Validate real authorized/unauthorized routes with both a
Keycloak service token and a member token, including wrong audiences and insufficient
scopes. Switch only after every downstream receiver accepts the issuer. The core never
retries a failed Keycloak request against Auth0; rolling back is the explicit
`USE_KEYCLOAK=false` change above.

Adapter policy checks cover verified machine identity, scope separation from members,
and sanitized validation failures. Groups retains its explicit singular/plural and
`all:groups` aliases; Bus requires all declared scopes, while Finance, Groups, and
Engagements retain their explicit any-of route policies. Permission names are case
sensitive. Engagements privileged member roles retain their existing access policy.

Validation on 21 October 2026: project lint and build pass; the full unit test
suite passes, including the shared validator/guard adapter checks.
