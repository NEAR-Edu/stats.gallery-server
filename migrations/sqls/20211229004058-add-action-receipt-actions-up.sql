create type action_kind as enum (
    'CREATE_ACCOUNT',
    'DEPLOY_CONTRACT',
    'FUNCTION_CALL',
    'TRANSFER',
    'STAKE',
    'ADD_KEY',
    'DELETE_KEY',
    'DELETE_ACCOUNT'
);

create table action_receipt_action
(
    receipt_id                          text        not null,
    index_in_action_receipt             integer     not null,
    action_kind                         action_kind not null,
    args                                jsonb       not null,
    receipt_predecessor_account_id      text        not null,
    receipt_receiver_account_id         text        not null,
    receipt_included_in_block_timestamp numeric(20) not null    
);

create index action_receipt_action_receipt_included_in_block_timestamp_idx
    on action_receipt_action (receipt_included_in_block_timestamp);

create index action_receipt_action_args_function_call_idx
    on action_receipt_action ((args ->> 'method_name'::text))
    where (action_kind = 'FUNCTION_CALL'::action_kind);

create index action_receipt_action_args_amount_idx
    on action_receipt_action (((args -> 'args_json'::text) ->> 'amount'::text))
    where ((action_kind = 'FUNCTION_CALL'::action_kind) AND ((args ->> 'args_json'::text) IS NOT NULL));

create index action_receipt_action_args_receiver_id_idx
    on action_receipt_action (((args -> 'args_json'::text) ->> 'receiver_id'::text))
    where ((action_kind = 'FUNCTION_CALL'::action_kind) AND ((args ->> 'args_json'::text) IS NOT NULL));

create index action_receipt_actions_receipt_receiver_account_id_idx
    on action_receipt_action (receipt_receiver_account_id);

create index action_receipt_actions_action_kind_idx
    on action_receipt_action (action_kind);
