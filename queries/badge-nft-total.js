const { sql } = require('slonik');

module.exports = params => {
  return sql`
    SELECT COUNT(*)
    FROM
      (
        SELECT 1
        FROM ACTION_RECEIPT_ACTIONS
        WHERE ACTION_KIND = 'FUNCTION_CALL'
            AND ARGS ->> 'method_name' = 'nft_transfer'
        GROUP BY ARGS -> 'args_json' ->> 'receiver_id'
      ) S
  `;
};
