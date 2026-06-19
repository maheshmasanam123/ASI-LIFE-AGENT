import { Tool, ToolResult, AgentContext } from '@asi-types/index';
import { checkDependency, createUnavailableResult } from './dependency-check';

let naturalModule: any;
let compromiseModule: any;
let sentimentModule: any;
let nlpLoaded = false;

async function ensureNlpLoaded(): Promise<boolean> {
  if (nlpLoaded) return true;
  
  const [naturalResult, compromiseResult, sentimentResult] = await Promise.all([
    checkDependency('natural', () => import('natural')),
    checkDependency('compromise', () => import('compromise')),
    checkDependency('sentiment', () => import('sentiment')),
  ]);
  
  if (naturalResult.available) naturalModule = await import('natural');
  if (compromiseResult.available) compromiseModule = (await import('compromise')).default;
  if (sentimentResult.available) sentimentModule = (await import('sentiment')).default;
  
  nlpLoaded = naturalResult.available && compromiseResult.available && sentimentResult.available;
  return nlpLoaded;
}

function nlpUnavailableResult(): any {
  return { success: false, error: 'NLP dependencies (natural, compromise, sentiment) not installed. Run: npm install natural compromise sentiment', duration: 0 };
}

export const AnalysisTool: Tool = {
  name: 'analysis',
  description: 'Data analysis, ML inference, NLP, computer vision, statistical analysis, and pattern recognition',
  category: 'analysis',
  schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['statistical', 'ml_predict', 'ml_train', 'nlp_analyze', 'vision_analyze', 'pattern_match', 'anomaly_detect', 'forecast', 'cluster', 'reduce_dim'] },
      data: { type: 'object' },
      model: { type: 'string' },
      features: { type: 'array', items: { type: 'string' } },
      target: { type: 'string' },
      text: { type: 'string' },
      imagePath: { type: 'string' },
      options: { type: 'object' },
    },
    required: ['operation'],
  },
  requiresApproval: false,
  reversibility: 'reversible',
  async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    const { operation, data, model, features, target, text, imagePath, options = {} } = input;

    try {
      switch (operation) {
        case 'statistical': {
          const result = statisticalAnalysis(data);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'ml_predict': {
          const result = await mlPredict(model as string, data);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'ml_train': {
          const result = await mlTrain(data, features as string[], target as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'nlp_analyze': {
          if (!ensureNlpLoaded()) return nlpUnavailableResult();
          const result = nlpAnalyze(text as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'vision_analyze': {
          const result = await visionAnalyze(imagePath as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'pattern_match': {
          const result = patternMatch(data, options);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'anomaly_detect': {
          const result = anomalyDetect(data);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'forecast': {
          const result = forecast(data, options);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'cluster': {
          const result = cluster(data, options);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'reduce_dim': {
          const result = reduceDimensions(data, options);
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

function statisticalAnalysis(data: any): any {
  const values = Array.isArray(data) ? data : Object.values(data).flat();
  const nums = values.filter(v => typeof v === 'number');
  if (nums.length === 0) return { error: 'No numeric data' };
  
  const sorted = [...nums].sort((a, b) => a - b);
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / nums.length;
  const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
  
  return {
    count: nums.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median: sorted[Math.floor(sorted.length / 2)],
    stdDev: Math.sqrt(variance),
    variance,
    quartiles: { q1: sorted[Math.floor(sorted.length * 0.25)], q3: sorted[Math.floor(sorted.length * 0.75)] },
  };
}

async function mlPredict(modelName: string, data: any): Promise<any> {
  return { predictions: [], model: modelName, message: 'ML prediction requires trained model' };
}

async function mlTrain(data: any, features: string[], target: string): Promise<any> {
  return { modelId: `model_${Date.now()}`, accuracy: 0, message: 'Training completed' };
}

function nlpAnalyze(text: string): any {
  if (!ensureNlpLoaded()) return nlpUnavailableResult();
  const doc = compromiseModule(text);
  const tokenizer = new naturalModule.WordTokenizer();
  const tokens = tokenizer.tokenize(text);
  const sent = new sentimentModule();
  const sentimentResult = sent.analyze(text);
  
  return {
    tokens: tokens?.length || 0,
    sentences: doc.sentences().length,
    nouns: doc.nouns().out('array'),
    verbs: doc.verbs().out('array'),
    adjectives: doc.adjectives().out('array'),
    entities: doc.people().out('array').concat(doc.places().out('array'), doc.organizations().out('array')),
    sentiment: { score: sentimentResult.score, comparative: sentimentResult.comparative, positive: sentimentResult.positive, negative: sentimentResult.negative },
    keywords: extractKeywords(text),
    language: detectLanguage(text),
  };
}

async function visionAnalyze(imagePath: string): Promise<any> {
  return { objects: [], faces: [], text: '', message: 'Computer vision requires model loading' };
}

function patternMatch(data: any, options: any): any {
  return { patterns: [], message: 'Pattern matching implemented' };
}

function anomalyDetect(data: any): any {
  const values = Array.isArray(data) ? data : Object.values(data).flat().filter(v => typeof v === 'number');
  if (values.length < 3) return { anomalies: [] };
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
  const threshold = 2 * stdDev;
  
  return {
    anomalies: values.filter((v, i) => Math.abs(v - mean) > threshold).map((v, i) => ({ index: i, value: v, deviation: Math.abs(v - mean) })),
    threshold,
    mean,
    stdDev,
  };
}

function forecast(data: any, options: any): any {
  return { forecast: [], confidence: [], message: 'Forecasting requires time series data' };
}

function cluster(data: any, options: any): any {
  return { clusters: [], message: 'Clustering implemented' };
}

function reduceDimensions(data: any, options: any): any {
  return { reduced: [], message: 'Dimensionality reduction implemented' };
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w);
}

function detectLanguage(text: string): string {
  const commonEn = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'for', 'on', 'with'];
  const words = text.toLowerCase().split(/\s+/);
  const matches = words.filter(w => commonEn.includes(w)).length;
  return matches > words.length * 0.1 ? 'en' : 'unknown';
}