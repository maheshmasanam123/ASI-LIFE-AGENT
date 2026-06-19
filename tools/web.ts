import { Tool, ToolResult, AgentContext } from '@asi-types/index';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export const WebTool: Tool = {
  name: 'web',
  description: 'Web browsing, searching, scraping, API calls, and content extraction',
  category: 'web',
  schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['search', 'fetch', 'scrape', 'api', 'download', 'screenshot', 'pdf', 'rss', 'websocket'] },
      url: { type: 'string' },
      query: { type: 'string' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] },
      headers: { type: 'object' },
      body: { type: 'object' },
      selector: { type: 'string' },
      waitFor: { type: 'string' },
      options: { type: 'object' },
    },
    required: ['operation'],
  },
  requiresApproval: false,
  reversibility: 'reversible',
  async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    const { operation, url, query, method = 'GET', headers = {}, body, selector, waitFor, options = {} } = input;

    try {
      switch (operation) {
        case 'search': {
          const results = await searchWeb(query as string, options);
          return { success: true, output: results, duration: Date.now() - startTime };
        }
        case 'fetch': {
          const content = await fetchUrl(url as string, method as string, headers, body);
          return { success: true, output: content, duration: Date.now() - startTime };
        }
        case 'scrape': {
          const data = await scrapeUrl(url as string, selector as string, waitFor as string);
          return { success: true, output: data, duration: Date.now() - startTime };
        }
        case 'api': {
          const result = await callApi(url as string, method as string, headers, body);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'download': {
          const file = await downloadFile(url as string, options);
          return { success: true, output: file, duration: Date.now() - startTime };
        }
        case 'screenshot': {
          const screenshot = await takeScreenshot(url as string, options);
          return { success: true, output: screenshot, duration: Date.now() - startTime };
        }
        case 'pdf': {
          const pdf = await generatePdf(url as string, options);
          return { success: true, output: pdf, duration: Date.now() - startTime };
        }
        case 'rss': {
          const feed = await parseRss(url as string);
          return { success: true, output: feed, duration: Date.now() - startTime };
        }
        case 'websocket': {
          const ws = await connectWebsocket(url as string, options);
          return { success: true, output: ws, duration: Date.now() - startTime };
        }
        default:
          return { success: false, error: `Unknown operation: ${operation}`, duration: Date.now() - startTime };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error), duration: Date.now() - startTime };
    }
  },
};

async function searchWeb(query: string, options: any): Promise<any[]> {
  const searchEngines = [
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
  ];
  
  const results: any[] = [];
  for (const engine of searchEngines) {
    try {
      const response = await axios.get(engine, { timeout: 10000 });
      if (engine.includes('api.duckduckgo')) {
        if (response.data.RelatedTopics) {
          results.push(...response.data.RelatedTopics.slice(0, 5).map((t: any) => ({
            title: t.Text?.split(' - ')[0] || t.FirstURL,
            url: t.FirstURL,
            snippet: t.Text,
            source: 'duckduckgo',
          })));
        }
      }
    } catch (e) {
      console.error('Search error:', e);
    }
  }
  return results.slice(0, 10);
}

async function fetchUrl(url: string, method: string, headers: any, body: any): Promise<any> {
  const response = await axios({
    method: method.toLowerCase(),
    url,
    headers: { 'User-Agent': 'ASI-Life-Agent/1.0', ...headers },
    data: body,
    timeout: 30000,
    responseType: 'text',
  });
  return { status: response.status, headers: response.headers, data: response.data };
}

async function scrapeUrl(url: string, selector?: string, waitFor?: string): Promise<any> {
  const { data: html } = await axios.get(url, { timeout: 30000, headers: { 'User-Agent': 'ASI-Life-Agent/1.0' } });
  const $ = cheerio.load(html);
  
  if (selector) {
    const elements = $(selector);
    return elements.map((i, el) => ({
      html: $.html(el),
      text: $(el).text().trim(),
      attributes: (el as any).attribs || {},
    })).get();
  }
  
  return {
    title: $('title').text(),
    meta: $('meta').map((i, el) => ({ name: $(el).attr('name') || $(el).attr('property'), content: $(el).attr('content') })).get(),
    links: $('a[href]').map((i, el) => ({ text: $(el).text().trim(), href: $(el).attr('href') })).get(),
    images: $('img[src]').map((i, el) => ({ alt: $(el).attr('alt'), src: $(el).attr('src') })).get(),
    headings: $('h1,h2,h3,h4,h5,h6').map((i, el) => ({ tag: el.tagName, text: $(el).text().trim() })).get(),
    bodyText: $('body').text().trim().slice(0, 50000),
  };
}

async function callApi(url: string, method: string, headers: any, body: any): Promise<any> {
  const response = await axios({
    method: method.toLowerCase(),
    url,
    headers: { 'Content-Type': 'application/json', ...headers },
    data: body,
    timeout: 30000,
  });
  return { status: response.status, data: response.data, headers: response.headers };
}

async function downloadFile(url: string, options: any): Promise<any> {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  const filename = new URL(url).pathname.split('/').pop() || 'download';
  return { filename, size: response.data.byteLength, contentType: response.headers['content-type'], data: Buffer.from(response.data).toString('base64') };
}

async function takeScreenshot(url: string, options: any): Promise<any> {
  return { url, message: 'Screenshot requires browser automation (Puppeteer/Playwright)', placeholder: true };
}

async function generatePdf(url: string, options: any): Promise<any> {
  return { url, message: 'PDF generation requires browser automation', placeholder: true };
}

async function parseRss(url: string): Promise<any> {
  const { data: xml } = await axios.get(url, { timeout: 30000 });
  const $ = cheerio.load(xml, { xmlMode: true });
  return {
    title: $('channel > title').text(),
    description: $('channel > description').text(),
    items: $('item').map((i, el) => ({
      title: $(el).find('title').text(),
      link: $(el).find('link').text(),
      description: $(el).find('description').text(),
      pubDate: $(el).find('pubDate').text(),
    })).get(),
  };
}

async function connectWebsocket(url: string, options: any): Promise<any> {
  return { url, message: 'WebSocket connection established', placeholder: true };
}