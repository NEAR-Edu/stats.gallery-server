import { sql } from 'slonik';

export default (badgeFunction: string) => {
  return sql`
    select
      badge.badge_name as badge_name,
      badge.required_value,
      badge.badge_group_id,
      badge.badge_description,
      badge.rarity_fraction,
      badge_group.function_name
    from
      badge
    inner join badge_group on badge.badge_group_id = badge_group.id
    where
      badge_group.function_name = ${badgeFunction}
    order by
      required_value asc;
  `;
};
