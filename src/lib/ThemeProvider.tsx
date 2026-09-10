import React, { createContext, useContext, useState, useEffect } from 'react';
import { set, get } from 'idb-keyval';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  mode: ThemeMode;
  actualTheme: 'light' | 'dark';
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('auto');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    get('kh_music_theme').then(saved => {
      if (saved) setMode(saved as ThemeMode);
    });
  }, []);

  useEffect(() => {
    const applyTheme = (currentMode: ThemeMode) => {
      let theme: 'light' | 'dark';
      if (currentMode === 'auto') {
        const hour = new Date().getHours();
        theme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
      } else {
        theme = currentMode;
      }
      setActualTheme(theme);
      
      // We apply 'dark' class to html root
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Dynamically update status bar color meta tag if exists
      let metaThemeColor = document.querySelector("meta[name=theme-color]");
      if (!metaThemeColor) {
        metaThemeColor = document.createElement("meta");
        metaThemeColor.setAttribute("name", "theme-color");
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute("content", theme === 'dark' ? '#121212' : '#F7F8FA');
    };

    applyTheme(mode);
    // Setup interval to check for auto theme changes every minute
    const interval = setInterval(() => {
      if (mode === 'auto') applyTheme(mode);
    }, 60000);

    return () => clearInterval(interval);
  }, [mode]);

  const handleSetTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    set('kh_music_theme', newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, actualTheme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
