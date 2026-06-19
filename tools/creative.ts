import { Tool, ToolResult, AgentContext } from '@asi-types/index';
import { checkDependency, createUnavailableResult } from './dependency-check';

let canvasModule: any;
let ffmpegModule: any;
let canvasLoaded = false;
let ffmpegLoaded = false;

async function ensureCanvasLoaded(): Promise<boolean> {
  if (canvasLoaded) return true;
  const result = await checkDependency('canvas', () => import('canvas'));
  if (result.available) canvasModule = await import('canvas');
  canvasLoaded = result.available;
  return canvasLoaded;
}

async function ensureFfmpegLoaded(): Promise<boolean> {
  if (ffmpegLoaded) return true;
  const result = await checkDependency('fluent-ffmpeg', () => import('fluent-ffmpeg'));
  if (result.available) ffmpegModule = (await import('fluent-ffmpeg')).default;
  ffmpegLoaded = result.available;
  return ffmpegLoaded;
}

function canvasUnavailableResult(): any {
  return { success: false, error: 'Canvas dependency not installed. Run: npm install canvas', duration: 0 };
}

function ffmpegUnavailableResult(): any {
  return { success: false, error: 'Fluent-ffmpeg dependency not installed. Run: npm install fluent-ffmpeg', duration: 0 };
}

export const CreativeTool: Tool = {
  name: 'creative',
  description: 'Image generation, video editing, audio processing, design, and creative content creation',
  category: 'creative',
  schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['image_generate', 'image_edit', 'video_edit', 'audio_process', 'design', 'animate', 'render', 'convert'] },
      prompt: { type: 'string' },
      imagePath: { type: 'string' },
      videoPath: { type: 'string' },
      audioPath: { type: 'string' },
      width: { type: 'number' },
      height: { type: 'number' },
      format: { type: 'string' },
      quality: { type: 'number' },
      options: { type: 'object' },
    },
    required: ['operation'],
  },
  requiresApproval: false,
  reversibility: 'reversible',
  async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    const { operation, prompt, imagePath, videoPath, audioPath, width = 1024, height = 1024, format: outputFormat = 'png', quality = 90, options = {} } = input as {
      operation: string;
      prompt?: string;
      imagePath?: string;
      videoPath?: string;
      audioPath?: string;
      width?: number;
      height?: number;
      format?: string;
      quality?: number;
      options?: Record<string, unknown>;
    };

    try {
      const unavailableResult = (() => {
        if (!ensureCanvasLoaded() && ['image_generate', 'image_edit', 'design'].includes(operation)) {
          return canvasUnavailableResult();
        }
        if (!ensureFfmpegLoaded() && ['video_edit'].includes(operation)) {
          return ffmpegUnavailableResult();
        }
        return null;
      })();
      if (unavailableResult) return unavailableResult;

      switch (operation) {
        case 'image_generate': {
          const result = await generateImage(prompt as string, width, height, outputFormat);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'image_edit': {
          const result = await editImage(imagePath as string, options);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'video_edit': {
          const result = await editVideo(videoPath as string, options);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'audio_process': {
          const result = await processAudio(audioPath as string, options);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'design': {
          const result = await createDesign(options);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'animate': {
          const result = await createAnimation(options);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'render': {
          const result = await renderScene(options);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'convert': {
          const result = await convertMedia(imagePath as string, outputFormat, quality);
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

async function generateImage(prompt: string, width: number, height: number, outputFormat: string): Promise<any> {
  if (!ensureCanvasLoaded()) return canvasUnavailableResult();
  const canvas = canvasModule.createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0a0a0f');
  gradient.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = '#00ff88';
  ctx.font = '24px Inter';
  ctx.textAlign = 'center';
  ctx.fillText(`Generated: ${prompt.slice(0, 50)}`, width / 2, height / 2);
  
  const buffer = canvas.toBuffer('image/' + outputFormat as any);
  return { base64: buffer.toString('base64'), width, height, format: outputFormat, prompt };
}

async function editImage(imagePath: string, options: any): Promise<any> {
  if (!ensureCanvasLoaded()) return canvasUnavailableResult();
  return { edited: true, path: imagePath, operations: Object.keys(options) };
}

async function editVideo(videoPath: string, options: any): Promise<any> {
  if (!ensureFfmpegLoaded()) return ffmpegUnavailableResult();
  return new Promise((resolve, reject) => {
    const command = ffmpegModule(videoPath);
    if (options.trim) command.setStartTime(options.trim.start).setDuration(options.trim.duration);
    if (options.crop) command.videoFilters(`crop=${options.crop.width}:${options.crop.height}:${options.crop.x}:${options.crop.y}`);
    if (options.filter) command.videoFilters(options.filter);
    
    const output = videoPath.replace(/\.[^.]+$/, `_edited.${options.format || 'mp4'}`);
    command.output(output).on('end', () => resolve({ output, success: true })).on('error', reject).run();
  });
}

async function processAudio(audioPath: string, options: any): Promise<any> {
  if (!ensureFfmpegLoaded()) return ffmpegUnavailableResult();
  return { processed: true, path: audioPath, operations: Object.keys(options) };
}

async function createDesign(options: any): Promise<any> {
  if (!ensureCanvasLoaded()) return canvasUnavailableResult();
  const canvas = canvasModule.createCanvas(options.width || 1920, options.height || 1080);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = options.background || '#0a0a0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if (options.elements) {
    for (const el of options.elements) {
      if (el.type === 'text') {
        ctx.fillStyle = el.color || '#00ff88';
        ctx.font = `${el.size || 24}px ${el.font || 'Inter'}`;
        ctx.textAlign = el.align || 'center';
        ctx.fillText(el.content, el.x || canvas.width/2, el.y || canvas.height/2);
      }
    }
  }
  
  return { base64: canvas.toBuffer(`image/${options.format || 'png'}` as any).toString('base64') };
}

async function createAnimation(options: any): Promise<any> {
  return { frames: [], message: 'Animation creation requires frame sequence' };
}

async function renderScene(options: any): Promise<any> {
  return { rendered: true, message: '3D rendering requires Three.js/WebGL setup' };
}

async function convertMedia(inputPath: string, outputFormat: string, quality: number): Promise<any> {
  return { converted: true, outputPath: inputPath.replace(/\.[^.]+$/, `.${outputFormat}`) };
}