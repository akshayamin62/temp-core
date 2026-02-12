/**
 * Notification system has been removed.
 * This hook is kept as a no-op stub so existing consumers don't break.
 */

interface TaskNotificationParams {
  userId: string;
  referenceId: string;
  taskTitle: string;
  taskPage: string;
}

export const useTaskNotifications = (_tasks: TaskNotificationParams[]) => {
  return {
    taskCounts: {} as { [key: string]: number },
    loading: false,
    getTaskCount: (_referenceId: string, _taskTitle: string, _taskPage: string) => 0,
    markTaskAsRead: async (_userId: string, _referenceId: string, _taskTitle: string, _taskPage: string) => {},
    refreshCounts: async () => {},
  };
};
