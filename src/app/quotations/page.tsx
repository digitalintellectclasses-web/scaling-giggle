'use client';

import { useState, useRef } from 'react';
import { useFinance } from '@/store/FinanceContext';
import { useQuote, QuoteItem } from '@/store/QuoteContext';
import { useAuth } from '@/store/AuthContext';
import { Plus, Trash2, Download, FileText, Check, File } from 'lucide-react';
import { format } from 'date-fns';

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export default function QuotationsPage() {
  const { clients, isLoaded: financeLoaded } = useFinance();
  const { services, quotations, addQuotation } = useQuote();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  const [selectedClient, setSelectedClient] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  
  const [expiryDays, setExpiryDays] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  if (!financeLoaded) return <div className="h-full w-full flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-500 rounded-full border-t-transparent"></div></div>;

  const client = clients.find(c => c.id === selectedClient);
  
  const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
  const tax = subtotal * 0.18; // 18% GST (change if needed)
  const total = subtotal + tax;

  const handleAddItem = () => {
    const srv = services.find(s => s.id === selectedService);
    if (!srv || quantity <= 0) return;
    
    setItems([...items, {
      serviceId: srv.id,
      serviceName: srv.name,
      description: srv.description,
      quantity,
      rate: srv.rate,
      amount: srv.rate * quantity
    }]);
    
    setSelectedService('');
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleDownloadPdf = async (elementRef: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (typeof window === 'undefined' || !elementRef.current) return;
    setIsGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin:       0.5,
        filename:     filename,
        image:        { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' as 'portrait' }
      };
      await html2pdf().set(opt).from(elementRef.current).save();
    } catch (e) {
      console.error(e);
    }
    setIsGenerating(false);
  };

  const handleSaveQuotation = async () => {
    if (!selectedClient || items.length === 0 || !currentUser) return;
    
    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + expiryDays);

    await addQuotation({
      clientId: selectedClient,
      clientName: client?.name || '',
      createdBy: currentUser.id,
      createdByName: currentUser.displayName,
      date: now.toISOString(),
      expiryDate: expiry.toISOString(),
      items,
      subtotal,
      tax,
      total,
      status: 'draft',
      notes
    });
    
    // Reset form after saving
    setSelectedClient('');
    setItems([]);
    setNotes('');
    setActiveTab('history');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Quotations</h1>
          <p className="text-zinc-400">Create, preview, and download service quotations.</p>
        </div>
        <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800">
          <button 
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'create' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Create New
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Builder */}
          <div className="space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Quote Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Select Client</label>
                  <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-emerald-500 text-sm">
                    <option value="">-- Choose a client --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Valid for (Days)</label>
                    <input type="number" value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))}
                      className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-emerald-500 text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Line Items</h2>
              
              <div className="flex items-end gap-3 mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Service</label>
                  <select value={selectedService} onChange={e => setSelectedService(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-emerald-500 text-sm">
                    <option value="">-- Select a service --</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - ₹{s.rate}</option>)}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Quantity</label>
                  <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                    className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-emerald-500 text-sm" />
                </div>
                <button 
                  onClick={handleAddItem}
                  disabled={!selectedService}
                  className="bg-emerald-600 disabled:opacity-50 hover:bg-emerald-500 text-white p-2.5 rounded-xl transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                {items.length === 0 && <p className="text-zinc-500 text-sm italic text-center py-4">No items added yet.</p>}
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.serviceName}</p>
                      <p className="text-xs text-zinc-500">{item.quantity} x ₹{item.rate}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-emerald-400">₹{item.amount}</p>
                      <button onClick={() => handleRemoveItem(idx)} className="text-zinc-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Additional Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-emerald-500 text-sm resize-none"
                  placeholder="Terms, conditions, or message to client..." />
              </div>

              <div className="mt-6 flex gap-3">
                <button 
                  onClick={() => handleDownloadPdf(previewRef, `Quotation_${client?.name?.replace(/\s+/g, '_') || 'Draft'}.pdf`)}
                  disabled={items.length === 0 || isGenerating}
                  className="flex-1 bg-zinc-800 disabled:opacity-50 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {isGenerating ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" /> : <Download className="w-4 h-4" />}
                  Download PDF
                </button>
                <button 
                  onClick={handleSaveQuotation}
                  disabled={!selectedClient || items.length === 0}
                  className="flex-1 bg-emerald-600 disabled:opacity-50 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  <Check className="w-4 h-4" /> Save Quotation
                </button>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 overflow-x-auto relative">
            <h2 className="text-xl font-semibold text-white mb-4">Document Preview</h2>
            <div className="bg-white rounded-lg p-6 min-w-[600px] text-zinc-900 shadow-xl" ref={previewRef}>
              
              <div className="border-b-2 border-emerald-600 pb-6 mb-6 flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-black text-emerald-700 uppercase tracking-tighter">QUOTATION</h1>
                  <p className="text-sm font-semibold text-zinc-600 mt-2">Agency Dashboard</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-zinc-800">Date: {format(new Date(), 'dd MMM yyyy')}</p>
                  <p className="text-sm text-zinc-600">Valid Until: {format(new Date(Date.now() + expiryDays * 86400000), 'dd MMM yyyy')}</p>
                </div>
              </div>

              <div className="mb-8 flex justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Prepared For</p>
                  <p className="font-bold text-lg">{client ? client.name : 'Client Name'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Prepared By</p>
                  <p className="font-bold text-lg">{currentUser?.displayName || 'Admin'}</p>
                  <p className="text-zinc-600">Agency Representative</p>
                </div>
              </div>

              <table className="w-full mb-8">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-600 text-sm uppercase tracking-wider">
                    <th className="py-2 px-4 text-left font-semibold">Service Description</th>
                    <th className="py-2 px-4 text-center font-semibold w-24">Qty</th>
                    <th className="py-2 px-4 text-right font-semibold w-32">Rate</th>
                    <th className="py-2 px-4 text-right font-semibold w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-400 italic">Add services to populate the quotation</td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="border-b border-zinc-100">
                        <td className="py-4 px-4">
                          <p className="font-bold text-zinc-800">{item.serviceName}</p>
                          <p className="text-xs text-zinc-500 mt-1">{item.description}</p>
                        </td>
                        <td className="py-4 px-4 text-center text-zinc-700">{item.quantity}</td>
                        <td className="py-4 px-4 text-right text-zinc-700">{formatINR(item.rate)}</td>
                        <td className="py-4 px-4 text-right font-bold text-zinc-900">{formatINR(item.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="flex justify-end mb-8">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal</span>
                    <span>{formatINR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 pb-2 border-b border-zinc-200">
                    <span>Tax (18%)</span>
                    <span>{formatINR(tax)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-black text-xl pt-2">
                    <span>Total</span>
                    <span>{formatINR(total)}</span>
                  </div>
                </div>
              </div>

              {notes && (
                <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100 mb-8">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Notes & Terms</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{notes}</p>
                </div>
              )}

              <div className="text-center text-zinc-400 text-xs border-t border-zinc-200 pt-6 mt-10">
                <p>Thank you for your business. For any queries regarding this quotation, please contact us.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Saved Quotations</h2>
          {quotations.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <File className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No quotations have been saved yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-sm">
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Client</th>
                    <th className="py-3 px-4 font-medium">Prepared By</th>
                    <th className="py-3 px-4 font-medium text-right">Total</th>
                    <th className="py-3 px-4 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map(q => (
                    <tr key={q.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors text-sm">
                      <td className="py-4 px-4 text-zinc-300">{format(new Date(q.date), 'MMM dd, yyyy')}</td>
                      <td className="py-4 px-4 font-medium text-white">{q.clientName}</td>
                      <td className="py-4 px-4 text-zinc-400">{q.createdByName}</td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-400">{formatINR(q.total)}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                          ${q.status === 'draft' ? 'bg-zinc-500/10 text-zinc-400' : ''}
                          ${q.status === 'sent' ? 'bg-blue-500/10 text-blue-400' : ''}
                          ${q.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' : ''}
                          ${q.status === 'rejected' ? 'bg-red-500/10 text-red-400' : ''}
                        `}>
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
