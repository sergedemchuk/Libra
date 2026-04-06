import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, ScanCommand, DeleteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({});
const USER_ACCOUNTS_TABLE = process.env.USER_ACCOUNTS_TABLE!;

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

function ok(body: object): APIGatewayProxyResult {
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function created(body: object): APIGatewayProxyResult {
  return { statusCode: 201, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function badRequest(message: string): APIGatewayProxyResult {
  return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: message }) };
}

function notFound(message: string): APIGatewayProxyResult {
  return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: message }) };
}

function unauthorized(message: string): APIGatewayProxyResult {
  return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: message }) };
}

function serverError(message: string): APIGatewayProxyResult {
  return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: message }) };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Accounts request:', JSON.stringify({ method: event.httpMethod, path: event.path }));

  if (event.httpMethod === 'OPTIONS') {
    return ok({ message: 'CORS preflight' });
  }

  try {
    const method = event.httpMethod;
    const userId = event.pathParameters?.userId;

    // POST /accounts/login
    if (method === 'POST' && event.path.endsWith('/login')) {
      return await handleLogin(event);
    }

    // POST /accounts — create account
    if (method === 'POST') {
      return await handleCreateAccount(event);
    }

    // GET /accounts — list all accounts
    if (method === 'GET' && !userId) {
      return await handleListAccounts();
    }

    // DELETE /accounts/{userId}
    if (method === 'DELETE' && userId) {
      return await handleDeleteAccount(userId);
    }

    // PUT /accounts/{userId}/password
    if (method === 'PUT' && event.path.endsWith('/password') && userId) {
      return await handleChangePassword(userId, event);
    }

    return badRequest('Route not found');
  } catch (err) {
    console.error('Accounts handler error:', err);
    return serverError('Internal server error');
  }
};

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleCreateAccount(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) return badRequest('Request body required');

  const { email, password } = JSON.parse(event.body);

  if (!email || typeof email !== 'string') return badRequest('email is required');
  if (!password || typeof password !== 'string') return badRequest('password is required');
  if (password.length < 8) return badRequest('password must be at least 8 characters');

  // Check email not already taken
  const existing = await queryByEmail(email);
  if (existing) return badRequest('An account with that email already exists');

  const userId = uuidv4();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, 10);

  await dynamoClient.send(new PutItemCommand({
    TableName: USER_ACCOUNTS_TABLE,
    Item: marshall({
      userId,
      email: email.toLowerCase().trim(),
      passwordHash,
      dateCreated: now,
      lastLogin: now,
    }),
    ConditionExpression: 'attribute_not_exists(userId)',
  }));

  return created({ userId, email, dateCreated: now });
}

async function handleListAccounts(): Promise<APIGatewayProxyResult> {
  const result = await dynamoClient.send(new ScanCommand({
    TableName: USER_ACCOUNTS_TABLE,
    ProjectionExpression: 'userId, email, dateCreated, lastLogin',
  }));

  const accounts = (result.Items ?? []).map(item => unmarshall(item));
  return ok({ accounts });
}

const PROTECTED_EMAIL = 'libradev@libra.com';

async function handleDeleteAccount(userId: string): Promise<APIGatewayProxyResult> {
  // Verify user exists first
  const result = await dynamoClient.send(new ScanCommand({
    TableName: USER_ACCOUNTS_TABLE,
    FilterExpression: 'userId = :uid',
    ExpressionAttributeValues: marshall({ ':uid': userId }),
    Limit: 1,
  }));

  if (!result.Items || result.Items.length === 0) {
    return notFound('Account not found');
  }

  const account = unmarshall(result.Items[0]);
  if (account.email === PROTECTED_EMAIL) {
    return badRequest('This account cannot be deleted');
  }

  await dynamoClient.send(new DeleteItemCommand({
    TableName: USER_ACCOUNTS_TABLE,
    Key: marshall({ userId }),
  }));

  return ok({ message: 'Account deleted' });
}

async function handleLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) return badRequest('Request body required');

  const { email, password } = JSON.parse(event.body);

  if (!email || !password) return badRequest('email and password are required');

  const user = await queryByEmail(email.toLowerCase().trim());
  if (!user) return unauthorized('Invalid email or password');

  const passwordMatch = await bcrypt.compare(password, user.passwordHash as string);
  if (!passwordMatch) return unauthorized('Invalid email or password');

  // Update lastLogin timestamp
  const now = new Date().toISOString();
  await dynamoClient.send(new PutItemCommand({
    TableName: USER_ACCOUNTS_TABLE,
    Item: marshall({ ...user, lastLogin: now }),
  }));

  return ok({
    userId: user.userId,
    email: user.email,
    dateCreated: user.dateCreated,
    lastLogin: now,
  });
}

async function handleChangePassword(userId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) return badRequest('Request body required');

  const { newPassword } = JSON.parse(event.body);

  if (!newPassword || typeof newPassword !== 'string') return badRequest('newPassword is required');
  if (newPassword.length < 8) return badRequest('newPassword must be at least 8 characters');

  // Fetch the existing account by scanning for userId
  const result = await dynamoClient.send(new ScanCommand({
    TableName: USER_ACCOUNTS_TABLE,
    FilterExpression: 'userId = :uid',
    ExpressionAttributeValues: marshall({ ':uid': userId }),
    Limit: 1,
  }));

  if (!result.Items || result.Items.length === 0) return notFound('Account not found');

  const user = unmarshall(result.Items[0]);
  const passwordHash = await bcrypt.hash(newPassword, 10);

  await dynamoClient.send(new PutItemCommand({
    TableName: USER_ACCOUNTS_TABLE,
    Item: marshall({ ...user, passwordHash }),
  }));

  return ok({ message: 'Password updated' });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function queryByEmail(email: string): Promise<Record<string, unknown> | null> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: USER_ACCOUNTS_TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: marshall({ ':email': email.toLowerCase().trim() }),
    Limit: 1,
  }));

  if (!result.Items || result.Items.length === 0) return null;
  return unmarshall(result.Items[0]);
}
