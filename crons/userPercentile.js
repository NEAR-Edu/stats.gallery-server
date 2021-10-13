const getTotalAccountsNEARIndexer = require('../queries/all-accounts.sql');
const getTotalAccountsWithNFTTransfer = require('../queries/badge-nft-total');
const { sql } = require('slonik');

function UserPercentileCache(spec) {
  const {
    statsGalleryCachePool,
    blockChainCachePool
  } = spec;

  function isEnabled() {
    return true;
  }

  function cronName() {
    return 'USERPERCENTILECACHE';
  }

  function schedule() {
    return '*/10 * * * * *';  // every 10 minutes
  }

  async function upsertPercentileCache(percentileName, percentile) {
    const userPercentileExists = await statsGalleryCachePool.exists(sql`SELECT * FROM user_percentiles WHERE percentile_name = ${percentileName}`);

    if (userPercentileExists) {
      await statsGalleryCachePool.query(sql`
        UPDATE user_percentiles 
        SET percentile = ${percentile}
        WHERE percentile_name = ${percentileName}
      `);
    } else {
      await statsGalleryCachePool.query(sql`
        INSERT INTO user_percentiles (percentile_name, percentile) VALUES (${percentileName}, ${percentile});
      `);
    }
  }

  async function run() {
    const [totalAccounts, totalNFTTransfers] = await Promise.all([
      blockChainCachePool.oneFirst(getTotalAccountsNEARIndexer()),
      blockChainCachePool.oneFirst(getTotalAccountsWithNFTTransfer())
    ])

    await upsertPercentileCache('nft_transfer', totalNFTTransfers/totalAccounts);
  }

  return Object.freeze({
    run,
    schedule,
    isEnabled,
    cronName
  })
}

module.exports = UserPercentileCache;
