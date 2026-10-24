import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CircleHelp,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { requestAssistantReply } from '../services/assistantService.js';

const MAX_MESSAGE_LENGTH = 4000;

const SUGGESTIONS_BY_ROLE = {
  ADMIN: [
    'How many employees are currently registered?',
    "Summarize this month's attendance trends.",
    'Show pending leave requests.',
    'Explain our configured leave policy.',
  ],
  HR: [
    'How many employees are currently registered?',
    "Summarize this month's attendance trends.",
    'Show pending leave requests.',
    'Explain our configured leave policy.',
  ],
  EMPLOYEE: [
    'Summarize my attendance for this month.',
    'What is my remaining annual leave balance?',
    'Show my leave requests.',
    'Explain our configured leave policy.',
  ],
};

function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function AiAssistantPage() {
  const { currentRole } = useRole();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const conversationEndRef = useRef(null);
  const suggestions = SUGGESTIONS_BY_ROLE[currentRole] || SUGGESTIONS_BY_ROLE.EMPLOYEE;

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const requestReply = async (message, addUserMessage = true) => {
    setIsLoading(true);
    if (addUserMessage) {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'user', text: message, time: formatTime(new Date()) },
      ]);
      setPrompt('');
    }

    try {
      const reply = await requestAssistantReply(message);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', text: reply, time: formatTime(new Date()) },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'error',
          text: error.userMessage || 'The assistant could not complete this request.',
          retryText: message,
          time: formatTime(new Date()),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (event) => {
    event.preventDefault();
    const message = prompt.trim();
    if (!message || isLoading) return;
    requestReply(message);
  };

  const handleClear = () => {
    if (!messages.length || isLoading) return;
    if (window.confirm('Clear this conversation? This cannot be undone.')) {
      setMessages([]);
      setPrompt('');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        subtitle="Ask about the HCM information available to your role. Answers require the authenticated assistant service."
        breadcrumbs={[{ label: 'AI Assistant' }]}
      >
        <button
          type="button"
          onClick={handleClear}
          disabled={!messages.length || isLoading}
          title="Clear conversation"
          aria-label="Clear conversation"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Clear conversation</span>
        </button>
      </PageHeader>

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
        <p>
          <span className="font-semibold">Assistant service required.</span>{' '}
          This project has no backend assistant endpoint yet. Messages will not receive generated or sample answers until an authenticated server service is connected.
        </p>
      </div>

      <section className="flex h-[min(68vh,760px)] min-h-[460px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="AI Assistant chat">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-900">HCM Assistant</h2>
              <p className="text-xs text-slate-500">{currentRole === 'EMPLOYEE' ? 'Personal workspace' : 'Organization workspace'}</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            Not connected
          </span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
          {!messages.length ? (
            <div className="flex min-h-full flex-col items-center justify-center py-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <MessageSquareText className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">What can I help you find?</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Choose a question for your role or type your own. The server must verify access before returning HCM data.
              </p>
              <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setPrompt(suggestion)}
                    className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              const isError = message.role === 'error';
              return (
                <div key={message.id} className={`flex w-full gap-2.5 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isError ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                      {isError ? <AlertCircle className="h-4 w-4" aria-hidden="true" /> : <Bot className="h-4 w-4" aria-hidden="true" />}
                    </div>
                  )}
                  <div className={`max-w-[min(88%,42rem)] rounded-xl px-3.5 py-3 text-sm leading-relaxed sm:px-4 ${isUser ? 'bg-indigo-600 text-white' : isError ? 'border border-rose-200 bg-rose-50 text-rose-950' : 'border border-slate-200 bg-slate-50 text-slate-800'}`}>
                    <div className={`mb-1 flex items-center gap-2 text-xs ${isUser ? 'text-indigo-100' : isError ? 'text-rose-700' : 'text-slate-500'}`}>
                      {isUser ? <UserRound className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                      <span className="font-semibold">{isUser ? 'You' : isError ? 'Unable to respond' : 'HCM Assistant'}</span>
                      <time className="ml-auto" dateTime={new Date().toISOString()}>{message.time}</time>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    {isError && (
                      <button
                        type="button"
                        onClick={() => requestReply(message.retryText, false)}
                        disabled={isLoading}
                        className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-md border border-rose-300 bg-white px-2.5 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
                      </button>
                    )}
                  </div>
                  {isUser && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                      <UserRound className="h-4 w-4" aria-hidden="true" />
                    </div>
                  )}
                </div>
              );
            })
          )}
          {isLoading && (
            <div className="flex items-center gap-2.5" role="status" aria-label="Assistant is responding">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Bot className="h-4 w-4" aria-hidden="true" /></div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Connecting to the assistant service...
              </div>
            </div>
          )}
          <div ref={conversationEndRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <label className="sr-only" htmlFor="assistant-message">Message HCM Assistant</label>
          <div className="flex items-end gap-2">
            <textarea
              id="assistant-message"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={handleKeyDown}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={2}
              disabled={isLoading}
              placeholder="Ask about attendance, leave, or configured policies..."
              aria-describedby="assistant-message-hint"
              className="max-h-36 min-h-11 flex-1 resize-y rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              aria-label={isLoading ? 'Sending message' : 'Send message'}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
            >
              {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <div id="assistant-message-hint" className="mt-1.5 flex justify-between gap-2 px-1 text-[11px] text-slate-400">
            <span>Enter to send · Shift+Enter for a new line</span>
            <span>{prompt.length}/{MAX_MESSAGE_LENGTH}</span>
          </div>
        </form>
      </section>
    </div>
  );
}
