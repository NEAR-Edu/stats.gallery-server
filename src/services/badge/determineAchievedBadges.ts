import { QueryResultRow } from 'slonik';

const selectGroup = (badgeFunction: string): string => {
  return ((): string => {
    switch (badgeFunction) {
      case 'badge-nft':
        return 'nft';
      case 'badge-transfer':
        return 'transfer';
      case 'badge-stake':
        return 'stake';
      case 'badge-deploy':
        return 'contract';
      default:
        return '';
    }
  })();
};

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
      group: '',
      achieved: false,
    };
    if (attainedValue >= Number(badge.required_value)) {
      badgeInfo.achieved = true;
    }

    badgeInfo.group = selectGroup(badge?.function_name as string);

    attainedBadges.push(badgeInfo);
  }

  return attainedBadges;
};
