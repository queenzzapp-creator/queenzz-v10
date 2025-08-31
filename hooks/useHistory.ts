import { useState, useCallback } from 'react';

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export const useHistory = <T>(initialState: T): [T, (newState: T, overwrite?: boolean) => void, () => void, () => void, boolean, boolean] => {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const set = useCallback((newState: T, overwrite = false) => {
    setState(currentState => {
      if (overwrite) {
        // Used for initial load or reloads where we don't want to track history
        return {
          past: [],
          present: newState,
          future: [],
        };
      }
      
      const { past, present } = currentState;
      if (newState === present) {
        return currentState; // No change
      }
      
      return {
        past: [...past, present],
        present: newState,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState(currentState => {
      const { past, present, future } = currentState;
      if (past.length === 0) return currentState;
      
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(currentState => {
      const { past, present, future } = currentState;
      if (future.length === 0) return currentState;
      
      const next = future[0];
      const newFuture = future.slice(1);
      
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  return [state.present, set, undo, redo, canUndo, canRedo];
};

export default useHistory;
