# Topcoder Group API

Group API built on modern frameworks for managing all group-related Topcoder needs.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Database

```bash
# run postgres in docker, or other approach
docker run -p 5432:5432  -e POSTGRES_PASSWORD=mysecretpassword postgres:14

export DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/group-api?schema=groups"

# run migration
npx prisma migrate dev

# seed data
npx prisma db seed
or
npx prisma migrate reset

# if you modify prisma schema, run migration again
# and it'll ask
# Enter a name for the new migration:
# just provide a good migration name, such as
#- `add_user_table`
#- `update_user_fields`
#- `create_posts_table`
#- `add_email_to_users`
#- `update_foreign_keys`
```

## Data import

- create a .env file `mv .env.sample .env`
- update the postgres database url in .env file —
  `DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/group-api?schema=groups"`
- install dependencies `pnpm install`
- run the prisma migration `npx prisma migrate dev`
- run the prisma seed `npx prisma db seed`
- run the project `pnpm run start`


## Test API
- import Postman collection. The files are `doc/Group API.postman_collection.json` and `doc/Group.postman_environment.json`
- set env to suit your environment
- run mock api `node mock/mock-api.js`
- reset seed data `pnpm run seed-data`
- start app `pnpm run start:dev`
- generate the token

```bash
curl --request POST \
  --url https://auth0proxy.topcoder-dev.com/token \
  --header 'content-type: application/json' \
  --data '{"auth0_url": "https://topcoder-dev.auth0.com/oauth/token", "client_id":"8uHVTW2WHp8BbBPX7J0YTAwgYbYTfjsM","client_secret":"hQXGeKO-cSZ15CLBNRDGZAGRcHWay6PAR_zTQQz4YjdX7QNU7NwGoaa3YuuUYvUv","audience":"https://m2m.topcoder-dev.com/","grant_type":"client_credentials"}'
```

For a read-only scope M2M token, use:

```
"client_id":"dgrh9mkk8N6sWsVPFf6JqdVmjjuibowf"
"client_secret":"_6jFqIppsA3u87Tm7mRDXhX_yf8-DC2ooc5f0affjuWoRiLG1ZriHtUsMQgo61qp"
```

- then you can use Postman to test all apis
- Swagger docs are accessible at `http://localhost:3000/api-docs`
