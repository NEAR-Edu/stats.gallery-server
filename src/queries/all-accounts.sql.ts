import { sql } from 'slonik';

export default () => {
  return sql`
    select count(*) as result
    from accounts
    where deleted_by_receipt_id is null
  `;
};
