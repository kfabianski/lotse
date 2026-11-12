import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { useAuth } from './auth';

const BriefingContext = createContext({ data: null, reload: () => {} });

/** The signed-in person's reminders (today's events, open trainings, posts to confirm, polls, answers to ideas):
 * loaded once and shared by the bell in the header and the "Für Sie" block on the home page. */
export function BriefingProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState(null);
  const reload = useCallback(() => {
    if (!userId) { setData(null); return; }
    api('/me/briefing').then(setData).catch(() => {});
  }, [userId]);
  useEffect(() => { reload(); }, [reload]);
  const value = useMemo(() => ({ data, reload }), [data, reload]);
  return <BriefingContext.Provider value={value}>{children}</BriefingContext.Provider>;
}

export const useBriefing = () => useContext(BriefingContext);
