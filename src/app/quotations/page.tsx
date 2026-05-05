'use client';

import { useState, useRef } from 'react';
import { useFinance } from '@/store/FinanceContext';
import { useQuote, QuoteItem } from '@/store/QuoteContext';
import { useAuth } from '@/store/AuthContext';
import { Plus, Trash2, Download, FileText, Check, File, Mail, Loader2 } from 'lucide-react';
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
  
  const [customServiceName, setCustomServiceName] = useState('');
  const [customRate, setCustomRate] = useState(0);
  
  const [expiryDays, setExpiryDays] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');

  const previewRef = useRef<HTMLDivElement>(null);

  if (!financeLoaded) return <div className="h-full w-full flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-500 rounded-full border-t-transparent"></div></div>;

  const client = clients.find(c => c.id === selectedClient);
  
  const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
  const tax = subtotal * 0.18; // 18% GST (change if needed)
  const total = subtotal + tax;

  const handleAddItem = () => {
    if (selectedService === 'custom') {
      if (!customServiceName || customRate <= 0 || quantity <= 0) return;
      setItems([...items, {
        serviceId: `custom_${Date.now()}`,
        serviceName: customServiceName,
        description: 'Custom added service',
        quantity,
        rate: customRate,
        amount: customRate * quantity
      }]);
      setSelectedService('');
      setCustomServiceName('');
      setCustomRate(0);
      setQuantity(1);
      return;
    }

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
    
    // Give UI a moment to update the loading state before blocking the main thread
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      // Create a clean clone to prevent mutating or locking the active DOM
      const element = elementRef.current;
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt = {
        margin:       0.5,
        filename:     filename,
        image:        { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' as 'portrait' }
      };
      
      // Explicitly wait for save
      await html2pdf().from(element).set(opt).save();
    } catch (e) {
      console.error("PDF generation error: ", e);
      alert("Failed to generate PDF. Please try again or use the print function (Ctrl+P).");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuotation = async () => {
    if (!selectedClient || items.length === 0 || !currentUser) {
      alert('Please select a client and add at least one item.');
      return;
    }
    
    setIsGenerating(true); // Reuse generating state for save loading
    try {
      const now = new Date();
      const expiry = new Date();
      expiry.setDate(now.getDate() + expiryDays);

      await addQuotation({
        clientId: selectedClient,
        clientName: client?.name || 'Unknown Client',
        createdBy: currentUser.id,
        createdByName: currentUser.displayName,
        date: now.toISOString(),
        expiryDate: expiry.toISOString(),
        items,
        subtotal,
        tax,
        total,
        status: 'draft',
        notes: notes || ''
      });
      
      alert('✓ Quotation saved to history.');
      // Reset form after saving
      setSelectedClient('');
      setItems([]);
      setNotes('');
      setActiveTab('history');
    } catch (err: any) {
      console.error('Save error:', err);
      alert(`Failed to save: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEmailWithPrompt = () => {
    console.log('Opening Email Modal');
    if (client?.email) {
      setTargetEmail(client.email);
    } else {
      setTargetEmail('');
    }
    setShowEmailModal(true);
  };

  const handleEmailInvoice = async () => {
    if (!selectedClient || items.length === 0 || !client || !targetEmail) {
      alert('Please select a client, add items, and enter a valid email.');
      return;
    }
    
    setIsEmailing(true);
    setShowEmailModal(false);
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          clientName: client.name,
          amount: total,
          invoiceUrl: '#',
          type: 'quotation'
        })
      });
      
      const data = await res.json();
      if (res.ok) alert('✓ Quotation emailed successfully!');
      else throw new Error(data.error?.message || data.error || 'Failed to send email');
    } catch (err: any) {
      console.error('Email error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsEmailing(false);
    }
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
              
              <div className="flex flex-col mb-6 gap-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Service</label>
                    <select value={selectedService} onChange={e => setSelectedService(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-emerald-500 text-sm">
                      <option value="">-- Select a service --</option>
                      {services.map(s => <option key={s.id} value={s.id}>{s.name} - ₹{s.rate}</option>)}
                      <option value="custom" className="font-bold text-emerald-400">+ Add Custom Service</option>
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Qty</label>
                    <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                      className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-emerald-500 text-sm" />
                  </div>
                  <button 
                    onClick={handleAddItem}
                    disabled={!selectedService}
                    className="bg-emerald-600 disabled:opacity-50 hover:bg-emerald-500 text-white p-2.5 rounded-xl transition-all h-[42px] mt-auto"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {selectedService === 'custom' && (
                  <div className="flex items-end gap-3 p-3 bg-zinc-950/50 rounded-xl border border-emerald-500/30">
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-emerald-400 mb-1 uppercase tracking-wider">Custom Service Name</label>
                      <input type="text" value={customServiceName} onChange={e => setCustomServiceName(e.target.value)} placeholder="e.g. Ad-hoc Consulting"
                        className="block w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:border-emerald-500 text-sm" />
                    </div>
                    <div className="w-32">
                      <label className="block text-[10px] font-medium text-emerald-400 mb-1 uppercase tracking-wider">Rate (₹)</label>
                      <input type="number" min="0" value={customRate} onChange={e => setCustomRate(Number(e.target.value))}
                        className="block w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:border-emerald-500 text-sm" />
                    </div>
                  </div>
                )}
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

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => handleDownloadPdf(previewRef, `Quotation_${client?.name?.replace(/\s+/g, '_') || 'Draft'}.pdf`)}
                  disabled={items.length === 0 || isGenerating}
                  className="flex-1 bg-zinc-800 disabled:opacity-50 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  PDF
                </button>
                <button 
                  onClick={handleEmailWithPrompt}
                  disabled={items.length === 0 || isEmailing || !selectedClient}
                  className="flex-1 bg-blue-600 disabled:opacity-50 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {isEmailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Email
                </button>
                <button 
                  onClick={handleSaveQuotation}
                  disabled={!selectedClient || items.length === 0}
                  className="flex-1 bg-emerald-600 disabled:opacity-50 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  <Check className="w-4 h-4" /> Save
                </button>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 overflow-x-auto relative">
            <h2 className="text-xl font-semibold text-white mb-4">Document Preview</h2>
            <div ref={previewRef} style={{ backgroundColor: '#ffffff', color: '#0f172a', padding: '40px', minWidth: '700px', borderRadius: '8px', fontFamily: 'system-ui, sans-serif' }}>
              
              {/* Premium Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '4px solid #10b981', paddingBottom: '30px', marginBottom: '40px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#10b981', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'white', fontWeight: 900, fontSize: '24px' }}>A</div>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>PRIME CREATIVE</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                    <p style={{ margin: 0 }}>123 Innovation Way, Suite 500</p>
                    <p style={{ margin: 0 }}>Tech District, Mumbai 400001</p>
                    <p style={{ margin: 0 }}>+91 98765 43210 | hello@primecreative.com</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ fontSize: '42px', fontWeight: 900, color: '#10b981', margin: 0, lineHeight: 1 }}>QUOTATION</h1>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginTop: '8px', margin: 0 }}>REF: #QT-{Math.floor(1000 + Math.random() * 9000)}</p>
                  <div style={{ marginTop: '20px', fontSize: '14px' }}>
                    <p style={{ margin: 0 }}><strong>Date:</strong> {format(new Date(), 'dd MMM yyyy')}</p>
                    <p style={{ margin: 0, color: '#ef4444' }}><strong>Expires:</strong> {format(new Date(Date.now() + expiryDays * 86400000), 'dd MMM yyyy')}</p>
                  </div>
                </div>
              </div>

              {/* Info Section */}
              <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
                <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #334155' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', margin: 0 }}>Client Information</p>
                  <p style={{ fontWeight: 800, fontSize: '20px', color: '#1e293b', margin: 0 }}>{client ? client.name : 'Client Name'}</p>
                  <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', margin: 0 }}>{client?.email || 'client@example.com'}</p>
                </div>
                <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', margin: 0 }}>Account Executive</p>
                  <p style={{ fontWeight: 800, fontSize: '20px', color: '#1e293b', margin: 0 }}>{currentUser?.displayName || 'Senior Consultant'}</p>
                  <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', margin: 0 }}>Authorized Representative</p>
                </div>
              </div>

              {/* Table Section */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description of Services</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>Qty</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '140px' }}>Unit Price</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '140px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '15px' }}>
                        No line items added to this quotation yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfc' }}>
                        <td style={{ padding: '20px 16px' }}>
                          <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', margin: 0 }}>{item.serviceName}</p>
                          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', margin: 0, maxWidth: '400px' }}>{item.description}</p>
                        </td>
                        <td style={{ padding: '20px 16px', textAlign: 'center', color: '#475569', fontSize: '15px' }}>{item.quantity}</td>
                        <td style={{ padding: '20px 16px', textAlign: 'right', color: '#475569', fontSize: '15px' }}>{formatINR(item.rate)}</td>
                        <td style={{ padding: '20px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '16px' }}>{formatINR(item.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Totals Section */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '80px', padding: '0 16px', marginBottom: '60px' }}>
                <div style={{ width: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '15px', marginBottom: '12px' }}>
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 600 }}>{formatINR(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '15px', marginBottom: '12px' }}>
                    <span>GST / Sales Tax (18%)</span>
                    <span style={{ fontWeight: 600 }}>{formatINR(tax)}</span>
                  </div>
                  <div style={{ borderTop: '2px solid #e2e8f0', marginTop: '16px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 900, fontSize: '28px' }}>
                    <span>TOTAL</span>
                    <span>{formatINR(total)}</span>
                  </div>
                </div>
              </div>

              {/* Footer / Terms Section */}
              <div style={{ marginTop: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '30px' }}>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', margin: 0 }}>Terms & Conditions</p>
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                      <p style={{ margin: 0 }}>1. This quotation is valid for {expiryDays} days from the date of issue.</p>
                      <p style={{ margin: 0 }}>2. 50% advance payment required to commence work.</p>
                      <p style={{ margin: 0 }}>3. Remaining 50% due upon project completion and approval.</p>
                    </div>
                  </div>
                  {notes && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', margin: 0 }}>Internal Notes</p>
                      <p style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'pre-wrap', margin: 0 }}>{notes}</p>
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '60px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: 0 }}>Thank you for choosing Prime Creative Agency.</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>www.primecreative.com | Powered by Agency Dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Saved Quotations & Invoices</h2>
            <div className="flex gap-4 mt-4 md:mt-0">
              <div className="bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-xl text-center">
                <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1">Total Unpaid</p>
                <p className="text-sm font-black text-red-400">{formatINR(quotations.filter(q => q.status === 'accepted' && q.paymentStatus !== 'paid').reduce((acc, q) => acc + (q.total - (q.amountPaid || 0)), 0))}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-xl text-center">
                <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1">Total Collected</p>
                <p className="text-sm font-black text-emerald-400">{formatINR(quotations.filter(q => q.status === 'accepted').reduce((acc, q) => acc + (q.amountPaid || 0), 0))}</p>
              </div>
            </div>
          </div>
          
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
                    <th className="py-3 px-4 font-medium text-center">Payment</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
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
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer
                          ${q.status === 'draft' ? 'bg-zinc-500/10 text-zinc-400' : ''}
                          ${q.status === 'sent' ? 'bg-blue-500/10 text-blue-400' : ''}
                          ${q.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' : ''}
                          ${q.status === 'rejected' ? 'bg-red-500/10 text-red-400' : ''}
                        `} onClick={() => {
                          const nextStatus: any = { draft: 'sent', sent: 'accepted', accepted: 'rejected', rejected: 'draft' };
                          updateQuotationStatus(q.id, nextStatus[q.status]);
                        }}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {q.status === 'accepted' ? (
                          <div className="flex flex-col items-center">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                              ${(!q.paymentStatus || q.paymentStatus === 'unpaid') ? 'bg-red-500/10 text-red-400' : ''}
                              ${q.paymentStatus === 'partial' ? 'bg-amber-500/10 text-amber-400' : ''}
                              ${q.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : ''}
                            `}>
                              {q.paymentStatus || 'unpaid'}
                            </span>
                            {q.paymentStatus === 'partial' && (
                              <span className="text-[10px] text-zinc-500 mt-1">{formatINR(q.amountPaid || 0)} / {formatINR(q.total)}</span>
                            )}
                            {q.paymentStatus !== 'paid' && new Date(q.expiryDate) < new Date() && (
                              <span className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse">
                                OVERDUE
                              </span>
                            )}
                          </div>
                        ) : <span className="text-zinc-600 text-[10px]">-</span>}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {q.status === 'accepted' && (
                          <button 
                            onClick={() => {
                              const amount = prompt(`Enter new amount paid for ${q.clientName} (Total: ${q.total}):`, (q.amountPaid || 0).toString());
                              if (amount !== null) {
                                const parsed = parseFloat(amount);
                                if (!isNaN(parsed) && parsed >= 0) {
                                  let newStatus: 'unpaid' | 'partial' | 'paid' = 'partial';
                                  if (parsed === 0) newStatus = 'unpaid';
                                  if (parsed >= q.total) newStatus = 'paid';
                                  updateQuotationPayment(q.id, { paymentStatus: newStatus, amountPaid: parsed });
                                }
                              }
                            }}
                            className="text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded transition-colors"
                          >
                            Update Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Send Quotation</h3>
            </div>
            <p className="text-zinc-400 text-sm mb-6">Enter the recipient's email address to send this document professionally via Resend.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Recipient Email</label>
                <input 
                  type="email" 
                  value={targetEmail} 
                  onChange={e => setTargetEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEmailInvoice}
                  disabled={!targetEmail || !targetEmail.includes('@')}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" /> Send Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
