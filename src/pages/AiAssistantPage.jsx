import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, Cpu, Database, ShieldAlert, ArrowRight, CornerDownLeft, ShieldCheck, Check } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import { api, getStoredUser } from '../services/api.js';
import { useRole } from '../context/RoleContext.jsx';

export default function AiAssistantPage() {
  const { currentRole } = useRole();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am HCM Lite Intelligence. I am directly connected to your company database and company policy rules. Ask me about workforce headcount, attendance rates, late-comers, leave balances, or company policies!',
      timestamp: 'Active',
      aiGenerated: true,
    },
  ]);
  const messagesEndRef = useRef(null);

  const queryTemplatesByRole = {
    ADMIN: [
      'How many active employees are in the company?',
      'Who came late most often this month?',
      "What is today's attendance rate?",
      'Summarize our latest payroll run',
      'Explain our leave policy and quotas',
    ],
    HR: [
      'How many active employees are in Engineering?',
      'Who came late most often this month?',
      "What is this month's attendance rate?",
      'Who is on leave today?',
      'Explain the office grace period rule',
    ],
    EMPLOYEE: [
      'How many sick leaves do I have left this year?',
      'Summarize my attendance record',
      "What is my colleague's salary?",
      'What are our working hours and grace period?',
      'How is payroll calculated?',
    ],
  };

  const queryTemplates = queryTemplatesByRole[currentRole] || queryTemplatesByRole.EMPLOYEE;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const userText = prompt.trim();
    if (!userText || isLoading) return;

    setPrompt('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: userText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setIsLoading(true);

    try {
      const res = await api.chatAi(userText);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.reply || 'No answer generated.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          aiGenerated: true,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: err.message || 'The AI assistant is temporarily unavailable. Please retry.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateClick = (tmpl) => {
    setPrompt(tmpl);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Workforce Assistant"
        subtitle="Natural language copilot answering real questions from your live HCM database with strict role-based access control."
        breadcrumbs={[{ label: 'AI Assistant' }]}
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-Time Database Tool-Calling</span>
        </span>
      </PageHeader>

      {/* Security & Access Scope Banner */}
      <div className="bg-gradient-to-r from-violet-50 via-indigo-50 to-white border border-violet-200 rounded-xl p-4 text-xs text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <strong className="font-semibold text-slate-900 block">
              Active Session Scope: {currentRole} Mode
            </strong>
            <span className="text-slate-500">
              {currentRole === 'EMPLOYEE'
                ? 'Your queries access only your personal attendance, leave balances, and payslips. Colleague financial data is strictly protected.'
                : 'Managerial tools enabled: Headcount, punctuality metrics, department attendance, and leave summaries.'}
            </span>
          </div>
        </div>
        <span className="font-mono text-[11px] text-indigo-700 font-semibold px-2.5 py-1 bg-white rounded border border-indigo-200 shrink-0">
          Tool-Calling Grounded
        </span>
      </div>

      {/* Chat Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col min-h-[500px]">
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
                    : msg.isError
                    ? 'bg-rose-600 text-white'
                    : 'bg-violet-600 text-white shadow-xs'
                }`}
              >
                {msg.role === 'user' ? 'U' : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`rounded-xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : msg.isError
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-semibold text-[11px] ${
                        msg.role === 'user' ? 'text-indigo-100' : 'text-slate-700'
                      }`}
                    >
                      {msg.role === 'user' ? 'You' : 'HCM Lite Intelligence'}
                    </span>
                    {msg.aiGenerated && (
                      <span className="text-[10px] bg-violet-100 text-violet-700 font-medium px-1.5 py-0.2 rounded border border-violet-200">
                        AI-generated
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] ${
                      msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
                <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-2xl">
              <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="rounded-xl p-4 bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                <span>Querying company database tools & analyzing rules...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Live Test Suggestions for {currentRole}
          </div>
          <div className="flex flex-wrap gap-2">
            {queryTemplates.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
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
              placeholder={`Ask in plain English or Roman Urdu as ${currentRole}...`}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 focus:bg-white transition-all text-slate-900 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Ask AI</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
