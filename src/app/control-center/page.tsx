'use client';

import { useState, useEffect } from 'react';
import { 
  Save, Key, Brain, Shield, Settings, Palette, ToggleLeft, ToggleRight, 
  CheckCircle, AlertCircle, XCircle, Loader2, ExternalLink, 
  Wifi, Database, Server, Zap, Eye, EyeOff, Plus, Trash2,
  TestTube, Check, X
} from 'lucide-react';
import Link from 'next/link';

const BUILTIN_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'], envKey: 'OPENAI_API_KEY', defaultBaseURL: 'https://api.openai.com/v1' },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'], envKey: 'ANTHROPIC_API_KEY', defaultBaseURL: 'https://api.anthropic.com' },
  { id: 'gemini', name: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'], envKey: 'GOOGLE_API_KEY', defaultBaseURL: 'https://generativelanguage.googleapis.com/v1beta' },
  { id: 'openrouter', name: 'OpenRouter', models: ['openai/gpt-4o', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro-1.5', 'meta-llama/llama-3.1-405b-instruct', 'mistral/mistral-large', 'qwen/qwen-2.5-72b-instruct'], envKey: 'OPENROUTER_API_KEY', defaultBaseURL: 'https://openrouter.ai/api/v1' },
  { id: 'groq', name: 'Groq', models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'], envKey: 'GROQ_API_KEY', defaultBaseURL: 'https://api.groq.com/openai/v1' },
  { id: 'mistral', name: 'Mistral AI', models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'], envKey: 'MISTRAL_API_KEY', defaultBaseURL: 'https://api.mistral.ai/v1' },
  { id: 'together', name: 'Together AI', models: ['meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'], envKey: 'TOGETHER_API_KEY', defaultBaseURL: 'https://api.together.xyz/v1' },
  { id: 'perplexity', name: 'Perplexity', models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-chat'], envKey: 'PERPLEXITY_API_KEY', defaultBaseURL: 'https://api.perplexity.ai' },
  { id: 'cohere', name: 'Cohere', models: ['command-r-plus', 'command-r', 'command-light'], envKey: 'COHERE_API_KEY', defaultBaseURL: 'https://api.cohere.ai/v1' },
  { id: 'ollama', name: 'Ollama (Local)', models: [], envKey: 'OLLAMA_HOST', defaultBaseURL: 'http://localhost:11434/v1', local: true },
  { id: 'lmstudio', name: 'LM Studio (Local)', models: [], envKey: 'LMSTUDIO_HOST', defaultBaseURL: 'http://localhost:1234/v1', local: true },
];

const AUTONOMY_MODES = [
  { id: 'safe', name: 'Safe Mode', desc: 'Approve every action. No auto-execution.', icon: Shield, status: 'Working' },
  { id: 'builder', name: 'Builder Mode', desc: 'Auto-approve reversible file/code actions. Ask for terminal/deployment.', icon: Zap, status: 'Working' },
  { id: 'full_local', name: 'Full Local Mode', desc: 'Only local providers (Ollama/LM Studio). No cloud calls.', icon: Server, status: 'Working' },
  { id: 'approval_required', name: 'Approval Required', desc: 'All actions require explicit approval. Audit trail enabled.', icon: CheckCircle, status: 'Working' },
];

const TOOL_CATEGORIES = [
  { key: 'file', name: 'File Tools', items: ['read', 'write', 'delete', 'list', 'search'], desc: 'File system operations', icon: Database },
  { key: 'terminal', name: 'Terminal Tools', items: ['execute', 'spawn', 'session', 'script'], desc: 'Shell command execution', icon: Zap },
  { key: 'web', name: 'Web Tools', items: ['search', 'fetch', 'scrape', 'api', 'download'], desc: 'Web browsing & APIs', icon: Wifi },
  { key: 'code', name: 'Code Tools', items: ['execute', 'analyze', 'lint', 'test'], desc: 'Code execution & analysis', icon: Brain },
  { key: 'system', name: 'System Tools', items: ['metrics', 'processes', 'services'], desc: 'System monitoring', icon: Server },
  { key: 'deployment', name: 'Deployment Tools', items: ['deploy', 'rollback', 'scale'], desc: 'Deploy & manage services', icon: Shield },
  { key: 'communication', name: 'Communication Tools', items: ['email', 'slack', 'discord', 'sms'], desc: 'Send notifications', icon: ExternalLink },
];

export default function ControlCenterPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'tools' | 'autonomy' | 'security'>('providers');
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { valid: boolean; error?: string }>>({});
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customProvider, setCustomProvider] = useState({ id: '', name: '', baseURL: '', model: '', apiKey: '' });

  useEffect(() => {
    fetch('/api/control-center').then(r => r.json()).then(data => setSettings(data));
  }, []);

  const handleChange = (path: string, value: any) => {
    setSettings((prev: any) => {
      if (!prev) return prev;
      const newSettings = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = newSettings;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return newSettings;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/control-center', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch (e) { console.error('Save failed:', e); } finally { setSaving(false); }
  };

  const testProvider = async (providerId: string) => {
    const apiKey = settings?.providers?.[providerId]?.apiKey;
    if (!apiKey || apiKey.startsWith('•••')) { setTestResults(prev => ({ ...prev, [providerId]: { valid: false, error: 'No API key set' } })); return; }
    try {
      const res = await fetch('/api/settings/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: providerId, apiKey }) });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [providerId]: data }));
    } catch (e) { setTestResults(prev => ({ ...prev, [providerId]: { valid: false, error: String(e) } })); }
  };

  const addCustomProvider = async () => {
    if (!customProvider.id || !customProvider.name || !customProvider.baseURL || !customProvider.apiKey) return;
    handleChange(`providers.${customProvider.id}`, { ...customProvider, enabled: true });
    setShowAddCustom(false);
    setCustomProvider({ id: '', name: '', baseURL: '', model: '', apiKey: '' });
  };

  const removeProvider = (id: string) => {
    setSettings((prev: any) => { if (!prev) return prev; const newS = JSON.parse(JSON.stringify(prev)); delete newS.providers[id]; if (newS.activeProvider === id) newS.activeProvider = Object.keys(newS.providers)[0] || 'openai'; return newS; });
  };

  const Tab = ({ id, label, icon: Icon }: { id: string; label: string; icon: React.ComponentType<any> }) => (
    <button onClick={() => setActiveTab(id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === id ? 'bg-asi-primary text-asi-bg font-medium' : 'text-asi-textMuted hover:bg-asi-bgTeritary/50'}`}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = { Working: 'bg-green-500', 'Needs API key': 'bg-yellow-500', 'Coming soon': 'bg-blue-500', Disabled: 'bg-gray-500', Error: 'bg-red-500' };
    return <span className={`px-2 py-0.5 text-xs rounded-full ${colors[status] || 'bg-gray-500'}`}>{status}</span>;
  };

  if (!settings) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asi-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-asi-text">Secure Control Center</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary"><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}</button>
      </div>
      <div className="flex gap-2 flex-wrap mb-4">
        <Tab id="providers" label="API Providers" icon={Brain} />
        <Tab id="models" label="Model Selection" icon={Settings} />
        <Tab id="tools" label="Tool Permissions" icon={Shield} />
        <Tab id="autonomy" label="Autonomy Modes" icon={Zap} />
        <Tab id="security" label="Security Rules" icon={AlertCircle} />
      </div>
      <div className="panel-glow p-6 space-y-6">
        {activeTab === 'providers' && <ProvidersTab settings={settings} handleChange={handleChange} testResults={testResults} testProvider={testProvider} customProvider={customProvider} setCustomProvider={setCustomProvider} showAddCustom={showAddCustom} setShowAddCustom={setShowAddCustom} addCustomProvider={addCustomProvider} removeProvider={removeProvider} saving={saving} />}
        {activeTab === 'models' && <ModelsTab settings={settings} handleChange={handleChange} />}
        {activeTab === 'tools' && <ToolsTab settings={settings} handleChange={handleChange} />}
        {activeTab === 'autonomy' && <AutonomyTab settings={settings} handleChange={handleChange} />}
        {activeTab === 'security' && <SecurityTab settings={settings} handleChange={handleChange} />}
      </div>
    </div>
  );
}

function ProvidersTab({ settings, handleChange, testResults, testProvider, customProvider, setCustomProvider, showAddCustom, setShowAddCustom, addCustomProvider, removeProvider, saving }: any) {
  return (
    <div className="space-y-6">
      <div><h3 className="text-lg font-semibold mb-4">Built-in Providers</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BUILTIN_PROVIDERS.map(p => (
            <div key={p.id} className="panel-border p-4 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">{p.name}</span>
                <span className={`w-2 h-2 rounded-full ${settings.providers?.[p.id]?.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={settings.providers?.[p.id]?.enabled || false} onChange={e => handleChange(`providers.${p.id}.enabled`, e.target.checked)} className="checkbox" /><span>Enabled</span></label>
                <div className="relative"><input type="password" value={settings.providers?.[p.id]?.apiKey || ''} onChange={e => handleChange(`providers.${p.id}.apiKey`, e.target.value)} placeholder={`Enter ${p.name} API key`} className="input w-full pr-24" /><button onClick={() => testProvider(p.id)} disabled={!settings.providers?.[p.id]?.apiKey || saving} className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost p-1 text-xs">Test</button></div>
                {testResults[p.id]?.error && <p className="text-xs text-red-400">{testResults[p.id].error}</p>}
                {testResults[p.id]?.valid && <p className="text-xs text-green-400">Connected</p>}
                <input type="text" value={settings.providers?.[p.id]?.baseURL || p.defaultBaseURL} onChange={e => handleChange(`providers.${p.id}.baseURL`, e.target.value)} placeholder={p.defaultBaseURL} className="input w-full text-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel-border p-4 rounded-xl">
        <h3 className="text-lg font-semibold mb-4">Custom Provider</h3>
        {!showAddCustom ? <button onClick={() => setShowAddCustom(true)} className="btn-primary"><Plus className="w-4 h-4 mr-2" />Add Custom Provider</button> : (
          <div className="space-y-4">
            <input value={customProvider.id} onChange={e => setCustomProvider({...customProvider, id: e.target.value})} placeholder="Provider ID (e.g., my-custom)" className="input" />
            <input value={customProvider.name} onChange={e => setCustomProvider({...customProvider, name: e.target.value})} placeholder="Display Name" className="input" />
            <input value={customProvider.baseURL} onChange={e => setCustomProvider({...customProvider, baseURL: e.target.value})} placeholder="Base URL (e.g., https://api.example.com/v1)" className="input" />
            <input value={customProvider.model} onChange={e => setCustomProvider({...customProvider, model: e.target.value})} placeholder="Default Model (optional)" className="input" />
            <input type="password" value={customProvider.apiKey} onChange={e => setCustomProvider({...customProvider, apiKey: e.target.value})} placeholder="API Key" className="input" />
            <div className="flex gap-2"><button onClick={addCustomProvider} className="btn-primary">Add</button><button onClick={() => setShowAddCustom(false)} className="btn-ghost">Cancel</button></div>
          </div>
        )}
      </div>
      {Object.keys(settings.providers || {}).filter(id => !BUILTIN_PROVIDERS.find(p => p.id === id)).map(id => (
        <div key={id} className="panel-border p-4 rounded-xl flex items-center justify-between">
          <span className="font-medium">{settings.providers[id].name}</span>
          <button onClick={() => removeProvider(id)} className="btn-ghost p-1 text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}

function ModelsTab({ settings, handleChange }: any) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel-border p-4 rounded-xl"><label className="block text-sm font-medium text-asi-textMuted mb-2">Active Provider</label><select value={settings.activeProvider} onChange={e => handleChange('activeProvider', e.target.value)} className="input w-full">{Object.keys(settings.providers || {}).map(id => <option key={id} value={id}>{settings.providers[id].name}</option>)}</select></div>
        <div className="panel-border p-4 rounded-xl"><label className="block text-sm font-medium text-asi-textMuted mb-2">Active Model</label><input value={settings.activeModel} onChange={e => handleChange('activeModel', e.target.value)} className="input w-full" placeholder="Model name" /></div>
      </div>
      <div className="panel-border p-4 rounded-xl"><h3 className="text-lg font-semibold mb-4">Per-Provider Model Override</h3><div className="grid gap-4 md:grid-cols-2">{Object.entries(settings.providers || {}).map(([id, p]: [string, any]) => (<div key={id} className="panel-border p-4 rounded-xl"><h4 className="font-medium mb-2">{p.name}</h4><input value={p.model || ''} onChange={e => handleChange(`providers.${id}.model`, e.target.value)} placeholder="Custom model (optional)" className="input w-full" /></div>))}</div></div>
    </div>
  );
}

function ToolsTab({ settings, handleChange }: any) {
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = { Working: 'bg-green-500', 'Needs API key': 'bg-yellow-500', 'Coming soon': 'bg-blue-500', Disabled: 'bg-gray-500', Error: 'bg-red-500' };
    return <span className={`px-2 py-0.5 text-xs rounded-full ${colors[status] || 'bg-gray-500'}`}>{status}</span>;
  };
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-2">Tool Permissions</h3>
      <p className="text-sm text-asi-textMuted mb-4">Control what the agent can do. Irreversible actions always require approval.</p>
      <div className="space-y-4">{TOOL_CATEGORIES.map(cat => (
        <div key={cat.key} className="panel-border p-4 rounded-xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-asi-primary/20 text-asi-primary flex items-center justify-center flex-shrink-0"><cat.icon className="w-5 h-5" /></div>
          <div className="flex-1"><h4 className="font-medium">{cat.name}</h4><p className="text-sm text-asi-textMuted">{cat.desc}</p><div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 mt-3">{cat.items.map(action => (<label key={action} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.toolPermissions?.[cat.key]?.[action] ?? true} onChange={e => handleChange(`toolPermissions.${cat.key}.${action}`, e.target.checked)} className="checkbox" /><span className="text-sm capitalize">{action}</span></label>))}</div></div>
          <StatusBadge status={cat.key === 'deployment' ? 'Needs API key' : 'Working'} />
        </div>
      ))}</div>
    </div>
  );
}

function AutonomyTab({ settings, handleChange }: any) {
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = { Working: 'bg-green-500', 'Needs API key': 'bg-yellow-500', 'Coming soon': 'bg-blue-500', Disabled: 'bg-gray-500', Error: 'bg-red-500' };
    return <span className={`px-2 py-0.5 text-xs rounded-full ${colors[status] || 'bg-gray-500'}`}>{status}</span>;
  };
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Autonomy Mode</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{AUTONOMY_MODES.map(mode => (
        <button key={mode.id} onClick={() => handleChange('autonomyMode', mode.id)} className={`panel-border p-4 rounded-xl text-left transition-all ${settings.autonomyMode === mode.id ? 'border-asi-primary bg-asi-primary/10' : 'hover:border-asi-border'}`}>
          <mode.icon className={`w-6 h-6 mb-2 ${settings.autonomyMode === mode.id ? 'text-asi-primary' : 'text-asi-textMuted'}`} />
          <div className="font-medium">{mode.name}</div>
          <div className="text-sm text-asi-textMuted mt-1">{mode.desc}</div>
          <StatusBadge status={mode.status} />
        </button>
      ))}</div>
    </div>
  );
}

function SecurityTab({ settings, handleChange }: any) {
  return (
    <div className="space-y-6">
      <div className="panel-border p-4 rounded-xl"><h3 className="text-lg font-semibold mb-4">Approval Rules</h3><div className="space-y-2">{['irreversible','semi_reversible','destructive','secrets','money','medical','legal','privacy'].map(rule => (<label key={rule} className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={settings.approvalRules?.includes(rule)} onChange={e => handleChange('approvalRules', e.target.checked ? [...(settings.approvalRules||[]), rule] : (settings.approvalRules||[]).filter((r:string)=>r!==rule))} className="checkbox" /><span className="capitalize">{rule.replace('_',' ')}</span></label>))}</div></div>
      <div className="panel-border p-4 rounded-xl"><h3 className="text-lg font-semibold mb-4">Key Security</h3><p className="text-sm text-asi-textMuted mb-4">API keys are stored server-side in .env.local. Keys are never exposed to client bundles or localStorage.</p><div className="space-y-2"><label className="flex items-center gap-3"><input type="checkbox" checked={true} disabled className="checkbox" /><span>Keys masked in UI</span></label><label className="flex items-center gap-3"><input type="checkbox" checked={true} disabled className="checkbox" /><span>Keys written to .env.local only</span></label><label className="flex items-center gap-3"><input type="checkbox" checked={true} disabled className="checkbox" /><span>No localStorage persistence</span></label></div></div>
      <div className="panel-border p-4 rounded-xl"><h3 className="text-lg font-semibold mb-4">Validation</h3><div className="grid gap-4 md:grid-cols-3"><div><label className="block text-sm font-medium text-asi-textMuted mb-2">WebSocket URL</label><input value={process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'} onChange={e => handleChange('wsUrl', e.target.value)} className="input w-full font-mono text-sm" /></div><div><label className="block text-sm font-medium text-asi-textMuted mb-2">App URL</label><input value={process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'} onChange={e => handleChange('appUrl', e.target.value)} className="input w-full font-mono text-sm" /></div><div><label className="block text-sm font-medium text-asi-textMuted mb-2">Test Connection</label><button className="btn-primary w-full" onClick={() => fetch('/api/health').then(r => r.ok ? alert('OK') : alert('Failed'))}>Test Health Endpoint</button></div></div></div>
    </div>
  );
}