'use client';

import { useState, useEffect } from 'react';
import { Save, Key, Brain, Shield, Settings, Palette, Bell, FolderOpen, ToggleLeft, ToggleRight } from 'lucide-react';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'], envKey: 'OPENAI_API_KEY' },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'], envKey: 'ANTHROPIC_API_KEY' },
  { id: 'gemini', name: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'], envKey: 'GOOGLE_API_KEY' },
  { id: 'openrouter', name: 'OpenRouter', models: ['openai/gpt-4o', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro-1.5', 'meta-llama/llama-3.1-405b-instruct', 'mistral/mistral-large', 'qwen/qwen-2.5-72b-instruct'], envKey: 'OPENROUTER_API_KEY' },
];

const AUTONOMY_MODES = [
  { id: 'manual', name: 'Manual', desc: 'Approve every action', icon: Shield },
  { id: 'semi_auto', name: 'Semi-Autonomous', desc: 'Auto-approve reversible, ask for irreversible', icon: ToggleRight },
  { id: 'full_auto', name: 'Full Autonomous', desc: 'Execute without approval (use with caution)', icon: ToggleLeft },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'llm' | 'tools' | 'autonomy' | 'general'>('llm');
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { valid: boolean; error?: string }>>({});

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => setSettings(data));
  }, []);

  const handleChange = (path: string, value: any) => {
    setSettings((prev: any) => {
      if (!prev) return prev;
      const newSettings = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return newSettings;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async (providerId: string) => {
    const apiKey = settings?.llm?.apiKeys?.[providerId];
    if (!apiKey) {
      setTestResults(prev => ({ ...prev, [providerId]: { valid: false, error: 'No API key set' } }));
      return;
    }
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, apiKey }),
      });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [providerId]: data }));
    } catch (e) {
      setTestResults(prev => ({ ...prev, [providerId]: { valid: false, error: String(e) } }));
    }
  };

  const Tab = ({ id, label, icon: Icon }: { id: string; label: string; icon: React.ComponentType<any> }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        activeTab === id
          ? 'bg-asi-primary text-asi-bg font-medium'
          : 'text-asi-textMuted hover:bg-asi-bgTeritary/50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  if (!settings) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-asi-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-asi-text">Settings</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <Tab id="llm" label="LLM Providers" icon={Brain} />
        <Tab id="tools" label="Tool Permissions" icon={Shield} />
        <Tab id="autonomy" label="Autonomy" icon={Settings} />
        <Tab id="general" label="General" icon={Palette} />
      </div>

      <div className="panel-glow p-6 space-y-6">
        {activeTab === 'llm' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Provider Selection</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="panel-border p-4 rounded-xl">
                  <label className="block text-sm font-medium text-asi-textMuted mb-2">Active Provider</label>
                  <select
                    value={settings.llm.provider}
                    onChange={e => handleChange('llm.provider', e.target.value)}
                    className="input w-full"
                  >
                    {PROVIDERS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="panel-border p-4 rounded-xl">
                  <label className="block text-sm font-medium text-asi-textMuted mb-2">Model</label>
                  <select
                    value={settings.llm.model}
                    onChange={e => handleChange('llm.model', e.target.value)}
                    className="input w-full"
                  >
                    {PROVIDERS.find(p => p.id === settings.llm.provider)?.models.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">API Keys</h3>
              <p className="text-sm text-asi-textMuted mb-4">
                Keys are stored locally in your browser. For production, set environment variables on the server.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {PROVIDERS.map(provider => (
                  <div key={provider.id} className="panel-border p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">{provider.name}</span>
                      <span className={`w-2 h-2 rounded-full ${testResults[provider.id]?.valid ? 'bg-green-500' : testResults[provider.id]?.valid === false ? 'bg-red-500' : 'bg-gray-500'}`} />
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        value={settings.llm.apiKeys[provider.id] || ''}
                        onChange={e => handleChange(`llm.apiKeys.${provider.id}`, e.target.value)}
                        placeholder={`Enter ${provider.name} API key`}
                        className="input w-full pr-24"
                      />
                      <button
                        onClick={() => testProvider(provider.id)}
                        disabled={!settings.llm.apiKeys[provider.id] || saving}
                        className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost p-1 text-xs"
                      >
                        Test
                      </button>
                    </div>
                    {testResults[provider.id]?.error && (
                      <p className="text-xs text-red-400 mt-1">{testResults[provider.id].error}</p>
                    )}
                    {testResults[provider.id]?.valid && (
                      <p className="text-xs text-green-400 mt-1">Connected successfully</p>
                    )}
                    <p className="text-xs text-asi-textMuted mt-2">
                      Env: <code>{provider.envKey}</code>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-border p-4 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">Generation Parameters</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-asi-textMuted mb-2">Temperature</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.llm.temperature}
                    onChange={e => handleChange('llm.temperature', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-sm text-asi-textMuted mt-1">{settings.llm.temperature}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-asi-textMuted mb-2">Max Tokens</label>
                  <input
                    type="number"
                    value={settings.llm.maxTokens}
                    onChange={e => handleChange('llm.maxTokens', parseInt(e.target.value))}
                    min="100"
                    max="128000"
                    className="input w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-2">Tool Permissions</h3>
            <p className="text-sm text-asi-textMuted mb-4">Control what the agent can do. Irreversible actions always require approval.</p>
            <div className="space-y-4">
              {Object.entries(settings.tools).map(([category, perms]) => {
                const permissions = perms as Record<string, boolean>;
                return (
                  <div key={category} className="panel-border p-4 rounded-xl">
                    <h4 className="font-medium capitalize mb-3">{category}</h4>
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                      {Object.entries(permissions).map(([action, enabled]) => (
                        <label key={action} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={e => handleChange(`tools.${category}.${action}`, e.target.checked)}
                            className="checkbox"
                          />
                          <span className="text-sm capitalize">{action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'autonomy' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Autonomy Mode</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {AUTONOMY_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => handleChange('autonomy.mode', mode.id)}
                    className={`panel-border p-4 rounded-xl text-left transition-all ${
                      settings.autonomy.mode === mode.id
                        ? 'border-asi-primary bg-asi-primary/10'
                        : 'hover:border-asi-border'
                    }`}
                  >
                    <mode.icon className={`w-6 h-6 mb-2 ${settings.autonomy.mode === mode.id ? 'text-asi-primary' : 'text-asi-textMuted'}`} />
                    <div className="font-medium">{mode.name}</div>
                    <div className="text-sm text-asi-textMuted mt-1">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel-border p-4 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">Approval Rules</h3>
              <div className="space-y-2">
                {['irreversible', 'semi_reversible', 'destructive', 'secrets', 'money', 'medical', 'legal', 'privacy'].map(rule => (
                  <label key={rule} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autonomy.requireApprovalFor.includes(rule)}
                      onChange={e => handleChange('autonomy.requireApprovalFor', 
                        e.target.checked 
                          ? [...settings.autonomy.requireApprovalFor, rule]
                          : settings.autonomy.requireApprovalFor.filter((r: string) => r !== rule)
                      )}
                      className="checkbox"
                    />
                    <span className="capitalize">{rule.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="panel-border p-4 rounded-xl grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-asi-textMuted mb-2">Max Concurrent Tasks</label>
                <input
                  type="number"
                  value={settings.autonomy.maxConcurrentTasks}
                  onChange={e => handleChange('autonomy.maxConcurrentTasks', parseInt(e.target.value))}
                  min="1"
                  max="20"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-asi-textMuted mb-2">Max Iterations</label>
                <input
                  type="number"
                  value={settings.autonomy.maxIterations}
                  onChange={e => handleChange('autonomy.maxIterations', parseInt(e.target.value))}
                  min="1"
                  max="50"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-asi-textMuted mb-2">Timeout (ms)</label>
                <input
                  type="number"
                  value={settings.autonomy.timeoutMs}
                  onChange={e => handleChange('autonomy.timeoutMs', parseInt(e.target.value))}
                  min="10000"
                  max="3600000"
                  step="10000"
                  className="input w-full"
                />
              </div>
            </div>

            <div className="panel-border p-4 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autonomy.autoApproveReversible}
                  onChange={e => handleChange('autonomy.autoApproveReversible', e.target.checked)}
                  className="checkbox"
                />
                <span>Auto-approve reversible actions</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer mt-3 block">
                <input
                  type="checkbox"
                  checked={settings.autonomy.proactiveActions}
                  onChange={e => handleChange('autonomy.proactiveActions', e.target.checked)}
                  className="checkbox"
                />
                <span>Allow proactive agent actions</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="panel-border p-4 rounded-xl grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-asi-textMuted mb-2">Theme</label>
                <select
                  value={settings.general.theme}
                  onChange={e => handleChange('general.theme', e.target.value)}
                  className="input w-full"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-asi-textMuted mb-2">Language</label>
                <input
                  type="text"
                  value={settings.general.language}
                  onChange={e => handleChange('general.language', e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-asi-textMuted mb-2">Working Directory</label>
                <input
                  type="text"
                  value={settings.general.workingDirectory}
                  onChange={e => handleChange('general.workingDirectory', e.target.value)}
                  className="input w-full font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-asi-textMuted mb-2">Notifications</label>
                <select
                  value={settings.general.notifications}
                  onChange={e => handleChange('general.notifications', e.target.value)}
                  className="input w-full"
                >
                  <option value="all">All</option>
                  <option value="important">Important</option>
                  <option value="critical">Critical Only</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>

            <div className="panel-border p-4 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.general.telemetry}
                  onChange={e => handleChange('general.telemetry', e.target.checked)}
                  className="checkbox"
                />
                <span>Enable anonymous telemetry (helps improve the agent)</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}