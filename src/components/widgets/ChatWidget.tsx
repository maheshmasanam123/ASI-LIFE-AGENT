'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Copy, Check, MessageSquare, Mic, Paperclip, MoreVertical, Smile } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/app/providers';
import { AgentMessage, UUID, createUUID } from '@asi-types/index';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export function ChatWidget() {
  const { messages, addMessage, agents } = useApp();
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: AgentMessage = {
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      agentId: 'user' as UUID,
      role: 'user',
      content: input,
      type: 'text',
      metadata: {},
    };

    addMessage(userMessage);
    const userInput = input;
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput, history: messages.slice(-10) }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      const assistantMessageId = createUUID();

      const assistantMessage: AgentMessage = {
        id: assistantMessageId,
        createdAt: new Date(),
        updatedAt: new Date(),
        agentId: agents[0]?.id || 'assistant' as UUID,
        role: 'assistant',
        content: '',
        type: 'text',
        metadata: { streaming: true },
      };

      addMessage(assistantMessage);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullResponse += chunk;
        
        addMessage({
          ...assistantMessage,
          content: fullResponse,
          updatedAt: new Date(),
        });
      }

      addMessage({
        ...assistantMessage,
        content: fullResponse,
        metadata: { ...assistantMessage.metadata, streaming: false },
        updatedAt: new Date(),
      });
    } catch (error) {
      addMessage({
        id: createUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        agentId: 'system' as UUID,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'text',
        metadata: {},
      });
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="h-full flex flex-col panel-glow p-0 overflow-hidden">
      <div className="h-full flex flex-col">
        <AnimatePresence mode="popLayout">
          <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-live="polite">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center p-8"
              >
                <MessageSquare className="w-16 h-16 text-asi-textMuted/30 mb-4" />
                <p className="text-asi-textMuted">Start a conversation</p>
                <p className="text-xs text-asi-textMuted/50 mt-1">Type a message to begin</p>
              </motion.div>
            ) : (
              messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-asi-primary text-asi-bg' : 'bg-asi-bgTeritary text-asi-primary'}`}>
                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`relative ${message.role === 'user' ? 'bg-asi-primary text-asi-bg' : 'bg-asi-bgTeritary text-asi-text'} rounded-2xl px-4 py-3`}>
                      <MessageContent message={message} />
                      {(message.metadata.streaming || isStreaming) && message.role === 'assistant' && (
                        <motion.div className="absolute bottom-1 right-2 flex items-center gap-1 text-xs text-asi-textMuted/50">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Generating...</span>
                        </motion.div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-asi-textMuted font-mono">{message.createdAt.toLocaleTimeString()}</span>
                      {message.role === 'assistant' && !message.metadata.streaming && (
                        <button className="btn-ghost p-1 hover:bg-asi-bgTeritary/50" aria-label="Copy">
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </AnimatePresence>

        <div className="p-4 border-t border-asi-border/50">
          <form onSubmit={handleSend} className="relative">
            <div className="flex items-end gap-2">
              <button type="button" className="btn-ghost p-2 hover:bg-asi-bgTeritary/50" aria-label="Attach file">
                <Paperclip className="w-5 h-5" />
              </button>
              <button type="button" className="btn-ghost p-2 hover:bg-asi-bgTeritary/50" aria-label="Emoji">
                <Smile className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Message ASI Agent... (Enter to send, Shift+Enter for new line)"
                className="flex-1 input resize-none min-h-[44px] max-h-32 bg-asi-bgTeritary/50 border-asi-border/50 pr-12"
                disabled={isStreaming}
                rows={1}
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="btn-primary p-2 self-end mb-1"
                aria-label="Send message"
              >
                {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-asi-textMuted/50 mt-1 text-right">Powered by ASI Life Agent • {agents.length} agents available</p>
          </form>
        </div>
      </div>
    </div>
  );
}

function MessageContent({ message }: { message: AgentMessage }) {
  if (message.type === 'code') {
    return (
      <pre className="bg-asi-bg/50 rounded-xl p-3 overflow-x-auto text-sm">
        <code>{message.content}</code>
      </pre>
    );
  }
  if (message.type === 'json') {
    return (
      <pre className="bg-asi-bg/50 rounded-xl p-3 overflow-x-auto text-sm font-mono">
        {JSON.stringify(JSON.parse(message.content), null, 2)}
      </pre>
    );
  }
  if (message.type === 'markdown' || message.type === 'text') {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} className="prose prose-invert prose-sm max-w-none">
        {message.content}
      </ReactMarkdown>
    );
  }
  return <p className="whitespace-pre-wrap">{message.content}</p>;
}