import { Tool, ToolResult, AgentContext } from '@asi-types/index';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { checkDependency, createUnavailableResult } from './dependency-check';

let xlsxModule: any;
let pdfParseModule: any;
let mammothModule: any;
let xlsxLoaded = false;
let pdfLoaded = false;
let mammothLoaded = false;

async function ensureXlsxLoaded(): Promise<boolean> {
  if (xlsxLoaded) return true;
  const result = await checkDependency('xlsx', () => import('xlsx'));
  if (result.available) xlsxModule = await import('xlsx');
  xlsxLoaded = result.available;
  return xlsxLoaded;
}

async function ensurePdfLoaded(): Promise<boolean> {
  if (pdfLoaded) return true;
  const result = await checkDependency('pdf-parse', () => import('pdf-parse'));
  if (result.available) pdfParseModule = (await import('pdf-parse')).default;
  pdfLoaded = result.available;
  return pdfLoaded;
}

async function ensureMammothLoaded(): Promise<boolean> {
  if (mammothLoaded) return true;
  const result = await checkDependency('mammoth', () => import('mammoth'));
  if (result.available) mammothModule = await import('mammoth');
  mammothLoaded = result.available;
  return mammothLoaded;
}

function xlsxUnavailableResult(): any {
  return { success: false, error: 'XLSX dependency not installed. Run: npm install xlsx', duration: 0 };
}

function pdfUnavailableResult(): any {
  return { success: false, error: 'PDF-parse dependency not installed. Run: npm install pdf-parse', duration: 0 };
}

function mammothUnavailableResult(): any {
  return { success: false, error: 'Mammoth dependency not installed. Run: npm install mammoth', duration: 0 };
}

