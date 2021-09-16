const fs = require('fs/promises');
const { createPool, sql } = require('slonik');
const scoreSql = require('./queries/score.sql');

const cachePool = createPool('postgres://postgres@127.0.0.1/test_cache');

const indexerPool = createPool(
  'postgres://public_readonly:nearprotocol@104.199.89.51/mainnet_explorer',
);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

async function queryUpdatedAccountsFromIndexer(sinceBlockHeight) {
  const queryResult = await indexerPool.many(sql`
    select account_id,
      last_update_block_height
    from accounts
    where deleted_by_receipt_id is null
    and last_update_block_height >= ${sinceBlockHeight}
  `);

  const accounts = [];
  let lastUpdateBlockHeight = 0;

  for (record of queryResult) {
    accounts.push(record.account_id + '');
    if (record.last_update_block_height > lastUpdateBlockHeight) {
      lastUpdateBlockHeight = record.last_update_block_height;
    }
  }

  return { accounts, lastUpdateBlockHeight };
}

async function queryAllAccountsFromIndexer() {
  const queryResult = await indexerPool.many(sql`
    select account_id,
      last_update_block_height
    from accounts
    where deleted_by_receipt_id is null
  `);

  const accounts = [];
  let lastUpdateBlockHeight = 0;

  for (record of queryResult) {
    accounts.push(record.account_id + '');
    if (record.last_update_block_height > lastUpdateBlockHeight) {
      lastUpdateBlockHeight = record.last_update_block_height;
    }
  }

  return { accounts, lastUpdateBlockHeight };
}

/** @typedef {{ account_id: string; balance: string; score: number; }} AccountRecord */
/** @type {() => Promise<AccountRecord[]>} */
function queryAllAccountsFromCache() {
  return cachePool.many(sql`
    select * from account
  `);
}

/** @type {() => Promise<number>} */
function queryLastUpdateBlockHeightFromCache() {
  return cachePool.oneFirst(sql`
    select block_height from last_update
  `);
}

function writeAccountIds(accounts) {
  return cachePool.connect(async (connection) => {
    const groups = [];
    const size = 100;
    const l = Array.from(accounts);
    while (l.length > 0) {
      groups.push(l.splice(0, size));
    }

    await connection.query(sql`
      create temporary table new_account_id (account_id text)
    `);

    for (const group of groups) {
      await connection.query(sql`
        insert into new_account_id
          values (
            ${sql.join(group, sql`), (`)}
          )
      `);
    }

    await connection.query(sql`
      -- avoid uniqueness violation errors
      insert into account
        select account_id from new_account_id
        where not exists (
          select 1 from account t_b
          where t_b.account_id = new_account_id.account_id
        );

      drop table new_account_id;
    `);
  });
}

async function fileExists(...paths) {
  try {
    await Promise.all(paths.map((path) => fs.access(path)));
    return true;
  } catch (e) {
    return false;
  }
}

function writeLastUpdateBlockHeight(lastUpdateBlockHeight) {
  return cachePool.query(sql`
    -- single row table, so no where clause necessary
    update last_update set block_height = ${lastUpdateBlockHeight}
  `);
}

async function loadAccounts() {
  const cachedAccounts = await queryAllAccountsFromCache();
  const cachedLastUpdateBlockHeight =
    await queryLastUpdateBlockHeightFromCache();

  const { accounts: accountsToUpdate, lastUpdateBlockHeight } =
    await queryUpdatedAccountsFromIndexer(cachedLastUpdateBlockHeight);

  return {
    cachedAccounts,
    accountsToUpdate,
    lastUpdateBlockHeight,
  };
}

async function getAccountScore(account) {
  return await indexerPool.oneFirst(scoreSql({ account_id: account }));
}

