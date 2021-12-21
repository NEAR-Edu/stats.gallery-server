import { sql } from 'slonik';

export default ({
  method_name,
  account_id,
}: {
  method_name: string;
  account_id: string;
}) => {
  return sql`
    select args
    from action_receipt_actions ara
    join execution_outcomes eo on ara.receipt_id = eo.receipt_id
    where action_kind = 'FUNCTION_CALL'
      and receipt_receiver_account_id = ${account_id}
      and args->>'method_name' = ${method_name}
      and eo.status <> 'FAILURE'
    limit 1
  `;
};
