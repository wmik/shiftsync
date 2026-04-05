interface NotificationEvent {
  id: string;
  type: string;
  message: string;
}

type NotificationListener = (userId: string, notification: NotificationEvent) => void;

const listeners: NotificationListener[] = [];

export function addNotificationListener(listener: NotificationListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

export function emitNotification(userId: string, notification: NotificationEvent) {
  for (const listener of listeners) {
    try {
      listener(userId, notification);
    } catch (error) {
      console.error("Error in notification listener:", error);
    }
  }
}

export function getListenerCount(): number {
  return listeners.length;
}