async function getAccountBalance(account) {
  return await indexerPool.oneFirst(sql`
    select t_a.affected_account_nonstaked_balance as balance
    from account_changes t_a
    left outer join account_changes t_b on t_a.affected_account_id = t_b.affected_account_id
    and t_a.changed_in_block_timestamp < t_b.changed_in_block_timestamp
    where t_b.affected_account_id is null
      and t_a.affected_account_id = ${account}
      limit 1
  `);
  // const req = await axios({
  //   method: 'post',
  //   baseURL: rpcEndpoint,
  //   data: {
  //     jsonrpc: '2.0',
  //     id: '0',
  //     method: 'query',
  //     params: {
  //       request_type: 'view_account',
  //       finality: 'final',
  //       account_id: account,
  //     },
  //   },
  // });

  // if (req.data.result) {
  //   return req.data.result.amount + '';
  // } else {
  //   throw new Error(
  //     `Could not fetch balance for "${account}": ${req.data.error}`,
  //   );
  // }
}

async function queryBalancesFromIndexerAndUpdate(accounts) {
  const maxSimultaneousRequests = 10;

  const balances = new Map();

  let group = [];
  for (let i = 0; i < accounts.length; i++) {
    if (group.length >= maxSimultaneousRequests) {
      console.log('group', i / maxSimultaneousRequests);

      await Promise.all(
        group.map(async (account) => {
          try {
            const [balance, score] = await Promise.all([
              getAccountBalance(account),
              getAccountScore(account),
            ]);
            await writeBalanceAndScore(account, balance, score);
            console.log('wrote balance and score for', account);
            balances.set(account, balance);
          } catch (e) {
            // oh well
            console.log('Unable to query and write balance for ', account, e);
          }
        }),
      );

      // be nice
      // await sleep(100);

      group = [];
    }

    group.push(accounts[i]);
  }

  // await Promise.all(
  //   accounts.map((account) => {
  //     const balance = await getAccountBalance(account);
  //     balances.set(account, balance);
  //   }),
  // );

  return balances;
}

/** @type {() => Promise<string[]>} */
async function queryAccountsWithNullsFromCache() {
  return cachePool.manyFirst(sql`
    select account_id from account
      where balance is null
        or score is null
  `);
}

function writeBalance(account, balance) {
  return cachePool.query(sql`
    update account
      set balance = ${balance}
      where account_id = ${account}
  `);
}

function writeScore(account, score) {
  return cachePool.query(sql`
    update account
      set score = ${score}
      where account_id = ${account}
  `);
}

function writeBalanceAndScore(account, balance, score) {
  return cachePool.query(sql`
    update account
      set score = ${score},
        balance = ${balance}
      where account_id = ${account}
  `);
}

function writeBalances(/** @type {Map<string, string>} */ balances) {
  for (const [account, balance] in balances.entries()) {
    writeBalance(account, balance);
  }
}

async function update () {
  console.log('loading accounts...');
  const { cachedAccounts, accountsToUpdate, lastUpdateBlockHeight } =
    await loadAccounts();
  console.log('done loading accounts');

  // We don't much care to wait for these async functions to complete
  console.log('writing account ids...');
  await writeAccountIds(accountsToUpdate);
  console.log('done writing account ids');
  writeLastUpdateBlockHeight(lastUpdateBlockHeight);

  const accountsWithNull = await queryAccountsWithNullsFromCache();

  console.log('querying & writing balances...');
  const balances = await queryBalancesFromIndexerAndUpdate(
    accountsWithNull.concat(accountsToUpdate),
  );
  console.log('done querying & writing balances');
};

function getTopAccountsByBalance() {
  return cachePool.many(sql`
    select account_id, balance::text, score
    from account
    where balance is not null and score is not null
      and account_id not like '%.lockup.near'
      and account_id not like '%.poolv1.near'
    order by account.balance desc
    limit 20
  `);
}

function getTopAccountsByScore() {
  return cachePool.many(sql`
    select account_id, balance::text, score
    from account
    where balance is not null and score is not null
      and account_id not like '%.lockup.near'
      and account_id not like '%.poolv1.near'
    order by account.score desc
    limit 20
  `);
}

process.on('exit', async () => {
  await Promise.all([
    indexerPool.end(),
    cachePool.end(),
  ]);
});

if (require.main === module) {
  update();
} else {
  module.exports = {
    update,
    getTopAccountsByBalance,
    getTopAccountsByScore,
  };
}
