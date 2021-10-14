const { LeaderboardCache } = require('./leaderboards');

function Crons(spec) {
  const { environmentVariable, databaseCachePool, indexerCachePool } = spec;

  const leaderboardCache = new LeaderboardCache(
    databaseCachePool,
    indexerCachePool,
    environmentVariable,
  );

  return [leaderboardCache];
}

module.exports = Crons;
