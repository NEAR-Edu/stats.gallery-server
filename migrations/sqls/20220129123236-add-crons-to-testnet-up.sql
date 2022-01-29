update last_update set cron_name = 'MAINNET_TRANSACTIONS_CACHE' where cron_name = 'TRANSACTIONS_CACHE';
update last_update set cron_name = 'MAINNET_APP_ACTIONS_RECEIPT' where cron_name = 'APP_ACTIONS_RECEIPT';
update last_update set cron_name = 'MAINNET_ACCOUNTS_CACHE' where cron_name = 'ACCOUNTS_CACHE';