const { sql } = require('slonik');

module.exports = params => {
  return sql`
    select coalesce(sum(
      case
        when a.action_kind = 'TRANSFER' and signer_account_id = ${params.account_id} then 10
        when a.action_kind = 'TRANSFER' and receiver_account_id = ${params.account_id} then 2
        when a.action_kind = 'CREATE_ACCOUNT' then 50
        when a.action_kind = 'FUNCTION_CALL' then 10
        when a.action_kind = 'DEPLOY_CONTRACT' then 100
        else 0
      end
    ), 0) as result from
      (select action_kind, signer_account_id, tx.receiver_account_id from
        (select signer_account_id, receiver_account_id, transaction_hash, converted_into_receipt_id
          from transactions
          where (transactions.signer_account_id = ${params.account_id}
          or transactions.receiver_account_id = ${params.account_id})
        ) tx
        inner join receipts on tx.converted_into_receipt_id = receipts.receipt_id
        left outer join transaction_actions on tx.transaction_hash = transaction_actions.transaction_hash
      ) a
  `;
};
