// Set env vars before any Lambda module is loaded.
process.env.EMAIL_TOKENS_TABLE = 'test-tokens';
process.env.SES_FROM_ADDRESS = 'no-reply@test.com';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.APP_URL = 'https://app.test.com';
process.env.ACCOUNTS_TABLE = 'test-accounts';
process.env.ACCOUNTS_EMAIL_INDEX = 'email-index';