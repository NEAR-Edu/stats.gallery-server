import { QueryResultRow } from 'slonik';

export default (
  attainedValue: Number,
  badges: readonly QueryResultRow[],
): any[] => {
  const attainedBadges: any[] = [];
  for (const badge of badges) {
    const badgeInfo = {
      attained_value: attainedValue,
      badge_group_id: badge.badge_group_id?.toString(),
      badge_name: badge.badge_name,
      badge_description: badge.badge_description,
      required_value: badge.required_value,
      rarity_fraction: badge.rarity_fraction,
    }
    if (attainedValue >= Number(badge.required_value)) {
      attainedBadges.push({ ...badgeInfo, achieved: true});
    } else {
      attainedBadges.push({ ...badgeInfo, achieved: false});
    }
  }

  return attainedBadges;
};
