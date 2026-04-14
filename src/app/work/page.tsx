'use client';

import React, { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { useWork, Task, TaskStatus } from '@/store/WorkContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WorkPage() {
  const { currentUser } = useAuth();
  const { tasks, assignTask, updateTaskStatus } = useWork();
  const { users } = useAuth(); // All users for assignment
  const [isAssigning, setIsAssigning] = useState(false);

  // Filter tasks: Employees only see their own. Admins see all.
  const filteredTasks = currentUser?.role === 'admin' 
    ? tasks 
    : tasks.filter(t => t.assignedTo === currentUser?.id);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="p-4 md:p-8 space-y-8 pb-32 md:pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <ClipboardList className="text-emerald-500 w-8 h-8" />
            Work Allotments
          </h1>
          <p className="text-zinc-500 mt-1">Manage tasks and track work progress.</p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setIsAssigning(true)}
            className="flex items-center gap-2 bg-emerald-500 text-black px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            <UserPlus className="w-5 h-5" />
            New Allotment
          </button>
        )}
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <StatsCard 
           title="Pending" 
           count={filteredTasks.filter(t => t.status === 'pending').length} 
           icon={AlertCircle}
           color="text-amber-400"
           bg="bg-amber-400/10"
         />
         <StatsCard 
           title="In Progress" 
           count={filteredTasks.filter(t => t.status === 'in-progress').length} 
           icon={Clock}
           color="text-emerald-400"
           bg="bg-emerald-400/10"
         />
         <StatsCard 
           title="Completed" 
           count={filteredTasks.filter(t => t.status === 'completed').length} 
           icon={CheckCircle2}
           color="text-zinc-400"
           bg="bg-zinc-400/10"
         />
      </div>

      {/* Task List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
           Task Roll
           <span className="text-xs font-normal text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
             {filteredTasks.length} total
           </span>
        </h2>
        
        {filteredTasks.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl p-12 text-center">
             <ClipboardList className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
             <p className="text-zinc-500">No active allotments found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* New Allotment Modal */}
      {isAssigning && isAdmin && (
        <AssignModal 
          onClose={() => setIsAssigning(false)} 
          employees={users.filter(u => u.role === 'employee')}
          onSubmit={assignTask}
        />
      )}
    </div>
  );
}

function StatsCard({ title, count, icon: Icon, color, bg }: any) {
  return (
    <div className={cn("p-6 rounded-2xl border border-zinc-800", bg)}>
      <div className="flex items-center justify-between">
        <Icon className={cn("w-6 h-6", color)} />
        <span className="text-2xl font-black text-white">{count}</span>
      </div>
      <p className="text-zinc-500 text-sm font-bold uppercase mt-2">{title}</p>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const { currentUser } = useAuth();
  const { updateTaskStatus } = useWork();
  const [showHistory, setShowHistory] = useState(false);

  const isAssignedToMe = currentUser?.id === task.assignedTo;
  const isAdmin = currentUser?.role === 'admin';

  const statusColors = {
    'pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'in-progress': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'completed': 'bg-zinc-800 text-zinc-500 border-zinc-700',
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-white leading-tight">{task.title}</h3>
            <p className="text-zinc-500 text-sm">{task.description}</p>
          </div>
          <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap", statusColors[task.status])}>
            {task.status.replace('-', ' ')}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
           <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-400">
                {task.assignedToName.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-zinc-400">{task.assignedToName}</span>
           </div>
           <div className="text-[10px] text-zinc-600 font-medium">
              Assigned {new Date(task.createdAt?.seconds * 1000).toLocaleDateString()}
           </div>
        </div>

        {/* Action Buttons for Employees */}
        {isAssignedToMe && task.status !== 'completed' && (
          <div className="flex gap-2 pt-2">
            {task.status === 'pending' && (
              <button 
                onClick={() => updateTaskStatus(task.id, 'in-progress')}
                className="flex-1 bg-emerald-500 text-black py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" /> Start Work
              </button>
            )}
            {task.status === 'in-progress' && (
              <button 
                onClick={() => {
                  const note = prompt('Add completion note (optional):');
                  updateTaskStatus(task.id, 'completed', note || undefined);
                }}
                className="flex-1 bg-zinc-100 text-black py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Finalize Output
              </button>
            )}
          </div>
        )}

        {/* History Toggle */}
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="w-full py-2 bg-zinc-800/30 rounded-lg text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2"
        >
          <History className="w-3 h-3" />
          {showHistory ? 'Hide History' : 'View History Log'}
        </button>

        {showHistory && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="space-y-3 pt-2"
          >
            {task.history.map((h, i) => (
              <div key={i} className="flex gap-3 relative">
                {i < task.history.length - 1 && (
                  <div className="absolute left-1.5 top-4 bottom-0 w-px bg-zinc-800" />
                )}
                <div className={cn(
                  "w-3 h-3 rounded-full mt-1 border-2 border-zinc-900 z-10",
                  h.status === 'completed' ? 'bg-emerald-500' : h.status === 'in-progress' ? 'bg-amber-500' : 'bg-zinc-600'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-300 capitalize">{h.status}</span>
                    <span className="text-[9px] text-zinc-600">
                      {new Date(h.timestamp?.seconds * 1000).toLocaleString()}
                    </span>
                  </div>
                  {h.note && <p className="text-[10px] text-zinc-500 leading-relaxed italic mt-0.5">{h.note}</p>}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function AssignModal({ onClose, employees, onSubmit }: any) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: employees[0]?.id || '',
  });

  const handleApply = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const selectedEmp = employees.find((e: any) => e.id === formData.assignedTo);
    await onSubmit({
      ...formData,
      assignedToName: selectedEmp?.displayName || 'Unknown',
      createdBy: currentUser?.id,
      createdByName: currentUser?.displayName || 'Admin',
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg bg-[#121214] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">New Work Allotment</h2>
            <p className="text-zinc-500 text-sm mt-1">Assign a new task to your team.</p>
          </div>

          <form onSubmit={handleApply} className="space-y-4">
             <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Task Title</label>
                <input 
                  required
                  placeholder="e.g., Update Inventory Spreadsheet"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
             </div>
             <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Assign To</label>
                <select 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 appearance-none"
                  value={formData.assignedTo}
                  onChange={e => setFormData({...formData, assignedTo: e.target.value})}
                >
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                  ))}
                </select>
             </div>
             <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Requirements & Details</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Describe the work expected..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
             </div>

             <div className="flex gap-3 pt-4">
                <button type="button" onClick={onClose} className="flex-1 py-3 font-bold text-zinc-500 hover:text-white transition-colors">Cancel</button>
                <button 
                  disabled={loading}
                  className="flex-1 bg-white text-black py-3 rounded-2xl font-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Assigning...' : <><Send className="w-4 h-4" /> Send Task</>}
                </button>
             </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
