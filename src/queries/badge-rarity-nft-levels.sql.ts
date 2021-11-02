import { sql } from 'slonik';

export default (count: number) => {
  return sql`
    select count(*)
    from
        (select 1
        from ACTION_RECEIPT_ACTIONS
            where ACTION_KIND = 'FUNCTION_CALL'
                and args ->> 'method_name' = 'nft_transfer'
            group by args -> 'args_json' ->> 'receiver_id'
            having count(1) >= ${count}) s;
  `;
}