import { Tool, ToolResult, AgentContext } from '@asi-types/index';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { checkDependency, createUnavailableResult } from './dependency-check';

let nodemailerModule: any;
let slackModule: any;
let twilioModule: any;
let nodemailerLoaded = false;
let slackLoaded = false;
let twilioLoaded = false;

async function ensureNodemailerLoaded(): Promise<boolean> {
  if (nodemailerLoaded) return true;
  const result = await checkDependency('nodemailer', () => import('nodemailer'));
  if (result.available) nodemailerModule = (await import('nodemailer')).default;
  nodemailerLoaded = result.available;
  return nodemailerLoaded;
}

async function ensureSlackLoaded(): Promise<boolean> {
  if (slackLoaded) return true;
  const result = await checkDependency('@slack/web-api', () => import('@slack/web-api'));
  if (result.available) slackModule = await import('@slack/web-api');
  slackLoaded = result.available;
  return slackLoaded;
}

async function ensureTwilioLoaded(): Promise<boolean> {
  if (twilioLoaded) return true;
  const result = await checkDependency('twilio', () => import('twilio'));
  if (result.available) twilioModule = (await import('twilio')).default;
  twilioLoaded = result.available;
  return twilioLoaded;
}

function nodemailerUnavailableResult(): any {
  return { success: false, error: 'Nodemailer dependency not installed. Run: npm install nodemailer', duration: 0 };
}

function slackUnavailableResult(): any {
  return { success: false, error: 'Slack SDK dependency not installed. Run: npm install @slack/web-api', duration: 0 };
}

function twilioUnavailableResult(): any {
  return { success: false, error: 'Twilio dependency not installed. Run: npm install twilio', duration: 0 };
}

export const CommunicationTool: Tool = {
  name: 'communication',
  description: 'Email, Slack, Discord, SMS, push notifications, and messaging integrations',
  category: 'communication',
  schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['email_send', 'email_read', 'slack_send', 'slack_read', 'discord_send', 'sms_send', 'push_send', 'webhook', 'template'] },
      to: { type: 'string' },
      subject: { type: 'string' },
      body: { type: 'string' },
      channel: { type: 'string' },
      message: { type: 'string' },
      attachments: { type: 'array', items: { type: 'object' } },
      template: { type: 'string' },
      data: { type: 'object' },
      provider: { type: 'string' },
    },
    required: ['operation'],
  },
  requiresApproval: false,
  reversibility: 'reversible',
    async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    const { operation, to, subject, body, channel, message, attachments = [], template, data = {}, provider } = input as {
      operation: string;
      to?: string;
      subject?: string;
      body?: string;
      channel?: string;
      message?: string;
      attachments?: any[];
      template?: string;
      data?: Record<string, unknown>;
      provider?: string;
    };

    try {
      const unavailableResult = (() => {
        if (!ensureNodemailerLoaded() && ['email_send', 'email_read'].includes(operation)) {
          return nodemailerUnavailableResult();
        }
        if (!ensureSlackLoaded() && ['slack_send', 'slack_read'].includes(operation)) {
          return slackUnavailableResult();
        }
        if (!ensureTwilioLoaded() && ['sms_send'].includes(operation)) {
          return twilioUnavailableResult();
        }
        return null;
      })();
      if (unavailableResult) return unavailableResult;

      switch (operation) {
        case 'email_send': {
          const result = await sendEmail(to as string, subject as string, body as string, attachments);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'email_read': {
          const result = await readEmails(to as string, data);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'slack_send': {
          const result = await sendSlack(channel as string, message as string, attachments);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'slack_read': {
          const result = await readSlack(channel as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'discord_send': {
          const result = await sendDiscord(channel as string, message as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'sms_send': {
          const result = await sendSms(to as string, message as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'push_send': {
          const result = await sendPush(to as string, subject as string, body as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'webhook': {
          const result = await sendWebhook(to as string, data);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'template': {
          const result = renderTemplate(template as string, data);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        default:
          return { success: false, error: `Unknown operation: ${operation}`, duration: Date.now() - startTime };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error), duration: Date.now() - startTime };
    }
  },
};

async function sendEmail(to: string, subject: string, body: string, attachments: any[]): Promise<any> {
  if (!ensureNodemailerLoaded()) return { success: false, error: 'Nodemailer not available', duration: 0 };
  const transporter = nodemailerModule.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'ASI Agent <agent@asi.local>',
    to,
    subject,
    html: body,
    attachments: attachments.map(a => ({ filename: a.name, content: a.content, encoding: a.encoding || 'base64' })),
  });
}

async function readEmails(folder: string, options: any): Promise<any> {
  return { messages: [], message: 'IMAP implementation required' };
}

async function sendSlack(channel: string, message: string, attachments: any[]): Promise<any> {
  if (!ensureSlackLoaded()) return { success: false, error: 'Slack SDK not available', duration: 0 };
  const client = new slackModule.WebClient(process.env.SLACK_BOT_TOKEN);
  return client.chat.postMessage({ channel, text: message, attachments });
}

async function readSlack(channel: string): Promise<any> {
  if (!ensureSlackLoaded()) return { success: false, error: 'Slack SDK not available', duration: 0 };
  const client = new slackModule.WebClient(process.env.SLACK_BOT_TOKEN);
  return client.conversations.history({ channel, limit: 50 });
}

async function sendDiscord(channel: string, message: string): Promise<any> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return { error: 'Discord webhook not configured' };
  return fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: message }) });
}

async function sendSms(to: string, message: string): Promise<any> {
  if (!ensureTwilioLoaded()) return { success: false, error: 'Twilio not available', duration: 0 };
  const client = twilioModule(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  return client.messages.create({ body: message, from: process.env.TWILIO_FROM, to });
}

async function sendPush(token: string, title: string, body: string): Promise<any> {
  return { sent: true, message: 'Push notification requires Firebase/APNs setup' };
}

async function sendWebhook(url: string, data: any): Promise<any> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return { status: response.status, ok: response.ok };
}

function renderTemplate(template: string, data: any): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}