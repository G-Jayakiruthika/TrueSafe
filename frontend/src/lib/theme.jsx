import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const Ctx = createContext(null);
export const useTheme = () => useContext(Ctx);

/** mode: dark|light. state: neutral|scam|safe|civic|voice -> drives CSS variables, aurora and avatar. */
export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('ts_mode') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  const [state, setState] = useState('neutral');
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.mode = mode; r.dataset.state = state;
    localStorage.setItem('ts_mode', mode);
  }, [mode, state]);
  const toggle = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ mode, toggle, state, setState }), [mode, toggle, state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
