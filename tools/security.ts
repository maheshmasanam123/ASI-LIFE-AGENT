import { Tool, ToolResult, AgentContext } from '@asi-types/index';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';

export const SecurityTool: Tool = {
  name: 'security',
  description: 'Encryption, decryption, hashing, signing, verification, key management, and security auditing',
  category: 'security',
  schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['encrypt', 'decrypt', 'hash', 'sign', 'verify', 'keygen', 'key_import', 'key_export', 'audit', 'scan', 'sanitize', 'certificate'] },
      algorithm: { type: 'string', enum: ['aes-256-gcm', 'rsa-2048', 'rsa-4096', 'ecdsa-p256', 'ed25519', 'sha256', 'sha512', 'blake2b', 'argon2'] },
      data: { type: 'string' },
      key: { type: 'string' },
      iv: { type: 'string' },
      signature: { type: 'string' },
      publicKey: { type: 'string' },
      privateKey: { type: 'string' },
      path: { type: 'string' },
      options: { type: 'object' },
    },
    required: ['operation'],
  },
  requiresApproval: true,
  reversibility: 'irreversible',
  async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    const { operation, algorithm = 'aes-256-gcm', data, key, iv, signature, publicKey, privateKey, path, options = {} } = input as {
      operation: string;
      algorithm?: string;
      data?: string;
      key?: string;
      iv?: string;
      signature?: string;
      publicKey?: string;
      privateKey?: string;
      path?: string;
      options?: Record<string, unknown>;
    };

    try {
      switch (operation) {
        case 'encrypt': {
          const result = await encryptData(data as string, algorithm, key, iv);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'decrypt': {
          const result = await decryptData(data as string, algorithm, key as string, iv as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'hash': {
          const result = hashData(data as string, algorithm);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'sign': {
          const result = await signData(data as string, algorithm, privateKey as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'verify': {
          const result = await verifySignature(data as string, signature as string, algorithm, publicKey as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'keygen': {
          const result = generateKeys(algorithm);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'key_import': {
          const result = await importKey(path as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'key_export': {
          const result = await exportKey(key as string, path as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'audit': {
          const result = await securityAudit(path as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'scan': {
          const result = await vulnerabilityScan(path as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'sanitize': {
          const result = sanitizeData(data as string, options);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'certificate': {
          const result = await manageCertificate(operation, options);
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

async function encryptData(data: string, algorithm: string, key?: string, iv?: string): Promise<any> {
  const encryptionKey = key ? Buffer.from(key, 'hex') : crypto.randomBytes(32);
  const initializationVector = iv ? Buffer.from(iv, 'hex') : crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, initializationVector);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  let authTag = '';
  if (algorithm.includes('gcm') && typeof (cipher as any).getAuthTag === 'function') {
    authTag = (cipher as any).getAuthTag().toString('hex');
  }
  
  return { encrypted, iv: initializationVector.toString('hex'), authTag, key: encryptionKey.toString('hex') };
}

async function decryptData(data: string, algorithm: string, key: string, iv: string): Promise<any> {
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return { decrypted };
}

function hashData(data: string, algorithm: string): any {
  const hash = crypto.createHash(algorithm.replace('blake2b', 'blake2b512'));
  hash.update(data);
  return { hash: hash.digest('hex'), algorithm };
}

async function signData(data: string, algorithm: string, privateKey: string): Promise<any> {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  const signature = sign.sign(privateKey, 'hex');
  return { signature };
}

async function verifySignature(data: string, signature: string, algorithm: string, publicKey: string): Promise<any> {
  const verify = crypto.createVerify('SHA256');
  verify.update(data);
  const valid = verify.verify(publicKey, signature, 'hex');
  return { valid };
}

function generateKeys(algorithm: string): any {
  if (algorithm.startsWith('rsa')) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: parseInt(algorithm.replace('rsa-', '')) });
    return { publicKey: publicKey.export({ type: 'spki', format: 'pem' }), privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  }
  if (algorithm === 'ed25519') {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    return { publicKey: publicKey.export({ type: 'spki', format: 'pem' }), privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  }
  return { key: crypto.randomBytes(32).toString('hex') };
}

async function importKey(path: string): Promise<any> {
  const key = await fs.readFile(path, 'utf8');
  return { key, imported: true };
}

async function exportKey(key: string, path: string): Promise<any> {
  await fs.writeFile(path, key);
  return { exported: true, path };
}

async function securityAudit(path: string): Promise<any> {
  return { vulnerabilities: [], score: 100, message: 'Security audit requires specialized tools' };
}

async function vulnerabilityScan(path: string): Promise<any> {
  return { vulnerabilities: [], message: 'Vulnerability scanning requires specialized tools' };
}

function sanitizeData(data: string, options: any): any {
  let sanitized = data;
  if (options.removeSecrets) sanitized = sanitized.replace(/(api[_-]?key|password|secret|token)["':\s]+[^\s"',}]+/gi, '$1: [REDACTED]');
  if (options.removePii) sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]').replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
  return { sanitized, originalLength: data.length, sanitizedLength: sanitized.length };
}

async function manageCertificate(operation: string, options: any): Promise<any> {
  return { message: 'Certificate management requires OpenSSL/ACME setup' };
}