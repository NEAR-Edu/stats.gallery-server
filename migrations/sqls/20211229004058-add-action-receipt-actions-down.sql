drop table action_receipt_action;
drop type action_kind;
delete from last_update where cron_name = 'APP_ACTIONS_RECEIPT';
