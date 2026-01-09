import React, { useEffect } from 'react';
import { API_BASE_URL } from '../src/services/api';

const ThemeManager: React.FC = () => {
  useEffect(() => {
    const fetchTenantTheme = async () => {
      try {
        // En desarrollo local, forzamos sanmateo si queremos probar, o dejamos que el backend decida
        // En producción, el browser enviará Origin/Referer automáticamente
        const res = await fetch(`${API_BASE_URL}/tenant/info`);
        
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
