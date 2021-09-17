const Koa = require('koa');
const Router = require('@koa/router');
const cors = require('@koa/cors');
const { createPool, sql } = require('slonik');
const routes = require('./routes');
const poll = require('./poll');
const { sleep } = require('./utils/sleep');
const { LeaderboardCache } = require('./leaderboards');

const app = new Koa();
const port = process.env['PORT'] || 3000;
console.log('Listening on port ' + port + '...');
app.listen(port);
app.use(cors());

const index = new Router();

// Environment variable
const endpoints = process.env['ENDPOINT'].split(',').map((s) => s.trim());
const connections = process.env['DB_CONNECTION']
  .split(',')
  .map((s) => s.trim());
const leaderboardCacheConnectionString = process.env['CACHE_DB_CONNECTION'];
/** @type {import('slonik').DatabasePoolType[]} */
const pools = [];

const leaderboardCache = new LeaderboardCache(
  leaderboardCacheConnectionString,
  connections[endpoints.indexOf('mainnet')],
);

if (endpoints.length === 0 || endpoints.length !== connections.length) {
  console.error('Invalid endpoint/connection configuration provided');
  process.exit(1);
}

endpoints.forEach((endpoint, i) => {
  const connection = connections[i];
  const router = new Router();

  console.log('Connection', connection);

  const pool = createPool(connection);
  pools.push(pool);

  routes.forEach((route) => {
    if ('poll' in route) {
      const fn = async () =>
        await pool.connect((connection) => {
          return connection.any(route.query());
        });
      const { call } = poll(fn, {
        updateInterval: route.poll,
        defaultValue: [],
      });

      router.get('/' + route.path, async (ctx, next) => {
        console.log('/' + route.path);
        console.log('Request', ctx.request);
        try {
          const result = await call();
          console.log('Response', result);

          ctx.response.body = result;
        } catch (e) {
          console.log(e);
          ctx.response.status = 500;
        }
      });
    } else {
      router.get('/' + route.path, async (ctx, next) => {
        console.log('/' + route.path);
        console.log('Request', ctx.request);
        try {
          const result = await pool.connect((connection) => {
            return connection.any(route.query(ctx.query));
          });
          console.log('Response', result);

          ctx.response.body = result;
        } catch (e) {
          console.log(e);
          ctx.response.status = 500;
        }
      });
    }
  });

  router.get('/leaderboard-balance', async (ctx, next) => {
    ctx.body = await leaderboardCache.getTopAccountsByBalance();
    await next();
  });

  router.get('/leaderboard-score', async (ctx, next) => {
    ctx.body = await leaderboardCache.getTopAccountsByScore();
    await next();
  });

  process.on('exit', async () => {
    console.log('Ending pool ' + endpoint + '...');
    await pool.end();
    console.log('Ended pool ' + endpoint);
  });

  index.use('/' + endpoints[i], router.routes(), router.allowedMethods());
});

index.get('/status', async (ctx, next) => {
  try {
    const queries = await Promise.all(
      pools.map((pool) => pool.one(sql`select 1 as result`)),
    );
    const ok = queries.every((query) => query.result === 1);
    if (ok) {
      ctx.status = 200;
      ctx.response.body = 'ok';
      await next();
      return;
    }
  } catch (e) {}

  ctx.status = 500;
  ctx.response.body = 'not ok';
  await next();
  return;
});

const draw = require('./image');

index.get('/card/:accountId/card.png', async (ctx, next) => {
  ctx.set('content-type', 'image/png');
  try {
    ctx.body = (
      await draw(ctx.params.accountId, ctx.query['network'] ?? 'mainnet')
    ).toBuffer();
  } catch (e) {
    console.log(e);
    ctx.status = 500;
  }
  await next();
});

async function recurringUpdateLeaderboards() {
  let b = false;
  process.on('exit', () => {
    // best we can do
    b = true;
  });

  console.log('updating cache');

  while (true) {
    if (b) {
      break;
    }
    await leaderboardCache.update();
    await sleep(1000 * 60 * 10); // 10 minutes
  }
}

const noUpdateCache = process.env['NO_UPDATE_CACHE'];
if (!noUpdateCache) {
  recurringUpdateLeaderboards();
}

app.use(index.routes()).use(index.allowedMethods());

console.log('Waiting for requests...');
