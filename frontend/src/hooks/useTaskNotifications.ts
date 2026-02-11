import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface TaskNotificationParams {
  userId: string;
  referenceId: string;
  taskTitle: string;
  taskPage: string;
}

export const useTaskNotifications = (tasks: TaskNotificationParams[]) => {
  const [taskCounts, setTaskCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize userId to prevent unnecessary re-fetches
  const userId = useMemo(() => tasks[0]?.userId || '', [tasks]);

  // Memoize task list key to detect actual changes
  const tasksKey = useMemo(() => {
    if (!tasks || tasks.length === 0) return '';
    return tasks.map(t => `${t.referenceId}-${t.taskTitle}-${t.taskPage}`).join('|');
  }, [tasks]);

  const fetchTaskCounts = useCallback(async () => {
    if (!tasks || tasks.length === 0 || !userId) return;

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      // Use bulk endpoint - single API call for all tasks
      const response = await fetch(`${backendUrl}/api/ivy/notifications/task-counts-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId,
          tasks: tasks.map(t => ({
            referenceId: t.referenceId,
            taskTitle: t.taskTitle,
            taskPage: t.taskPage,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        console.error('Failed to fetch task notification counts');
        return;
      }

      const result = await response.json();
      
      // Convert to object
      const counts: { [key: string]: number } = {};
      result.data.forEach((item: any) => {
        const key = `${item.referenceId}-${item.taskTitle}-${item.taskPage}`;
        counts[key] = item.count;
      });

      setTaskCounts(counts);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching task notification counts:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [tasks, userId]);

  useEffect(() => {
    fetchTaskCounts();
    
    // Refresh every 5 seconds for real-time updates
    const interval = setInterval(fetchTaskCounts, 5000);
    
    return () => {
      clearInterval(interval);
      // Cancel pending request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tasksKey, fetchTaskCounts]);

  const markTaskAsRead = async (
    userId: string,
    referenceId: string,
    taskTitle: string,
    taskPage: string
  ) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await fetch(`${backendUrl}/api/ivy/notifications/task-mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId,
          referenceId,
          taskTitle,
          taskPage,
        }),
      });

      if (response.ok) {
        // Update local state
        const key = `${referenceId}-${taskTitle}-${taskPage}`;
        setTaskCounts((prev) => ({
          ...prev,
          [key]: 0,
        }));
      }
    } catch (error) {
      console.error('Error marking task as read:', error);
    }
  };

  const getTaskCount = (referenceId: string, taskTitle: string, taskPage: string) => {
    const key = `${referenceId}-${taskTitle}-${taskPage}`;
    return taskCounts[key] || 0;
  };

  return {
    taskCounts,
    loading,
    getTaskCount,
    markTaskAsRead,
    refreshCounts: fetchTaskCounts,
  };
};
