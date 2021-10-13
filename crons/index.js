const { LeaderboardCache } = require('./leaderboards');
const UserPercentileCache = require('./userPercentile');

function Crons(spec) {
  const { environmentVariable, databaseCachePool, indexerCachePool } = spec;

  const leaderboardCache = new LeaderboardCache(databaseCachePool, indexerCachePool, environmentVariable);
  const userPercentileCache = new UserPercentileCache({
    statsGalleryCachePool: databaseCachePool,
    blockChainCachePool: indexerCachePool
  })

  return [
    leaderboardCache,
    userPercentileCache
  ]
}

module.exports = Crons;
