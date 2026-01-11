import React, { useEffect } from 'react';
import { API_BASE_URL } from '../src/services/api';

const ThemeManager: React.FC = () => {
  useEffect(() => {
    // 1. Client-side Fallback (Immediate branding for Staging)
    // Esto asegura que se vea bien incluso si la API tarda en responder o falla
    const hostname = window.location.hostname;
    if (hostname.includes('sanmateo')) {
       const root = document.documentElement;
       root.style.setProperty('--color-brand-primary', '#001A4D');
       root.style.setProperty('--color-idu-blue', '#001A4D');
       root.style.setProperty('--color-brand-secondary', '#C4D600');
       root.style.setProperty('--color-brand-accent', '#C4D600');
       root.style.setProperty('--color-idu-cyan', '#C4D600');
    }

    // 2. Dynamic Fetch (Source of Truth)
    const fetchTenantTheme = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/tenant/info`);
         // ... rest of the code matches existing
        if (!res.ok) return;
        
        const tenant = await res.json();
        
        if (tenant?.settings?.theme) {
          const theme = tenant.settings.theme;
          const root = document.documentElement;
          
          if (theme.primary) {
            root.style.setProperty('--color-brand-primary', theme.primary);
            root.style.setProperty('--color-idu-blue', theme.primary);
          }
          
          if (theme.secondary) {
            root.style.setProperty('--color-brand-secondary', theme.secondary);
          }

          if (theme.accent) {
             root.style.setProperty('--color-brand-accent', theme.accent);
             root.style.setProperty('--color-idu-cyan', theme.accent);
          }
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      }
    };

    fetchTenantTheme();
  }, []);

  return null;
};

export default ThemeManager;
