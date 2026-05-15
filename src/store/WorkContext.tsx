'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion
} from 'firebase/firestore';

export type TaskStatus = 'pending' | 'in-progress' | 'completed';

export type TaskHistory = {
  status: TaskStatus;
  timestamp: any;
  note?: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // User ID
  assignedToName: string;
  createdBy: string; // User ID
  createdByName: string;
  status: TaskStatus;
  createdAt: any;
  history: TaskHistory[];
};

type WorkContextType = {
  tasks: Task[];
  assignTask: (task: Omit<Task, 'id' | 'createdAt' | 'history' | 'status'>) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus, note?: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  resetGuestWorkData: () => void;
};

const WorkContext = createContext<WorkContextType | undefined>(undefined);

export function WorkProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, users } = useAuth();
  const { addNotification } = useNotifications();
  const [tasks, setTasks] = useState<Task[]>([]);
  const guestResetDoneRef = React.useRef(false);

  // Initialize from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const done = sessionStorage.getItem('ag_guest_reset_done') === 'true';
      guestResetDoneRef.current = done;
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.id === 'guest') {
      const isReset = typeof window !== 'undefined' && sessionStorage.getItem('ag_guest_reset_done') === 'true';
      if (!isReset && !guestResetDoneRef.current) {
        const mockNow = Timestamp.now();
        setTasks([
          {
            id: 'mock_task_1',
            title: 'Logo Design for Tech Corp',
            description: 'Create 3 variations of the primary logo.',
            assignedTo: 'usr_guest4',
            assignedToName: 'Sarah Designer',
            createdBy: 'guest',
            createdByName: 'John Doe',
            status: 'pending',
            createdAt: mockNow,
            history: [{ status: 'pending', timestamp: mockNow, note: 'Task assigned.' }]
          },
          {
            id: 'mock_task_2',
            title: 'SEO Audit',
            description: 'Complete the monthly technical SEO audit.',
            assignedTo: 'usr_guest3',
            assignedToName: 'Alex Worker',
            createdBy: 'guest',
            createdByName: 'Jane Smith',
            status: 'completed',
            createdAt: mockNow,
            history: [{ status: 'completed', timestamp: mockNow, note: 'Task completed.' }]
          }
        ]);
      }
      return;
    }

    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Task)));
    });

    return () => unsub();
  }, [currentUser]);

  const assignTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'history' | 'status'>) => {
    const historyItem: TaskHistory = {
      status: 'pending',
      timestamp: Timestamp.now(),
      note: 'Task assigned.'
    };

    if (currentUser?.id === 'guest') {
      const id = crypto.randomUUID();
      setTasks(prev => [{
        ...taskData,
        id,
        status: 'pending',
        createdAt: Timestamp.now(),
        history: [historyItem]
      } as Task, ...prev]);
      console.log('Guest Mode: Task assigned.');
      return;
    }

    const docRef = await addDoc(collection(db, 'tasks'), {
      ...taskData,
      status: 'pending',
      createdAt: Timestamp.now(),
      history: [historyItem]
    });

    // Notify the employee
    await addNotification({
      type: 'work',
      message: `New task assigned: ${taskData.title}`,
      targetUserId: taskData.assignedTo,
      relatedId: docRef.id
    });
  };

  const updateTaskStatus = async (id: string, status: TaskStatus, note?: string) => {
    const historyItem: TaskHistory = {
      status,
      timestamp: Timestamp.now(),
      note: note || `Status updated to ${status}.`
    };

    if (currentUser?.id === 'guest') {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status, history: [...t.history, historyItem] } : t));
      console.log(`Guest Mode: Task updated to ${status}.`);
      return;
    }

    await updateDoc(doc(db, 'tasks', id), {
      status,
      history: arrayUnion(historyItem)
    });

    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const statusLabel: Record<TaskStatus, string> = {
      'pending': '⏳ Pending',
      'in-progress': '🔄 In Progress',
      'completed': '✅ Completed',
    };

    // Notify the task creator if not the one updating
    if (task.createdBy !== currentUser?.id) {
      await addNotification({
        type: 'work',
        message: `${statusLabel[status]}: "${task.title}" updated by ${currentUser?.displayName ?? task.assignedToName}`,
        targetUserId: task.createdBy,
        relatedId: id
      });
    }

    // Notify all other admins who are neither the updater nor already the creator
    const allAdmins = users.filter(
      u => u.role === 'admin' && u.id !== currentUser?.id && u.id !== task.createdBy
    );
    for (const admin of allAdmins) {
      await addNotification({
        type: 'work',
        message: `${statusLabel[status]}: Task "${task.title}" (assigned to ${task.assignedToName}) — updated by ${currentUser?.displayName}`,
        targetUserId: admin.id,
        relatedId: id
      });
    }

    // Notify the assigned employee if an admin changed the status
    if (currentUser?.role === 'admin' && task.assignedTo !== currentUser?.id) {
      await addNotification({
        type: 'work',
        message: `${statusLabel[status]}: Your task "${task.title}" was marked ${status} by ${currentUser?.displayName}`,
        targetUserId: task.assignedTo,
        relatedId: id
      });
    }
  };

  const deleteTask = async (id: string) => {
    if (currentUser?.id === 'guest') {
      setTasks(prev => prev.filter(t => t.id !== id));
      console.log('Guest Mode: Task deleted.');
      return;
    }

    const task = tasks.find(t => t.id === id);
    await deleteDoc(doc(db, 'tasks', id));
    if (task && currentUser) {
      const allAdmins = users.filter(u => u.role === 'admin' && u.id !== currentUser.id);
      for (const admin of allAdmins) {
        await addNotification({
          type: 'work',
          message: `🗑️ ${currentUser.displayName} deleted task: "${task.title}" (was assigned to ${task.assignedToName})`,
          targetUserId: admin.id,
          relatedId: id
        });
      }
    }
  };

  const resetGuestWorkData = () => {
    guestResetDoneRef.current = true;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ag_guest_reset_done', 'true');
    }
    setTasks([]);
  };

  return (
    <WorkContext.Provider value={{ tasks, assignTask, updateTaskStatus, deleteTask, resetGuestWorkData }}>
      {children}
    </WorkContext.Provider>
  );
}

export function useWork() {
  const ctx = useContext(WorkContext);
  if (!ctx) throw new Error('useWork must be used within WorkProvider');
  return ctx;
}
