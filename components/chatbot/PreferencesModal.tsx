import React, { useState, useEffect } from "react";
import { api } from "../../src/services/api";
import { XMarkIcon } from "../icons/Icon";

interface UserPreference {
  key: string;
  value: string;
}

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  // userId prop might not be needed if API handles it via token, but let's see. 
  // API uses token, so frontend just calls endpoints.
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose }) => {
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Default values
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("concise");
  const [format, setFormat] = useState("text");

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      // We need to implement this API method in api.ts first
      const data = await api.chatbot.getPreferences();
      setPreferences(data);
      
      // Parse to state
      const tonePref = data.find((p: any) => p.key === "response_tone");
      if (tonePref) setTone(tonePref.value);
      
      const lengthPref = data.find((p: any) => p.key === "response_length");
      if (lengthPref) setLength(lengthPref.value);
      
      const formatPref = data.find((p: any) => p.key === "response_format");
      if (formatPref) setFormat(formatPref.value);
      
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.chatbot.setPreference("response_tone", tone);
      await api.chatbot.setPreference("response_length", length);
      await api.chatbot.setPreference("response_format", format);
      onClose();
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>Configuración de Aurora</h3>
          <button onClick={onClose} style={styles.closeButton}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div style={styles.body}>
          {loading ? (
            <p>Cargando preferencias...</p>
          ) : (
            <div style={styles.formGroup}>
              <label style={styles.label}>Tono de respuesta:</label>
              <select 
                style={styles.select}
                value={tone} 
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="professional">Profesional (Default)</option>
                <option value="formal">Muy Formal</option>
                <option value="friendly">Amigable/Casual</option>
                <option value="direct">Directo/Ejecutivo</option>
              </select>

              <label style={styles.label}>Longitud:</label>
              <select 
                style={styles.select}
                value={length} 
                onChange={(e) => setLength(e.target.value)}
              >
                <option value="concise">Concisa (Default)</option>
                <option value="detailed">Detallada</option>
                <option value="bullets">Solo puntos clave</option>
              </select>

               <label style={styles.label}>Formato preferido:</label>
              <select 
                style={styles.select}
                value={format} 
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="text">Texto fluido</option>
                <option value="markdown">Markdown estructurado</option>
                <option value="list">Listas numeradas</option>
              </select>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.secondaryButton}>Cancelar</button>
          <button onClick={handleSave} style={styles.primaryButton} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Preferencias"}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#666',
  },
  body: {
    padding: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#333',
    marginBottom: '4px',
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '14px',
    width: '100%',
  },
  footer: {
    padding: '16px',
    borderTop: '1px solid #eee',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    backgroundColor: '#f9f9f9',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
  }
};
