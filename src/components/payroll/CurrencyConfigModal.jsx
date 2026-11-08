import React, { useState } from 'react';
import { Coins, X, Check, AlertCircle } from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { CURRENCY_OPTIONS } from '../../utils/payrollCalculations.js';

export default function CurrencyConfigModal({ isOpen, onClose }) {
  const { companyProfile, updateCompanyProfile } = useOrganization();
  const { showToast } = useToast();

  const currentCurrency = companyProfile?.currency || null;
  const initialCode = currentCurrency?.code || 'USD';

  const [selectedCode, setSelectedCode] = useState(initialCode);
  const [customSymbol, setCustomSymbol] = useState(currentCurrency?.symbol || '$');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectPredefined = (opt) => {
    setSelectedCode(opt.code);
    setCustomSymbol(opt.symbol);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const match = CURRENCY_OPTIONS.find((c) => c.code === selectedCode);
      const currencyData = {
        code: selectedCode,
        symbol: customSymbol || match?.symbol || selectedCode,
        name: match ? match.name : `${selectedCode} Currency`,
      };

      updateCompanyProfile({
        currency: currencyData,
      });

      showToast({
        type: 'success',
        title: 'Currency Configured',
        message: `Organization currency set to ${currencyData.code} (${currencyData.symbol}). All compensation amounts will be formatted with this currency.`,
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Organization Currency</h3>
              <p className="text-xs text-slate-500">Configure financial display parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Primary Currency
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl">
              {CURRENCY_OPTIONS.map((opt) => {
                const isSelected = selectedCode === opt.code;
                return (
                  <button
                    type="button"
                    key={opt.code}
                    onClick={() => handleSelectPredefined(opt)}
                    className={`p-2 rounded-lg text-left text-xs transition-colors border ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-900'
                        : 'border-transparent hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt.code}</span>
                      <span className="font-mono text-slate-500">{opt.symbol}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{opt.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Currency Code
              </label>
              <input
                type="text"
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value.toUpperCase())}
                maxLength={5}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-mono uppercase bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Symbol
              </label>
              <input
                type="text"
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value)}
                maxLength={6}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-mono bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            This setting formats salary structures, payroll calculations, and employee payslips in the current session.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Currency</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
