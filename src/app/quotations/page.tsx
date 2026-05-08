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
  const { services, quotations, addQuotation, pdfConfig } = useQuote();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  const [selectedClient, setSelectedClient] = useState('');
  const [customClientName, setCustomClientName] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [briefInfo, setBriefInfo] = useState('');
  
  const [customServiceName, setCustomServiceName] = useState('');
  const [customRate, setCustomRate] = useState(0);
  const [customBriefInfo, setCustomBriefInfo] = useState('');
  
  const [expiryDays, setExpiryDays] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');

  const previewRef = useRef<HTMLDivElement>(null);

  if (!financeLoaded) return <div className="h-full w-full flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-500 rounded-full border-t-transparent"></div></div>;

  const client = selectedClient === 'custom' 
    ? { id: 'custom', name: customClientName || 'Unnamed Client', email: '' }
    : clients.find(c => c.id === selectedClient);
  
  const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
  const tax = subtotal * 0.18; // 18% GST (change if needed)
  const total = subtotal + tax;

  const handleAddItem = () => {
    if (selectedService === 'custom') {
      if (!customServiceName || customRate <= 0 || quantity <= 0) return;
      setItems([...items, {
        serviceId: `custom_${Date.now()}`,
        serviceName: customServiceName,
        description: customBriefInfo.trim() || 'Custom added service',
        quantity,
        rate: customRate,
        amount: customRate * quantity
      }]);
      setSelectedService('');
      setCustomServiceName('');
      setCustomRate(0);
      setCustomBriefInfo('');
      setQuantity(1);
      return;
    }

    const srv = services.find(s => s.id === selectedService);
    if (!srv || quantity <= 0) return;
    
    setItems([...items, {
      serviceId: srv.id,
      serviceName: srv.name,
      description: briefInfo.trim() || srv.description,
      quantity,
      rate: srv.rate,
      amount: srv.rate * quantity
    }]);
    
    setSelectedService('');
    setBriefInfo('');
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
    if (!selectedClient || (selectedClient === 'custom' && !customClientName) || items.length === 0 || !currentUser) {
      alert('Please select a client (or enter a custom name) and add at least one item.');
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
      setCustomClientName('');
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
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Select Client</label>
                    <select value={selectedClient} onChange={e => {
                      setSelectedClient(e.target.value);
                      if (e.target.value !== 'custom') setCustomClientName('');
                    }}
                      className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-emerald-500 text-sm">
                      <option value="">-- Choose a client --</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      <option value="custom" className="font-bold text-emerald-400">+ Add Custom Client</option>
                    </select>
                  </div>
                  
                  {selectedClient === 'custom' && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="block text-xs font-medium text-emerald-500/80 mb-1">Enter Custom Client Name</label>
                      <input 
                        type="text" 
                        value={customClientName} 
                        onChange={e => setCustomClientName(e.target.value)}
                        placeholder="e.g. John Doe / Acme Corp"
                        className="block w-full px-3 py-2.5 bg-zinc-950 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-500 text-sm shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                      />
                    </div>
                  )}
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

                {selectedService && selectedService !== 'custom' && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[10px] font-medium text-emerald-400 mb-1 uppercase tracking-wider">Brief Info / Scope (optional)</label>
                    <textarea
                      value={briefInfo}
                      onChange={e => setBriefInfo(e.target.value)}
                      rows={2}
                      placeholder="Add a specific scope, deliverables, or note for this service line..."
                      className="block w-full px-3 py-2 bg-zinc-950/50 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-500 text-sm resize-none shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                    />
                  </div>
                )}

                {selectedService === 'custom' && (
                  <div className="flex flex-col gap-3 p-3 bg-zinc-950/50 rounded-xl border border-emerald-500/30">
                    <div className="flex gap-3">
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
                    <div>
                      <label className="block text-[10px] font-medium text-emerald-400 mb-1 uppercase tracking-wider">Brief Info / Scope (optional)</label>
                      <textarea
                        value={customBriefInfo}
                        onChange={e => setCustomBriefInfo(e.target.value)}
                        rows={2}
                        placeholder="Describe scope, deliverables, or any specifics..."
                        className="block w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:border-emerald-500 text-sm resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {items.length === 0 && <p className="text-zinc-500 text-sm italic text-center py-4">No items added yet.</p>}
                {items.map((item, idx) => (
                  <div key={idx} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{item.serviceName}</p>
                        <p className="text-xs text-zinc-500">{item.quantity} x ₹{item.rate}</p>
                        {item.description && item.description !== 'Custom added service' && (
                          <p className="text-xs text-zinc-400 mt-1 italic leading-relaxed line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <p className="font-bold text-emerald-400">₹{item.amount}</p>
                        <button onClick={() => handleRemoveItem(idx)} className="text-zinc-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
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
            <div ref={previewRef} style={{
              background: 'linear-gradient(135deg, #03071e 0%, #051030 40%, #0a1628 100%)',
              color: '#ffffff',
              padding: '48px',
              minWidth: '700px',
              borderRadius: '12px',
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              position: 'relative',
              overflow: 'hidden',
            }}>

              {/* Background circuit glow effects */}
              <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(0,180,216,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(0,119,182,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

              {/* ── HEADER ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                {/* Left: Big QUOTATION title */}
                <div>
                  <h1 style={{ fontSize: '52px', fontWeight: 900, color: '#ffffff', margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>QUOTATION</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <div style={{ width: '32px', height: '3px', background: 'linear-gradient(90deg, #00b4d8, #0096c7)', borderRadius: '2px' }} />
                    <span style={{ fontSize: '13px', color: '#00b4d8', fontWeight: 700, letterSpacing: '0.05em' }}>#QT-{format(new Date(), 'yyyyMM')}-{Math.floor(100 + Math.random() * 900)}</span>
                  </div>
                  <div style={{ marginTop: '20px', fontSize: '13px', color: '#90e0ef', lineHeight: '2' }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <span style={{ color: '#48cae4', fontWeight: 600 }}>Date</span>
                      <span style={{ color: '#94a3b8' }}>:</span>
                      <span>{format(new Date(), 'dd MMM yyyy')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '14px' }}>
                      <span style={{ color: '#48cae4', fontWeight: 600 }}>Valid Till</span>
                      <span style={{ color: '#94a3b8' }}>:</span>
                      <span style={{ color: '#f87171' }}>{format(new Date(Date.now() + expiryDays * 86400000), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Agency Info */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <p style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{pdfConfig.agencyName}</p>
                    </div>
                    <div style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg, #00b4d8, #0077b6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px', color: '#fff', flexShrink: 0 }}>
                      {pdfConfig.agencyName.charAt(0)}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#90e0ef', lineHeight: '1.8', whiteSpace: 'pre-wrap', textAlign: 'right' }}>
                    <p style={{ margin: 0 }}>{pdfConfig.website}</p>
                    <p style={{ margin: 0 }}>{pdfConfig.address}</p>
                    <p style={{ margin: 0 }}>{pdfConfig.contact}</p>
                  </div>

                  {/* Bill To */}
                  <div style={{ marginTop: '18px', textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>Bill To</p>
                    <p style={{ fontWeight: 800, fontSize: '16px', color: '#ffffff', margin: 0 }}>{client ? client.name : 'Client Name'}</p>
                    <p style={{ fontSize: '12px', color: '#90e0ef', margin: 0 }}>{currentUser?.displayName || 'Account Executive'}</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #00b4d8 30%, #0077b6 70%, transparent)', marginBottom: '36px' }} />

              {/* ── TABLE ── */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: '14px', overflow: 'hidden', marginBottom: '32px' }}>
                {/* Pill Header Row */}
                <div style={{ display: 'flex', gap: '8px', padding: '14px 20px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(0,180,216,0.15)', alignItems: 'center' }}>
                  <div style={{ flex: '1 1 55%', background: 'linear-gradient(135deg, #00b4d8, #0096c7)', borderRadius: '50px', padding: '8px 18px', fontSize: '12px', fontWeight: 800, color: '#fff', textAlign: 'left', letterSpacing: '0.04em' }}>Description</div>
                  <div style={{ flex: '0 0 60px', background: 'linear-gradient(135deg, #00b4d8, #0096c7)', borderRadius: '50px', padding: '8px 0', fontSize: '12px', fontWeight: 800, color: '#fff', textAlign: 'center', letterSpacing: '0.04em' }}>Qty</div>
                  <div style={{ flex: '0 0 130px', background: 'linear-gradient(135deg, #00b4d8, #0096c7)', borderRadius: '50px', padding: '8px 18px', fontSize: '12px', fontWeight: 800, color: '#fff', textAlign: 'right', letterSpacing: '0.04em' }}>Price</div>
                  <div style={{ flex: '0 0 130px', background: 'linear-gradient(135deg, #00b4d8, #0096c7)', borderRadius: '50px', padding: '8px 18px', fontSize: '12px', fontWeight: 800, color: '#fff', textAlign: 'right', letterSpacing: '0.04em' }}>Total</div>
                </div>

                {/* Rows */}
                {items.length === 0 ? (
                  <div style={{ padding: '50px', textAlign: 'center', color: '#64748b', fontStyle: 'italic', fontSize: '14px' }}>
                    No line items added to this quotation yet.
                  </div>
                ) : (
                  items.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      gap: '8px',
                      padding: '16px 20px',
                      alignItems: 'flex-start',
                      borderBottom: idx < items.length - 1 ? '1px solid rgba(0,180,216,0.08)' : 'none',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(0,180,216,0.03)',
                    }}>
                      <div style={{ flex: '1 1 55%' }}>
                        <p style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px', margin: 0, marginBottom: item.description ? '5px' : 0 }}>{item.serviceName}</p>
                        {item.description && (
                          <p style={{ fontSize: '12px', color: '#90e0ef', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>{item.description}</p>
                        )}
                      </div>
                      <div style={{ flex: '0 0 60px', textAlign: 'center', color: '#e0f7fa', fontSize: '14px', fontWeight: 600 }}>{item.quantity}</div>
                      <div style={{ flex: '0 0 130px', textAlign: 'right', color: '#90e0ef', fontSize: '14px' }}>{formatINR(item.rate)}</div>
                      <div style={{ flex: '0 0 130px', textAlign: 'right', color: '#ffffff', fontSize: '14px', fontWeight: 700 }}>{formatINR(item.amount)}</div>
                    </div>
                  ))
                )}

                {/* Totals inside table card */}
                <div style={{ borderTop: '1px solid rgba(0,180,216,0.2)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '280px' }}>
                    <span style={{ color: '#90e0ef', fontSize: '13px' }}>Subtotal</span>
                    <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '13px' }}>{formatINR(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '280px' }}>
                    <span style={{ color: '#90e0ef', fontSize: '13px' }}>GST / Tax (18%)</span>
                    <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '13px' }}>{formatINR(tax)}</span>
                  </div>
                  <div style={{ width: '280px', height: '1px', background: 'rgba(0,180,216,0.3)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '280px' }}>
                    <span style={{ color: '#00b4d8', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grand Total</span>
                    <span style={{ color: '#00b4d8', fontSize: '22px', fontWeight: 900 }}>{formatINR(total)}</span>
                  </div>
                </div>
              </div>

              {/* ── FOOTER ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '10px' }}>
                {/* Payment Info */}
                <div>
                  <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #00b4d8, #0096c7)', borderRadius: '50px', padding: '7px 18px', fontSize: '11px', fontWeight: 800, color: '#fff', marginBottom: '14px', letterSpacing: '0.05em' }}>
                    Payment Information
                  </div>
                  <div style={{ fontSize: '12px', color: '#90e0ef', lineHeight: '2.2' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span style={{ color: '#48cae4', fontWeight: 600, minWidth: '80px' }}>Account</span>
                      <span style={{ color: '#94a3b8' }}>:</span>
                      <span>{pdfConfig.agencyName}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span style={{ color: '#48cae4', fontWeight: 600, minWidth: '80px' }}>Contact</span>
                      <span style={{ color: '#94a3b8' }}>:</span>
                      <span>{pdfConfig.contact}</span>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div>
                  <p style={{ fontWeight: 800, fontSize: '13px', color: '#ffffff', marginBottom: '12px', margin: '0 0 12px 0' }}>Terms and Conditions:</p>
                  <div style={{ fontSize: '12px', color: '#90e0ef', lineHeight: '1.9' }}>
                    <p style={{ margin: 0 }}>• This quotation is valid for {expiryDays} days from the date of issue.</p>
                    <p style={{ margin: 0 }}>• 50% advance payment required to commence work.</p>
                    <p style={{ margin: 0 }}>• Remaining 50% due upon project completion.</p>
                    {notes && <p style={{ margin: '8px 0 0 0', color: '#48cae4', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{notes}</p>}
                  </div>
                </div>
              </div>

              {/* Bottom teal glow line */}
              <div style={{ height: '3px', background: 'linear-gradient(90deg, transparent, #00b4d8 30%, #0077b6 70%, transparent)', marginTop: '40px', borderRadius: '2px' }} />
              <p style={{ textAlign: 'center', fontSize: '11px', color: '#475569', marginTop: '12px', margin: '12px 0 0 0' }}>{pdfConfig.website} • {pdfConfig.footerText}</p>
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
