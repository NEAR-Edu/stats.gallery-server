alter table account_badge add constraint account_badge_badge_group_account_idx unique (badge_group_id, account_id);
