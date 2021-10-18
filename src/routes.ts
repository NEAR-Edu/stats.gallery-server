import accessKeysSql from './queries/access-keys.sql';
import accountActivityDistributionSql from './queries/account-activity-distribution.sql';
import accountCreationSql from './queries/account-creation.sql';
import accountRelationStrengthSql from './queries/account-relation-strength.sql';
import actionsSql from './queries/actions.sql';
import allAccountsSql from './queries/all-accounts.sql';
import badgeDeploySql from './queries/badge-deploy.sql';
import badgeNftSql from './queries/badge-nft.sql';
import badgeStakeSql from './queries/badge-stake.sql';
import badgeTransferSql from './queries/badge-transfer.sql';
import leaderboardBalanceSql from './queries/cache/leaderboard-balance.sql';
import leaderboardScoreSql from './queries/cache/leaderboard-score.sql';
import distinctReceiversSql from './queries/distinct-receivers.sql';
import distinctSendersSql from './queries/distinct-senders.sql';
import gasSpentSql from './queries/gas-spent.sql';
import gasTokensSpentSql from './queries/gas-tokens-spent.sql';
import newAccountsCountSql from './queries/new-accounts-count.sql';
import newAccountsListSql from './queries/new-accounts-list.sql';
import receivedTransactionCountSql from './queries/received-transaction-count.sql';
import recentTransactionActionsSql from './queries/recent-transaction-actions.sql';
import scoreCalculateSql from './queries/score-calculate.sql';
import scoreFromCacheSql from './queries/score-from-cache.sql';
import sentTransactionCountSql from './queries/sent-transaction-count.sql';
import topAccountsSql from './queries/top-accounts.sql';
import totalReceivedSql from './queries/total-received.sql';
import totalSentSql from './queries/total-sent.sql';

const SECOND = 1000,
  MINUTE = 60 * SECOND,
  HOUR = 60 * MINUTE,
  DAY = 24 * HOUR;

export default [
  {
    path: 'access-keys',
    query: accessKeysSql,
  },
  {
    path: 'account-activity-distribution',
    query: accountActivityDistributionSql,
    poll: 3 * DAY,
    db: 'cache',
  },
  {
    path: 'account-creation',
    query: accountCreationSql,
  },
  {
    path: 'account-relation-strength',
    query: accountRelationStrengthSql,
  },
  {
    path: 'actions',
    query: actionsSql,
  },
  {
    path: 'all-accounts',
    query: allAccountsSql,
    poll: HOUR,
  },
  {
    path: 'badge-deploy',
    query: badgeDeploySql,
  },
  {
    path: 'badge-nft',
    query: badgeNftSql,
  },
  {
    path: 'badge-stake',
    query: badgeStakeSql,
  },
  {
    path: 'badge-transfer',
    query: badgeTransferSql,
  },
  {
    path: 'distinct-receivers',
    query: distinctReceiversSql,
  },
  {
    path: 'distinct-senders',
    query: distinctSendersSql,
  },
  {
    path: 'gas-spent',
    query: gasSpentSql,
  },
  {
    path: 'gas-tokens-spent',
    query: gasTokensSpentSql,
  },
  {
    path: 'new-accounts-count',
    query: newAccountsCountSql,
    poll: HOUR,
    db: 'cache',
  },
  {
    path: 'new-accounts-list',
    query: newAccountsListSql,
    poll: 10 * MINUTE,
    db: 'cache',
  },
  {
    path: 'received-transaction-count',
    query: receivedTransactionCountSql,
  },
  {
    path: 'recent-transaction-actions',
    query: recentTransactionActionsSql,
  },
  {
    path: 'score',
    query: scoreFromCacheSql,
    db: 'cache',
  },
  {
    path: 'score-calculate',
    query: scoreCalculateSql,
  },
  {
    path: 'sent-transaction-count',
    query: sentTransactionCountSql,
  },
  {
    path: 'top-accounts',
    query: topAccountsSql,
    poll: 6 * HOUR,
  },
  {
    path: 'total-received',
    query: totalReceivedSql,
  },
  {
    path: 'total-sent',
    query: totalSentSql,
  },

  // Leaderboards
  {
    path: 'leaderboard-balance',
    query: leaderboardBalanceSql,
    db: 'cache',
    poll: 1 * HOUR,
  },
  {
    path: 'leaderboard-score',
    query: leaderboardScoreSql,
    db: 'cache',
    poll: 1 * HOUR,
  },
];
