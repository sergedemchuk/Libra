// Set env vars before any Lambda module is loaded.
// Lambda modules read process.env at initialization time.
process.env.USER_ACCOUNTS_TABLE = 'test-user-accounts';
