export interface ConflictEvent {
  type: "ASSIGNMENT_CONFLICT";
  shiftId: string;
  locationId: string;
  attemptedUserId: string;
  attemptedUserName?: string;
  conflictingUserId: string;
  conflictingUserName?: string;
  timestamp: string;
}

type ConflictListener = (event: ConflictEvent) => void;

const listeners: ConflictListener[] = [];

export function addConflictListener(listener: ConflictListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

export function emitConflictEvent(event: ConflictEvent) {
  console.log(`[Conflict] Assignment conflict detected: ${event.shiftId}`);
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("Error in conflict listener:", error);
    }
  }
}

export function getConflictListenerCount(): number {
  return listeners.length;
}
