# Set up

## Runtime Dependencies

1. node.js 14.x
2. npm v7 and above

## Connect to cache database & run migrations

You will need a PostgreSQL connection string with full permissions.

Create a file named `database.json` at the project root with the following contents:

```json
{
  "dev": {
    "driver": "pg",
    "user": "<user>",
    "password": "<password>",
    "host": "<host>",
    "database": "<database>",
    "ssl": true
  }
}
```

[See `db-migrate` docs for more information](https://db-migrate.readthedocs.io/en/latest/Getting%20Started/configuration/).

Note that this database can take some time to update the first time, so feel free to use [one of the dumps](https://drive.google.com/drive/folders/1pzmvYi7aMAAceuItqza7LfwOQQdNYoxi?usp=sharing) to get started.

## Configure environment

Create a `.env` file with the following contents:

```env
ENDPOINT=<comma-separated list of endpoint names>
DB_CONNECTION=<comma-separated list of indexer connection strings>
PORT=<optional, default 3000>
CACHE_DB_CONNECTION=<cache connection string>

# Don't run cache updates, optional
# NO_UPDATE_CACHE=1
```

For example:

```env
ENDPOINT=mainnet,testnet
DB_CONNECTION=postgres://user:pass@mainnet_host/db_name,postgres://user:pass@testnet_host/db_name
CACHE_DB_CONNECTION=postgres://user:pass@cache_host/db_name
NO_UPDATE_CACHE=1
```

You can use the public indexer endpoints found [here](https://github.com/near/near-indexer-for-explorer#shared-public-access).

# Run

Node:

```
$ npm run start
```

Docker:

```
$ docker-compose up
```
