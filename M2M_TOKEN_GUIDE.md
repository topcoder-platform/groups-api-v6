# Machine-to-Machine (M2M) Token Guide for Topcoder Review API

## Overview

The Topcoder Review API supports machine-to-machine (M2M) authentication using Auth0 for service-to-service integrations.
This guide explains how to use M2M tokens with the API.

## What are M2M Tokens?

Machine-to-Machine tokens are designed for service-to-service authentication where a human user is not directly involved.
Instead of using user roles for authorization, M2M tokens use scopes, which are permissions attached to the token.

## M2M Token Structure

M2M tokens from Auth0 contain the following important claims:
- `iss` (issuer): The Auth0 domain that issued the token
- `sub` (subject): The client ID of the application
- `aud` (audience): The API identifier (audience)
- `exp` (expiration time): When the token expires
- `iat` (issued at time): When the token was issued
- `scope`: Space-separated list of authorized scopes

## Available Scopes

The Topcoder Review API supports the following scopes:

### Group Scopes
- `read:groups` - Do read action of groups
- `write:groups` - Do write action of groups
- `all:groups` - All groups-related operations

## Getting an M2M Token

To get an M2M token, you need to have a client registered in Auth0 with the appropriate permissions.

### Example Request

```bash
curl --request POST \
  --url https://topcoder-dev.auth0.com/oauth/token \
  --header 'content-type: application/json' \
  --data '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "audience": "https://m2m.topcoder-dev.com/",
    "grant_type": "client_credentials"
  }'
```

### Example Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6...",
  "scope": "read:appeal create:review all:scorecard",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

## Using the Token

Include the token in your API requests in the Authorization header:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Scope Validation

When a request is made to the API, the token's scopes are validated against the required scopes for the endpoint.
If the token has at least one of the required scopes, access is granted.

### Notes on "all:" Scopes

Scopes that start with "all:" automatically grant access to all the specific operations in that category.
For example, `all:groups` includes `read:groups`, `write:groups`, etc.

## Testing M2M Tokens

For testing locally, you can use the following predefined test tokens:

- `m2m-token-all` - Has all available scopes
- `m2m-token-groups` - Has all groups scopes

Example usage with curl:

```bash
curl -X GET http://localhost:3000/v6/groups \
  -H "Authorization: Bearer m2m-token-review"
```

## Troubleshooting

If you receive a 403 Forbidden response, check that:
1. Your token is valid and not expired
2. The token has the required scope for the endpoint
3. You're using the correct audience and issuer