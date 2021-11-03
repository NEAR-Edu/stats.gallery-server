import { sql } from 'slonik';

export default () => {
  return sql`
    select count(*)
    from
        (select 1
        from action_receipt_actions
          where action_kind = 'TRANSFER'
          group by receipt_predecessor_account_id) s;
  `;
}