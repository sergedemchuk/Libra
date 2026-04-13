/**
 * Email Lambda — handles SES sending for reset, 2FA, admin notifications.
 *
 * Routes (all via POST /email, action in body):
 *   action: 'forgot-password' → email reset link (30-min TTL token in DDB)
 *   action: 'send-2fa'        → email 6-digit code (10-min TTL)
 *   action: 'verify-2fa'      → check code
 *   action: 'notify-admin'    → email admin about account-DB changes
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomBytes, randomInt } from 'crypto';

const ses = new SESv2Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const FROM                 = process.env.SES_FROM_ADDRESS!;
const ADMIN_EMAIL          = process.env.ADMIN_EMAIL!;
const ACCOUNTS_TABLE       = process.env.ACCOUNTS_TABLE!;
const ACCOUNTS_EMAIL_INDEX = process.env.ACCOUNTS_EMAIL_INDEX ?? 'email-index';
const TOKENS_TABLE         = process.env.EMAIL_TOKENS_TABLE!;
const APP_URL              = process.env.APP_URL ?? 'http://localhost:3000';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
const ok  = (b: object) => ({ statusCode: 200, headers: cors, body: JSON.stringify(b) });
const bad = (m: string, s = 400) => ({ statusCode: s, headers: cors, body: JSON.stringify({ error: m }) });

/** Look up an account by email via the GSI. */
async function userExists(email: string): Promise<boolean> {
  const r = await ddb.send(new QueryCommand({
    TableName: ACCOUNTS_TABLE,
    IndexName: ACCOUNTS_EMAIL_INDEX,
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email.toLowerCase().trim() },
    Limit: 1,
  }));
  return (r.Count ?? 0) > 0;
}

async function sendMail(to: string, subject: string, html: string, text: string) {
  await ses.send(new SendEmailCommand({
    FromEmailAddress: FROM,
    Destination: { ToAddresses: [to] },
    Content: { Simple: {
      Subject: { Data: subject },
      Body: { Html: { Data: html }, Text: { Data: text } },
    }},
  }));
}

async function forgotPassword(email: string) {
  // Always return 200 (prevents email enumeration). Only send if user exists.
  if (await userExists(email)) {
    const token = randomBytes(32).toString('hex');
    const ttl = Math.floor(Date.now() / 1000) + 60 * 30;
    await ddb.send(new PutCommand({
      TableName: TOKENS_TABLE,
      Item: { token, email, kind: 'reset', ttl },
    }));
    const link = `${APP_URL}/reset?token=${token}`;
    await sendMail(email, 'Libra — Password reset',
      `<p>Click to reset your password (valid 30 min):</p><p><a href="${link}">${link}</a></p>`,
      `Reset link (valid 30 min): ${link}`);
  }
  return ok({ message: 'If that account exists, a reset link has been sent.' });
}

async function send2FA(email: string) {
  if (!(await userExists(email))) return bad('Account not found', 404);
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const ttl = Math.floor(Date.now() / 1000) + 60 * 10;
  await ddb.send(new PutCommand({
    TableName: TOKENS_TABLE,
    Item: { token: `2fa:${email}`, email, code, kind: '2fa', ttl },
  }));
  await sendMail(email, 'Libra — Your verification code',
    `<p>Your code is <strong style="font-size:24px">${code}</strong> (valid 10 min).</p>`,
    `Your Libra verification code is ${code} (valid 10 min).`);
  return ok({ message: 'Code sent' });
}

async function verify2FA(email: string, code: string) {
  const r = await ddb.send(new GetCommand({
    TableName: TOKENS_TABLE, Key: { token: `2fa:${email}` },
  }));
  if (!r.Item || r.Item.code !== code) return bad('Invalid or expired code', 401);
  if (r.Item.ttl < Math.floor(Date.now() / 1000)) return bad('Code expired', 401);
  return ok({ verified: true });
}

async function notifyAdmin(actor: string, change: string, details?: string) {
  const subj = `Libra — Account DB change by ${actor}`;
  const html = `<p><strong>Actor:</strong> ${actor}</p>
                <p><strong>Change:</strong> ${change}</p>
                ${details ? `<pre>${details}</pre>` : ''}
                <p><em>Sent ${new Date().toISOString()}</em></p>`;
  await sendMail(ADMIN_EMAIL, subj, html, `${actor} performed: ${change}\n${details ?? ''}`);
  return ok({ message: 'Admin notified' });
}

export const handler = async (e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (e.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  try {
    const body = JSON.parse(e.body ?? '{}');
    switch (body.action) {
      case 'forgot-password': return await forgotPassword(body.email);
      case 'send-2fa':        return await send2FA(body.email);
      case 'verify-2fa':      return await verify2FA(body.email, body.code);
      case 'notify-admin':    return await notifyAdmin(body.actor, body.change, body.details);
      default: return bad('Unknown action');
    }
  } catch (err) {
    console.error(err);
    return bad('Internal error', 500);
  }
};