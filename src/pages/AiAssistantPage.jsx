import React, { useState } from 'react';
import { Bot, Sparkles, Send, Cpu, Database, ShieldAlert, ArrowRight, CornerDownLeft } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';

export default function AiAssistantPage() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am HCM Lite Intelligence. Once connected to your company database and the Gemini API in Phase 2, I can answer queries about attendance patterns, draft company policies, analyze compensation ranges, and identify retention trends.',
      timestamp: 'System Initialization',
    },
  ]);

  const queryTemplates = [
    'Who is currently on annual leave this week?',
    'Summarize department overtime hours for last month',
    'Draft a formal notice regarding upcoming national holidays',
    'What is our current engineering turnover rate?',
  ];

  const handleSend = (e) => {
    e?.preventDefault();
    if (!prompt.trim()) return;

    const userText = prompt;
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: userText, timestamp: 'Just now' },
      {
        role: 'assistant',
        text: `[Phase 2 AI Engine Preview]: Your query "${userText}" has been structured. In Phase 2, this will invoke the Gemini 2.5 API with secure Retrieval-Augmented Generation (RAG) against your Firestore / PostgreSQL employee database with role-based access control.`,
        timestamp: 'AI Engine Preview',
      },
    ]);
    setPrompt('');
  };

  const handleTemplateClick = (tmpl) => {
    setPrompt(tmpl);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Workforce Assistant"
        subtitle="Natural language copilot for HR queries, automated draft generation, and workforce analytics."
        breadcrumbs={[{ label: 'AI Assistant' }]}
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini 2.5 Ready Architecture</span>
        </span>
      </PageHeader>

      {/* Integration Status Notice */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4 text-xs text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-violet-600 shrink-0" />
          <div>
            <strong className="font-semibold text-slate-900 block">
              Frontend Interface Active &middot; Backend AI Engine Scheduled for Phase 2
            </strong>
            <span className="text-slate-500">
              The query interface is operational. Real-time grounding with company databases will connect in the next phase.
            </span>
          </div>
        </div>
        <span className="font-mono text-[11px] text-violet-700 font-semibold px-2.5 py-1 bg-white rounded border border-violet-200 shrink-0">
          Phase 1 Prototype
        </span>
      </div>

      {/* Chat Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        {/* Messages view */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-2xl ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-violet-600 text-white shadow-xs'
                }`}
              >
                {msg.role === 'user' ? 'U' : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`rounded-xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span
                    className={`font-semibold text-[11px] ${
                      msg.role === 'user' ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                  >
                    {msg.role === 'user' ? 'You' : 'HCM Lite Intelligence'}
                  </span>
                  <span
                    className={`text-[10px] ${
                      msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Suggested Queries */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Suggested Prompts
          </div>
          <div className="flex flex-wrap gap-2">
            {queryTemplates.map((tmpl, idx) => (
              <button
                key={idx}
                onClick={() => handleTemplateClick(tmpl)}
                className="text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors text-left"
              >
                {tmpl}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input Form */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask HCM Lite about company statistics, policies, or draft an announcement..."
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 focus:bg-white transition-all text-slate-900 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
