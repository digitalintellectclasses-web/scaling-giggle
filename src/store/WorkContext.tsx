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
};

const WorkContext = createContext<WorkContextType | undefined>(undefined);

export function WorkProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { addNotification } = useNotifications();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Both admins and employees see tasks, but filtered differently in UI
    // Here we fetch all tasks the user is involved in (assigned to or created by)
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

    await updateDoc(doc(db, 'tasks', id), {
      status,
      history: arrayUnion(historyItem)
    });

    // If completed, notify the creator (admin)
    const task = tasks.find(t => t.id === id);
    if (task && status === 'completed') {
      await addNotification({
        type: 'work',
        message: `Task completed by ${task.assignedToName}: ${task.title}`,
        targetUserId: task.createdBy,
        relatedId: id
      });
    }
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id));
  };

  return (
    <WorkContext.Provider value={{ tasks, assignTask, updateTaskStatus, deleteTask }}>
      {children}
    </WorkContext.Provider>
  );
}

export function useWork() {
  const ctx = useContext(WorkContext);
  if (!ctx) throw new Error('useWork must be used within WorkProvider');
  return ctx;
}
