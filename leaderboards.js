const fs = require('fs/promises');
const { createPool, sql } = require('slonik');
const scoreSql = require('./queries/score.sql');

class LeaderboardCache {
  constructor(cachePoolConnectionString, indexerPoolConnectionString) {
    // this.cachePool = createPool('postgres://postgres@127.0.0.1/test_cache');
    this.cachePool = createPool(cachePoolConnectionString);

    this.indexerPool = createPool(
      // 'postgres://public_readonly:nearprotocol@104.199.89.51/mainnet_explorer',
      indexerPoolConnectionString,
    );

    process.on('exit', async () => {
      await Promise.all([this.indexerPool.end(), this.cachePool.end()]);
    });
  }

  async queryUpdatedAccountsFromIndexer(sinceBlockHeight) {
    const queryResult = await this.indexerPool.many(sql`
      select account_id,
        last_update_block_height
      from accounts
      where deleted_by_receipt_id is null
      and last_update_block_height >= ${sinceBlockHeight}
    `);

    const accounts = [];
    let lastUpdateBlockHeight = 0;

    for (const record of queryResult) {
      accounts.push(record.account_id + '');
      if (record.last_update_block_height > lastUpdateBlockHeight) {
        lastUpdateBlockHeight = record.last_update_block_height;
      }
    }

    return { accounts, lastUpdateBlockHeight };
  }

  async queryAllAccountsFromIndexer() {
    const queryResult = await this.indexerPool.many(sql`
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
  queryAllAccountsFromCache() {
    return this.cachePool.many(sql`
      select * from account
    `);
  }

  /** @type {() => Promise<number>} */
  queryLastUpdateBlockHeightFromCache() {
    return this.cachePool.oneFirst(sql`
      select block_height from last_update
    `);
  }

  writeAccountIds(accounts) {
    return this.cachePool.connect(async (connection) => {
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

  async fileExists(...paths) {
    try {
      await Promise.all(paths.map((path) => fs.access(path)));
      return true;
    } catch (e) {
      return false;
    }
  }

  writeLastUpdateBlockHeight(lastUpdateBlockHeight) {
    return this.cachePool.query(sql`
      -- single row table, so no where clause necessary
      update last_update set block_height = ${lastUpdateBlockHeight}
    `);
  }

  async loadAccounts() {
    const cachedAccounts = await this.queryAllAccountsFromCache();
    const cachedLastUpdateBlockHeight =
      await this.queryLastUpdateBlockHeightFromCache();

    const { accounts: accountsToUpdate, lastUpdateBlockHeight } =
      await this.queryUpdatedAccountsFromIndexer(cachedLastUpdateBlockHeight);

    return {
      cachedAccounts,
      accountsToUpdate,
      lastUpdateBlockHeight,
    };
  }

  async getAccountScore(account) {
    return await this.indexerPool.oneFirst(scoreSql({ account_id: account }));
  }

  async getAccountBalance(account) {
    return await this.indexerPool.oneFirst(sql`
      select t_a.affected_account_nonstaked_balance as balance
      from account_changes t_a
      left outer join account_changes t_b on t_a.affected_account_id = t_b.affected_account_id
      and t_a.changed_in_block_timestamp < t_b.changed_in_block_timestamp
      where t_b.affected_account_id is null
        and t_a.affected_account_id = ${account}
        limit 1
    `);
  }

  async queryBalancesFromIndexerAndUpdate(accounts) {
    const maxSimultaneousRequests = 10;

    const balances = new Map();

    let group = [];
    for (let i = 0; i < accounts.length; i++) {
      if (i > 0 && i % 1000 === 0) {
        console.log('Leaderboard cache update', i);
      }

      if (group.length >= maxSimultaneousRequests) {
        // console.log('group', i / maxSimultaneousRequests);

        await Promise.all(
          group.map(async (account) => {
            try {
              const [balance, score] = await Promise.all([
                this.getAccountBalance(account),
                this.getAccountScore(account),
              ]);
              await this.writeBalanceAndScore(account, balance, score);
              // console.log('wrote balance and score for', account);
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

    return balances;
  }

  /** @type {() => Promise<string[]>} */
  async queryAccountsWithNullsFromCache() {
    return this.cachePool.manyFirst(sql`
      select account_id from account
        where balance is null
          or score is null
    `);
  }

  writeBalance(account, balance) {
    return this.cachePool.query(sql`
      update account
        set balance = ${balance}
        where account_id = ${account}
    `);
  }

  writeScore(account, score) {
    return this.cachePool.query(sql`
      update account
        set score = ${score}
        where account_id = ${account}
    `);
  }

  writeBalanceAndScore(account, balance, score) {
    return this.cachePool.query(sql`
      update account
        set score = ${score},
          balance = ${balance}
        where account_id = ${account}
    `);
  }

  writeBalances(/** @type {Map<string, string>} */ balances) {
    for (const [account, balance] in balances.entries()) {
      this.writeBalance(account, balance);
    }
  }

  async update() {
    console.log('Loading accounts...');
    const { cachedAccounts, accountsToUpdate, lastUpdateBlockHeight } =
      await this.loadAccounts();
    console.log('Done loading accounts');

    // We don't much care to wait for these async functions to complete
    console.log('Writing account ids...');
    await this.writeAccountIds(accountsToUpdate);
    console.log('Done writing account ids');
    this.writeLastUpdateBlockHeight(lastUpdateBlockHeight);

    const accountsWithNull = await this.queryAccountsWithNullsFromCache();

    console.log('Updates with nulls', accountsWithNull.length);
    console.log('Updates to new/stale accounts', accountsToUpdate.length);

    console.log('Querying & writing balances...');
    const balances = await this.queryBalancesFromIndexerAndUpdate(
      accountsWithNull.concat(accountsToUpdate),
    );
    console.log('Done querying & writing balances');
  }

  getTopAccountsByBalance() {
    return this.cachePool.many(sql`
      select account_id, balance::text, score
      from account
      where balance is not null and score is not null
        and account_id not like '%.lockup.near'
        and account_id not like '%.poolv1.near'
      order by account.balance desc
      limit 20
    `);
  }

  getTopAccountsByScore() {
    return this.cachePool.many(sql`
      select account_id, balance::text, score
      from account
      where balance is not null and score is not null
        and account_id not like '%.lockup.near'
        and account_id not like '%.poolv1.near'
      order by account.score desc
      limit 20
    `);
  }
}

module.exports = {
  LeaderboardCache,
};
