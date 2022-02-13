import { sql } from 'slonik';

export default (
  badgeGroupId: string,
  attainedValue: number,
  nearWalletId: string,
) => {
  return sql`
    insert
      into
    account_badge (badge_group_id, attained_value, account_id)
    values (${badgeGroupId}, ${attainedValue}, (select id from account where account_id = ${nearWalletId}))
    on conflict on constraint account_badge_badge_group_account_idx
    do
      update set attained_value = ${attainedValue}
  `;
};
