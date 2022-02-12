import { BadgeService } from './badgeService';
import { createPool, DatabasePool, sql, QueryResultRow } from 'slonik';
import { createClient } from 'redis';
import badgeTransferSql from '../../queries/badge-transfer.sql';

interface TransferBadgeSpec {
  dbConnectionString: string;
  statsGalleryConnectionString: string;
}

export default (spec: TransferBadgeSpec): BadgeService => {
  const serviceName = 'badge_nft_service';
  const cacheLayer = createClient({ url: process.env['REDIS_URL'] });
  let indexerPool: DatabasePool;
  let statsGalleryCache: DatabasePool;

  const init = async () => {
    await cacheLayer.connect();

    indexerPool = createPool(spec.dbConnectionString, {
      maximumPoolSize: 30,
      statementTimeout: 'DISABLE_TIMEOUT',
      connectionTimeout: 'DISABLE_TIMEOUT',
      idleTimeout: 'DISABLE_TIMEOUT',
      // this has to be set manually as there is a misleading error in the slonik package
      // saying this is unknown when this is not manually set
      idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT',
    });

    console.log(
      'Pool test:',
      spec.dbConnectionString,
      await indexerPool.one(sql`select 1 as should_be_1`),
    );

    statsGalleryCache = createPool(spec.statsGalleryConnectionString, {
      maximumPoolSize: 30,
      statementTimeout: 'DISABLE_TIMEOUT',
      connectionTimeout: 'DISABLE_TIMEOUT',
      idleTimeout: 'DISABLE_TIMEOUT',
      // this has to be set manually as there is a misleading error in the slonik package
      // saying this is unknown when this is not manually set
      idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT',
    });
  };

  const getAccountTokenTransfer = async (
    accountId: string,
    badgeNames: string[],
  ): Promise<readonly QueryResultRow[]> => {
    try {
      const result = await statsGalleryCache.many(
        sql`
        select
          account_badge.attained_value,
          badge.badge_name,
          badge.bagde_description,
          badge.required_value,
          badge.rarity_fraction,
          badge.badge_group_id
        from
          account_badge
        inner join
          badge
        on
          badge.badge_group_id = account_badge.badge_group_id
        inner join
          account
        on
          account.id = account_badge.account_id
        where
          account.account_id = ${accountId} and badge.badge_name in ${sql.join(
          badgeNames,
          sql`,`,
        )}`,
      );
      return result;
    } catch (error) {
      console.error(error);
      const empty: readonly QueryResultRow[] = [];
      return empty;
    }
  };

  const isBadgeAttained = async (accountId: string): Promise<boolean> => {
    const redisKey = serviceName + '_' + accountId;
    const cachedValue = await cacheLayer.get(redisKey);
    if (cachedValue !== null) {
      return cachedValue === 'true';
    }

    const transferBadges = await statsGalleryCache.query(sql`
      select
        badge.badge_name as badge_name,
        badge.required_level as level
      from
        badge
      inner join badge_group on badge.badge_group_id = badge_group.id
      where
        badge_group.function_name = 'badge-transfer'
      order by
        required_level asc;
    `);

    const badgeNames: string[] = [];
    transferBadges.rows.forEach(tb => {
      badgeNames.push(tb.badge_name as string);
    });

    const badgesAttained = await getAccountTokenTransfer(accountId, badgeNames);

    if (badgesAttained.length > 0) {
      await cacheLayer.set(redisKey, JSON.stringify(badgesAttained));

      return true;
    }

    const result = await indexerPool.one(
      badgeTransferSql({ account_id: accountId }),
    );

    const performedTransfer = Boolean(result.result);

    if (performedTransfer) {
      const attainedBadges = [];
      const valuesToInsert = [];
      for (const badge of transferBadges.rows) {
        const transfers = Number(result!.result) || 0;
        if (transfers >= Number(badge.level)) {
          attainedBadges.push({
            attained_value: transfers,
            badge_group_id: badge.badge_group_id,
            badge_name: badge.badge_name,
            bagde_description: badge.bagde_description,
            required_value: badge.required_value,
            rarity_fraction: badge.rarity_fraction,
          });

          valuesToInsert.push({
            badge_group_id: badge.badge_group_id,
            attained_value: transfers,
            account_id: accountId,
          });
        }
      }

      await statsGalleryCache.query(
        sql`insert into account_badge (badge_group_id, attained_value, account_id)
        select 
          *
        from ${sql.unnest(valuesToInsert as readonly any[], [
          'uuid',
          'numeric',
          'uuid',
        ])}`,
      );

      await cacheLayer.set(redisKey, JSON.stringify(attainedBadges), {
        EX: 86_400,
      });
    }

    // we set an expiration period for when the value we get is false as to give a chance
    // for redis to be replinished just in case the user completes the badge in the future
    await cacheLayer.set(redisKey, JSON.stringify({}), { EX: 600 });

    return performedTransfer;
  };

  return Object.freeze({
    IsBadgeAttained: isBadgeAttained,
    Init: init,
  });
};