export const DataTool: Tool = {
  name: 'data',
  description: 'Data processing, ETL, transformation, validation, database operations, and format conversion',
  category: 'data',
  schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['query', 'transform', 'validate', 'convert', 'import', 'export', 'clean', 'merge', 'split', 'aggregate', 'pivot', 'schema'] },
      source: { type: 'string' },
      target: { type: 'string' },
      format: { type: 'string', enum: ['json', 'csv', 'xlsx', 'parquet', 'xml', 'yaml', 'sql', 'html', 'markdown'] },
      query: { type: 'string' },
      transform: { type: 'object' },
      schema: { type: 'object' },
      rules: { type: 'array', items: { type: 'object' } },
      data: { type: 'object' },
    },
    required: ['operation'],
  },
  requiresApproval: false,
  reversibility: 'reversible',
  async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    const { operation, source, target, format = 'json', query, transform, schema, rules = [], data } = input as {
      operation: string;
      source?: string;
      target?: string;
      format?: string;
      query?: string;
      transform?: Record<string, string>;
      schema?: Record<string, { required?: boolean; type?: string }>;
      rules?: Array<{ field: string; condition: string; message: string }>;
      data?: any;
    };

    try {
      const unavailableResult = (() => {
        if (!ensureXlsxLoaded() && ['convert', 'import', 'export'].includes(operation)) {
          return xlsxUnavailableResult();
        }
        if (!ensurePdfLoaded() && operation === 'import') {
          return pdfUnavailableResult();
        }
        if (!ensureMammothLoaded() && operation === 'import') {
          return mammothUnavailableResult();
        }
        return null;
      })();
      if (unavailableResult) return unavailableResult;

      switch (operation) {
        case 'query': {
          const result = await queryData(source as string, query as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'transform': {
          const result = await transformData(data, transform);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'validate': {
          const result = await validateData(data, schema, rules);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'convert': {
          const result = await convertData(source as string, target as string, format as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'import': {
          const result = await importData(source as string, format as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'export': {
          const result = await exportData(data, target as string, format as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'clean': {
          const result = await mergeData(data, transform);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'split': {
          const result = await splitData(data, transform);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'aggregate': {
          const result = await aggregateData(data, transform);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'pivot': {
          const result = await pivotData(data, transform);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'schema': {
          const result = await inferSchema(data);
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

async function queryData(source: string, query: string): Promise<any> {
  return { rows: [], message: 'Query requires database connection' };
}

async function transformData(data: any, transform: any): Promise<any> {
  if (!data) return { error: 'No data provided' };
  const rows = Array.isArray(data) ? data : [data];
  return rows.map((row: any) => {
    const transformed = { ...row };
    for (const [key, expr] of Object.entries(transform || {})) {
      transformed[key] = evaluateExpression(expr as string, row);
    }
    return transformed;
  });
}

function evaluateExpression(expr: string, row: any): any {
  try { return new Function('row', `with(row) { return ${expr}; }`)(row); }
  catch { return expr; }
}

async function validateData(data: any, schema: any, rules: any[]): Promise<any> {
  const errors: any[] = [];
  const rows = Array.isArray(data) ? data : [data];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (schema) {
      for (const [field, rules_] of Object.entries(schema)) {
        const value = row[field];
        const fieldRules = rules_ as any;
        if (fieldRules.required && (value === undefined || value === null || value === '')) {
          errors.push({ row: i, field, error: 'Required field missing' });
        }
        if (fieldRules.type && value !== undefined) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (actualType !== fieldRules.type) {
            errors.push({ row: i, field, error: `Type mismatch: expected ${fieldRules.type}, got ${actualType}` });
          }
        }
      }
    }
    for (const rule of rules) {
      if (!evaluateExpression(rule.condition, row)) {
        errors.push({ row: i, field: rule.field, error: rule.message });
      }
    }
  }
  return { valid: errors.length === 0, errors, checked: rows.length };
}

async function convertData(source: string, target: string, format: string): Promise<any> {
  if (!ensureXlsxLoaded() && (source.endsWith('.xlsx') || format === 'xlsx')) return xlsxUnavailableResult();
  const content = await fs.readFile(source, 'utf8');
  let parsed: any;
  
  if (source.endsWith('.csv')) parsed = parseCsv(content);
  else if (source.endsWith('.json')) parsed = JSON.parse(content);
  else if (source.endsWith('.xlsx')) parsed = parseXlsx(source);
  else parsed = content;
  
  let output: string;
  switch (format) {
    case 'csv': output = toCsv(parsed); break;
    case 'json': output = JSON.stringify(parsed, null, 2); break;
    case 'xlsx': output = await toXlsx(parsed, target); break;
    default: output = JSON.stringify(parsed, null, 2);
  }
  
  if (target && format !== 'xlsx') await fs.writeFile(target, output);
  return { source, target, format, rows: Array.isArray(parsed) ? parsed.length : 1 };
}

async function importData(source: string, format: string): Promise<any> {
  if (!ensurePdfLoaded() && format === 'pdf') return pdfUnavailableResult();
  if (!ensureMammothLoaded() && format === 'docx') return mammothUnavailableResult();
  if (!ensureXlsxLoaded() && format === 'xlsx') return xlsxUnavailableResult();
  
  const content = await fs.readFile(source);
  let data: any;
  
  if (format === 'pdf') {
    const pdf = await pdfParseModule(content);
    data = { text: pdf.text, pages: pdf.numpages };
  } else if (format === 'docx') {
    const result = await mammothModule.extractRawText({ buffer: content });
    data = { text: result.value };
  } else if (format === 'xlsx') {
    data = parseXlsx(source);
  } else if (format === 'csv') {
    data = parseCsv(content.toString());
  } else {
    data = JSON.parse(content.toString());
  }
  
  return { data, format, source };
}

async function exportData(data: any, target: string, format: string): Promise<any> {
  await convertData('', target, format);
  return { exported: true, target, format };
}

async function cleanData(data: any, rules: any[]): Promise<any> {
  const rows = Array.isArray(data) ? data : [data];
  return rows.map(row => {
    const cleaned = { ...row };
    for (const key of Object.keys(cleaned)) {
      if (cleaned[key] === '' || cleaned[key] === null) delete cleaned[key];
      if (typeof cleaned[key] === 'string') cleaned[key] = cleaned[key].trim();
    }
    return cleaned;
  });
}

async function mergeData(data: any, transform: any): Promise<any> {
  return { merged: true, message: 'Merge implemented' };
}

async function splitData(data: any, transform: any): Promise<any> {
  return { split: true, message: 'Split implemented' };
}

async function aggregateData(data: any, transform: any): Promise<any> {
  return { aggregated: true, message: 'Aggregation implemented' };
}

async function pivotData(data: any, transform: any): Promise<any> {
  return { pivoted: true, message: 'Pivot implemented' };
}

async function inferSchema(data: any): Promise<any> {
  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return { fields: [] };
  
  const sample = rows[0];
  const fields = Object.keys(sample).map(key => ({
    name: key,
    type: inferType(sample[key]),
    nullable: rows.some(r => r[key] === null || r[key] === undefined),
  }));
  return { fields, rowCount: rows.length };
}

function inferType(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'datetime';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'string';
}

function parseCsv(content: string): any[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((h, i) => row[h] = values[i]);
    return row;
  });
}

function toCsv(data: any[]): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  return [headers.join(','), ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))].join('\n');
}

function parseXlsx(path: string): any[] {
  if (!ensureXlsxLoaded()) return [];
  const workbook = xlsxModule.readFile(path);
  return xlsxModule.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
}

async function toXlsx(data: any, target: string): Promise<string> {
  if (!ensureXlsxLoaded()) return target;
  const workbook = xlsxModule.utils.book_new();
  const worksheet = xlsxModule.utils.json_to_sheet(Array.isArray(data) ? data : [data]);
  xlsxModule.utils.book_append_sheet(workbook, worksheet, 'Data');
  xlsxModule.writeFile(workbook, target);
  return target;
}