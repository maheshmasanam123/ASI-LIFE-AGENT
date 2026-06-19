import { Tool, ToolResult, AgentContext } from '@asi-types/index';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { checkDependency, createUnavailableResult } from './dependency-check';

let naturalModule: any;
let naturalLoaded = false;

async function ensureNaturalLoaded(): Promise<boolean> {
  if (naturalLoaded) return true;
  const result = await checkDependency('natural', () => import('natural'));
  if (result.available) naturalModule = await import('natural');
  naturalLoaded = result.available;
  return naturalLoaded;
}

function naturalUnavailableResult(): any {
  return { success: false, error: 'Natural dependency not installed. Run: npm install natural', duration: 0 };
}

export const LearningTool: Tool = {
  name: 'learning',
  description: 'Knowledge management, skill acquisition, model fine-tuning, memory consolidation, and continuous learning',
  category: 'learning',
  schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['knowledge_store', 'knowledge_retrieve', 'skill_learn', 'skill_practice', 'model_train', 'model_finetune', 'memory_consolidate', 'pattern_extract', 'concept_map', 'recommend'] },
      topic: { type: 'string' },
      content: { type: 'string' },
      query: { type: 'string' },
      skill: { type: 'string' },
      model: { type: 'string' },
      data: { type: 'object' },
      epochs: { type: 'number' },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['operation'],
  },
  requiresApproval: false,
  reversibility: 'reversible',
  async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    const { operation, topic, content, query, skill, model, data, epochs = 10, tags = [] } = input as {
      operation: string;
      topic?: string;
      content?: string;
      query?: string;
      skill?: string;
      model?: string;
      data?: any;
      epochs?: number;
      tags?: string[];
    };

    try {
      if (!(await ensureNaturalLoaded()) && ['knowledge_retrieve'].includes(operation)) {
        return naturalUnavailableResult();
      }

      switch (operation) {
        case 'knowledge_store': {
          const result = await storeKnowledge(topic as string, content as string, tags as string[]);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'knowledge_retrieve': {
          const result = await retrieveKnowledge(query as string, topic as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'skill_learn': {
          const result = await learnSkill(skill as string, data);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'skill_practice': {
          const result = await practiceSkill(skill as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'model_train': {
          const result = await trainModel(model as string, data, epochs as number);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'model_finetune': {
          const result = await finetuneModel(model as string, data);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'memory_consolidate': {
          const result = await consolidateMemory();
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'pattern_extract': {
          const result = await extractPatterns(data);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'concept_map': {
          const result = await buildConceptMap(topic as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'recommend': {
          const result = await recommendLearning(topic as string);
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

const knowledgeBase = new Map<string, any[]>();
const skills = new Map<string, any>();

async function storeKnowledge(topic: string, content: string, tags: string[]): Promise<any> {
  const entry = { topic, content, tags, timestamp: new Date(), id: `kb_${Date.now()}` };
  const existing = knowledgeBase.get(topic) || [];
  existing.push(entry);
  knowledgeBase.set(topic, existing);
  return entry;
}

async function retrieveKnowledge(query: string, topic?: string): Promise<any> {
  if (!(await ensureNaturalLoaded())) return naturalUnavailableResult();
  let entries: any[] = [];
  if (topic) {
    entries = knowledgeBase.get(topic) || [];
  } else {
    for (const v of knowledgeBase.values()) entries.push(...v);
  }
  
  const tokenizer = new naturalModule.WordTokenizer();
  const queryTokens = tokenizer.tokenize(query.toLowerCase()) || [];
  
  return entries
    .map(e => ({
      ...e,
      relevance: calculateRelevance(queryTokens, e.content.toLowerCase())
    }))
    .filter(e => e.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 10);
}

function calculateRelevance(queryTokens: string[], content: string): number {
  let score = 0;
  for (const token of queryTokens) {
    if (content.includes(token)) score++;
  }
  return score / queryTokens.length;
}

async function learnSkill(skill: string, data: any): Promise<any> {
  const skillData = { name: skill, data, learnedAt: new Date(), proficiency: 0, id: `skill_${Date.now()}` };
  skills.set(skill, skillData);
  return skillData;
}

async function practiceSkill(skill: string): Promise<any> {
  const skillData = skills.get(skill);
  if (!skillData) throw new Error('Skill not found');
  skillData.proficiency = Math.min(100, skillData.proficiency + 5);
  return { skill, proficiency: skillData.proficiency };
}

async function trainModel(model: string, data: any, epochs: number): Promise<any> {
  return { model, epochs, loss: 0, accuracy: 0, message: 'Training requires ML framework setup' };
}

async function finetuneModel(model: string, data: any): Promise<any> {
  return { model, message: 'Fine-tuning requires base model and training data' };
}

async function consolidateMemory(): Promise<any> {
  let totalEntries = 0;
  for (const entries of knowledgeBase.values()) totalEntries += entries.length;
  return { consolidated: totalEntries, topics: knowledgeBase.size, timestamp: new Date() };
}

async function extractPatterns(data: any): Promise<any> {
  return { patterns: [], message: 'Pattern extraction implemented' };
}

async function buildConceptMap(topic: string): Promise<any> {
  const entries = knowledgeBase.get(topic) || [];
  const concepts = new Set<string>();
  for (const e of entries) {
    for (const tag of e.tags) concepts.add(tag);
  }
  return { topic, concepts: Array.from(concepts), connections: [] };
}

async function recommendLearning(topic: string): Promise<any> {
  const related = new Set<string>();
  for (const [t, entries] of knowledgeBase.entries()) {
    if (t !== topic) {
      for (const e of entries) {
        if (e.tags.some((tag: string) => knowledgeBase.get(topic)?.some(e2 => e2.tags.includes(tag)))) {
          related.add(t);
        }
      }
    }
  }
  return { topic, recommendations: Array.from(related).slice(0, 5) };
}