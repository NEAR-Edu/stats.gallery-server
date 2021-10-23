import { sql } from 'slonik';

export default () => {
  const currentDate = new Date();
  const today = currentDate.getDate();
  const dayOfTheWeek = currentDate.getDay();
  const blockchain_timestamp_precision = 1000000; // miliseconds to nanoseconds

  const startOfWeek = new Date().setDate(today - (dayOfTheWeek || 7));
  const startOfWeekTimeStamp = new Date(startOfWeek).getTime() * blockchain_timestamp_precision;
  const currentDateTimeStamp = currentDate.getTime() * blockchain_timestamp_precision;

  return sql`
    select
      signer_account_id as account_id,
      count(1) as number_of_transactions
    from
      transactions 
    where 
      block_timestamp >= ${startOfWeekTimeStamp}
      and block_timestamp <= ${currentDateTimeStamp}
    group by
      signer_account_id
    order by number_of_transactions desc
    -- currently, we limit this to only the top 5 but once new requirements come in, this should be revisited
    -- another reason why we hardcode this is to prevent curious people from overworking the mainnet explorer database and bring it down
    limit 5
  `;
}
