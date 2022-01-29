import { sql } from 'slonik';
import { TimestampRange } from './Params';

export default (range: TimestampRange, limit: number) => {
  const conditions = [];

  if (
    range.after_block_timestamp !== undefined &&
    range.after_block_timestamp > 0
  ) {
    conditions.push(
      sql`action_receipt_action.receipt_included_in_block_timestamp >= ${range.after_block_timestamp}`,
    );
  }

  if (
    range.before_block_timestamp !== undefined &&
    range.before_block_timestamp > 0
  ) {
    conditions.push(
      sql`action_receipt_action.receipt_included_in_block_timestamp <= ${range.before_block_timestamp}`,
    );
  }

  // Currently, we limit this to only the top few, but once new requirements
  // come in, this should be revisited. Another reason why we hardcode this
  // is to help dissuade curious people from overworking the indexer.
  return sql`
    select
      receipt_receiver_account_id as account_id,
      count(1) as number_of_transactions
    from
      action_receipt_action 
    where ${sql.join(conditions, sql` and `)}
      and action_kind = 'FUNCTION_CALL'
      and args ->> 'method_name' in (
        'nft_approve',
        'nft_approve_owner',
        'nft_batch_approve',
        'nft_batch_burn',
        'nft_batch_mint',
        'nft_batch_transfer',
        'nft_burn',
        'nft_buy',
        'nft_create_series',
        'nft_create_type',
        'nft_decrease_series_copies',
        'nft_metadata',
        'nft_mint',
        'nft_mint_and_approve',
        'nft_mint_many',
        'nft_mint_one',
        'nft_mints',
        'nft_mint_to',
        'nft_mint_type',
        'nft_on_approve',
        'nft_on_batch_approve',
        'nft_revoke',
        'nft_revoke_all',
        'nft_series_create',
        'nft_series_mint',
        'nft_set_series_price',
        'nft_tokens',
        'nft_tokens_for_owner',
        'nft_transfer',
        'nft_transfer_payout',
        'nft_transfer_unsafe'
      )
    group by
      receipt_receiver_account_id
    order by number_of_transactions desc
    limit ${limit}
  `;
};
