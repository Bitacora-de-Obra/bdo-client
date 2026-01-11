import { jsPDF } from "jspdf";
import React, { useState, useRef, useEffect } from "react";
import { api } from "../../src/services/api";
import { Icon } from "../../components/icons/Icon";
import { HardHatIcon, XMarkIcon, PaperAirplaneIcon, DocumentArrowDownIcon, ClipboardDocumentListIcon, CheckCircleIcon, Cog6ToothIcon } from "../icons/Icon";
import { PreferencesModal } from "./PreferencesModal";

type Message = {
  id: string;
  text: string;
  sender: "user" | "bot";
  interactionId?: string | null;
  contextSections?: Array<{ id: string; heading: string }>;
  feedback?: "POSITIVE" | "NEGATIVE";
};

const HISTORY_LIMIT = 8;
type HistoryPayloadItem = { role: "user" | "assistant"; content: string };

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  // Preferences Modal State
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<string | null>(null);
  
  // New state for photo analysis
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Insights State
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingInsights, setPendingInsights] = useState<any[]>([]);
  // Copy State
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  useEffect(() => {
    const checkInsights = async () => {
      try {
        const insights = await api.chatbot.getInsights();
        const unread = insights.filter((i: any) => !i.isRead);
        if (unread.length > 0) {
          setUnreadCount(unread.length);
          setPendingInsights(unread);
        }
      } catch (e) {
        console.error("Error fetching insights:", e);
      }
    };
    // Fetch immediately
    checkInsights();
    // Optional: Poll every 5 minutes
    const interval = setInterval(checkInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen && pendingInsights.length > 0) {
        const insightsText = pendingInsights.map((i: any) => `• ${i.title}: ${i.content.replace(/<[^>]*>?/gm, '').substring(0, 100)}...`).join('\n');
        
        const botMsg: Message = {
             id: `insight-${Date.now()}`,
             text: `👋 ¡Hola! Tengo un resumen diario y actualizaciones importantes para ti:\n\n${insightsText}`,
             sender: 'bot'
        };
        
        // Add message
        setMessages(prev => [...prev, botMsg]);
        
        // Mark as read in backend
        pendingInsights.forEach((i: any) => api.chatbot.markInsightRead(i.id).catch(console.error));
        
        // Reset local state
        setPendingInsights([]);
        setUnreadCount(0);
    }
  }, [isOpen, pendingInsights]);

  // Export & Copy Handlers
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let y = 20;

      // Header
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`Bitácora Virtual - Historial de Chat`, margin, y);
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, margin, y);
      y += 15;

      // Messages
      messages.forEach((msg) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        const role = msg.sender === 'user' ? 'Usuario' : 'Aurora (IA)';
        const color = msg.sender === 'user' ? [0, 0, 255] : [0, 128, 0];
        
        doc.setFontSize(11);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont("helvetica", "bold");
        doc.text(`${role}:`, margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        
        const cleanText = msg.text.replace(/<[^>]*>?/gm, '');
        const splitText = doc.splitTextToSize(cleanText, contentWidth);
        doc.text(splitText, margin, y);
        
        y += (splitText.length * 5) + 8;
      });

      doc.save(`aurora-chat-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Error exporting PDF:", err);
    }
  };

  const copyToClipboard = async (text: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const quickActions = [
    "¿Cuál es el estado actual del proyecto?",
    "¿Qué comunicaciones hay pendientes?",
    "¿Cuáles son los compromisos próximos a vencer?",
    "¿Cómo va el avance de obra?",
    "¿Qué planos están vigentes?",
    "¿Cuáles son las últimas anotaciones?",
    "¿Hay modificaciones contractuales recientes?",
    "¿Qué informes se han presentado?",
  ];

  const buildHistoryPayload = (historyMessages: Message[]): HistoryPayloadItem[] =>
    historyMessages
      .filter((msg) => msg.sender === "user" || msg.sender === "bot")
      .slice(-HISTORY_LIMIT)
      .map<HistoryPayloadItem>((msg) => ({
        role: msg.sender === "bot" ? "assistant" : "user",
        content: msg.text,
      }));

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    // Saludo inicial del bot cuando se abre el chat por primera vez
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "initial-greeting",
          text: "Hola. Soy tu asistente de bitácora. ¿En qué puedo ayudarte hoy?",
          sender: "bot",
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedPhoto(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const clearPhoto = () => {
    setSelectedPhoto(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && !selectedPhoto) || isLoading) return;

    const sanitizedInput = inputValue.trim();
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: sanitizedInput || (selectedPhoto ? "Imagen adjunta para análisis" : "Mensaje vacío"),
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      if (selectedPhoto) {
        // Flow with photo
        // 1. Upload photo
        const attachment = await api.upload.uploadFile(selectedPhoto, "photo");
        
        // 2. Analyze photo
        const { analysis, interactionId: _interactionId } = await api.chatbot.analyzePhoto(
          attachment.url, 
          sanitizedInput || undefined
        );
         // Note: interactionId from analyzePhoto isn't used in Message structure yet properly or we need to adapt
        
        const botMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          text: analysis,
          sender: "bot",
          interactionId: _interactionId,
        };
        setMessages((prev) => [...prev, botMessage]);
        
        // Cleanup
        clearPhoto();
        
      } else {
        // Standard text flow
        const historyPayload = buildHistoryPayload(messages);
        
        const {
            response,
            interactionId,
            contextSections,
        } = await api.chatbot.query(userMessage.text, historyPayload);

        const botMessage: Message = {
            id: `msg-${Date.now() + 1}`,
            text: response,
            sender: "bot",
            interactionId,
            contextSections,
        };
        setMessages((prev) => [...prev, botMessage]);
      }

    } catch (error: any) {
      console.error("Error al contactar al chatbot:", error);
      const errorMessage: Message = {
        id: `msg-error-${Date.now()}`,
        text: `Lo siento, no pude procesar tu solicitud. Error: ${
          error?.message || "Error desconocido"
        }`,
        sender: "bot",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    if (isLoading) return;
    setInputValue(action);
    // Auto-submit the quick action
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: action,
      sender: "user",
    };

    const historyPayload = buildHistoryPayload(messages);

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    api.chatbot
      .query(action, historyPayload)
      .then(({ response, interactionId, contextSections }) => {
        const botMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          text: response,
          sender: "bot",
          interactionId,
          contextSections,
        };
        setMessages((prev) => [...prev, botMessage]);
      })
      .catch((error: any) => {
        console.error("Error al contactar al chatbot:", error);
        const errorMessage: Message = {
          id: `msg-error-${Date.now()}`,
          text: `Lo siento, no pude procesar tu solicitud. Error: ${
            error?.message || "Error desconocido"
          }`,
          sender: "bot",
        };
        setMessages((prev) => [...prev, errorMessage]);
    })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleFeedback = async (message: Message, rating: "POSITIVE" | "NEGATIVE") => {
    if (feedbackSubmitting === message.id) {
      return;
    }

    if (!message.interactionId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, feedback: rating } : msg
        )
      );
      return;
    }

    setFeedbackSubmitting(message.id);
    try {
      await api.chatbot.feedback({
        interactionId: message.interactionId,
        rating,
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, feedback: rating } : msg
        )
      );
    } catch (error) {
      console.error("No se pudo registrar el feedback del chatbot:", error);
    } finally {
      setFeedbackSubmitting(null);
    }
  };

  // --- Estilos CSS (embebidos para simplicidad) ---
  // (En un proyecto más grande, esto iría en un archivo .css)
  const styles: { [key: string]: React.CSSProperties } = {
    widgetContainer: {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 1000,
    }, // <--- SIN "as React.CSSProperties"
    bubble: {
      width: "60px",
      height: "60px",
      borderRadius: "50%",
      backgroundColor: "var(--color-brand-secondary, #007BFF)",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      transition: "transform 0.2s ease",
    }, // <--- SIN "as React.CSSProperties"
    chatWindow: {
      position: "fixed",
      bottom: "90px",
      right: "20px",
      width: "350px",
      height: "450px",
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }, // <--- SIN "as React.CSSProperties"
    chatHeader: {
      padding: "16px",
      backgroundColor: "#f1f1f1",
      borderBottom: "1px solid #e0e0e0",
      fontWeight: 600,
      color: "#333",
    }, // <--- ... etc.
    messageList: {
      flex: 1,
      overflowY: "auto",
      padding: "12px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      backgroundColor: "#f9f9f9",
    },
    message: {
      padding: "10px 14px",
      borderRadius: "18px",
      maxWidth: "80%",
      wordWrap: "break-word",
    },
    userMessage: {
      backgroundColor: "#007BFF",
      color: "white",
      alignSelf: "flex-end",
      borderBottomRightRadius: "4px",
    },
    botMessage: {
      backgroundColor: "#E5E5EA",
      color: "black",
      alignSelf: "flex-start",
      borderBottomLeftRadius: "4px",
    },
    feedbackRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginTop: "6px",
      fontSize: "12px",
      color: "#555",
    },
    feedbackButton: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontSize: "16px",
      padding: "0 4px",
      lineHeight: 1,
      color: "#6b7280",
    },
    feedbackThanks: {
      fontSize: "11px",
      color: "#2563eb",
    },
    contextTagsContainer: {
      display: "flex",
      flexWrap: "wrap",
      gap: "6px",
      marginTop: "6px",
    },
    contextTag: {
      fontSize: "10px",
      backgroundColor: "#eef2ff",
      color: "#1f2937",
      padding: "2px 6px",
      borderRadius: "999px",
    },
    inputForm: {
      display: "flex",
      borderTop: "1px solid #e0e0e0",
      padding: "10px",
    },
    input: {
      flex: 1,
      border: "1px solid #ccc",
      borderRadius: "20px",
      padding: "8px 14px",
      marginRight: "8px",
      fontSize: "14px",
    },
    sendButton: {
      border: "none",
      backgroundColor: "var(--color-brand-secondary, #007BFF)",
      color: "white",
      borderRadius: "50%",
      width: "40px",
      height: "40px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    quickActionsContainer: {
      padding: "10px",
      borderTop: "1px solid #eee",
    },
    quickActionsTitle: {
      fontSize: "12px",
      fontWeight: "bold",
      color: "#666",
      marginBottom: "8px",
    },
    quickActionsGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "6px",
    },
    quickActionButton: {
      padding: "6px 8px",
      fontSize: "11px",
      backgroundColor: "#f8f9fa",
      border: "1px solid #dee2e6",
      borderRadius: "4px",
      cursor: "pointer",
      textAlign: "left",
      transition: "all 0.2s",
    },
  };

  return (
    <div style={styles.widgetContainer}>
      {isOpen && (
        <div style={styles.chatWindow} role="dialog" aria-live="polite">
          <div style={styles.chatHeader}>
            Asistente de Bitácora
            <div className="flex gap-2">
               <button
                  onClick={() => setIsPreferencesOpen(true)}
                  title="Configuración"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                >
                  <Cog6ToothIcon className="w-5 h-5 text-gray-500 hover:text-blue-600" />
               </button>
               <button
                  onClick={handleExportPDF}
                  title="Exportar chat a PDF"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                >
                  <DocumentArrowDownIcon className="w-5 h-5 text-gray-500 hover:text-blue-600" />
               </button>
               <button onClick={() => setIsOpen(false)} style={styles.closeButton}>
                  <XMarkIcon className="w-5 h-5" />
               </button>
            </div>
          </div>

          <div style={styles.messageList}>
            {messages.map((msg) => {
              const isBot = msg.sender === "bot";
              const isSubmittingFeedback = feedbackSubmitting === msg.id;
              return (
                <div
                  key={msg.id}
                  style={{
                    ...styles.message,
                    ...(isBot ? styles.botMessage : styles.userMessage),
                    position: 'relative',
                    paddingRight: '28px' // Make space for button
                  }}
                  className="group"
                >
                   {/* Copy Button */}
                   <button
                     onClick={() => copyToClipboard(msg.text, msg.id)}
                     className="group-hover:opacity-100 opacity-0 transition-opacity"
                     style={{
                       position: 'absolute',
                       top: 6,
                       right: 6,
                       background: 'transparent',
                       border: 'none',
                       cursor: 'pointer',
                     }}
                     title="Copiar texto"
                   >
                      {copiedMessageId === msg.id ? (
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                      ) : (
                        <ClipboardDocumentListIcon className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                      )}
                   </button>

                   <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                  {isBot && msg.contextSections && msg.contextSections.length > 0 && (
                    <div style={styles.contextTagsContainer}>
                      {msg.contextSections.map((section) => (
                        <span key={section.id} style={styles.contextTag}>
                          {section.heading}
                        </span>
                      ))}
                    </div>
                  )}
                  {isBot && msg.interactionId && (
                    <div style={styles.feedbackRow}>
                      <span>¿Te fue útil?</span>
                      <button
                        type="button"
                        style={{
                          ...styles.feedbackButton,
                          color: msg.feedback === "POSITIVE" ? "#2563eb" : "#6b7280",
                          opacity: isSubmittingFeedback ? 0.5 : 1,
                        }}
                        onClick={() => handleFeedback(msg, "POSITIVE")}
                        disabled={isSubmittingFeedback}
                        aria-label="Respuesta útil"
                      >
                        👍
                      </button>
                      <button
                        type="button"
                        style={{
                          ...styles.feedbackButton,
                          color: msg.feedback === "NEGATIVE" ? "#dc2626" : "#6b7280",
                          opacity: isSubmittingFeedback ? 0.5 : 1,
                        }}
                        onClick={() => handleFeedback(msg, "NEGATIVE")}
                        disabled={isSubmittingFeedback}
                        aria-label="Respuesta no útil"
                      >
                        👎
                      </button>
                      {msg.feedback && (
                        <span style={styles.feedbackThanks}>
                          {msg.feedback === "POSITIVE"
                            ? "¡Gracias por tu retroalimentación!"
                            : "Mejoraremos esta respuesta, gracias."}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div style={{ ...styles.message, ...styles.botMessage }}>...</div>
            )}
            {messages.length === 1 && (
              <div style={styles.quickActionsContainer}>
                <div style={styles.quickActionsTitle}>Preguntas frecuentes:</div>
                <div style={styles.quickActionsGrid}>
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      style={{
                        ...styles.quickActionButton,
                        ...(isLoading ? { opacity: 0.5, cursor: "not-allowed" } : {}),
                      }}
                      onClick={() => handleQuickAction(action)}
                      disabled={isLoading}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = "#e9ecef";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = "#f8f9fa";
                        }
                      }}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} style={{...styles.inputForm, flexDirection: 'column'}}>
            {previewUrl && (
              <div style={{ position: 'relative', width: 'fit-content', marginBottom: '8px' }}>
                <img 
                  src={previewUrl} 
                  alt="Vista previa" 
                  style={{ maxHeight: '80px', borderRadius: '8px', border: '1px solid #ddd' }} 
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#6b7280',
                  padding: '8px',
                  cursor: 'pointer',
                  marginRight: '4px'
                }}
                disabled={isLoading}
                title="Adjuntar foto"
              >
                <div style={{ width: 24, height: 24 }}>
                  {/* Using standard icon or importing CameraIcon */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <input
                type="text"
                style={styles.input}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={messages.length === 0 ? "Escribe tu pregunta..." : "Escribe un mensaje..."}
                aria-label="Escribe tu pregunta"
                disabled={isLoading}
              />
              <button
                type="submit"
                style={{
                  ...styles.sendButton,
                  backgroundColor: !inputValue.trim() && !selectedPhoto ? '#9CA3AF' : 'var(--color-brand-secondary, #007BFF)',
                  cursor: !inputValue.trim() && !selectedPhoto ? 'default' : 'pointer'
                }}
                aria-label="Enviar"
                disabled={isLoading || (!inputValue.trim() && !selectedPhoto)}
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        style={{
          ...styles.bubble,
          transform: isOpen ? "scale(0.9)" : "scale(1)",
        }}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Cerrar chat" : "Abrir chat"}
      >
        {isOpen ? (
          <XMarkIcon className="w-7 h-7" />
        ) : (
          <div style={{ position: 'relative' }}>
             <HardHatIcon className="w-7 h-7" />
             {unreadCount > 0 && (
               <div style={{
                 position: 'absolute',
                 top: -6,
                 right: -6,
                 backgroundColor: '#ef4444',
                 color: 'white',
                 fontSize: '10px',
                 fontWeight: 'bold',
                 width: '18px',
                 height: '18px',
                 borderRadius: '50%',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 border: '2px solid white'
               }}>
                 {unreadCount}
               </div>
             )}
          </div>
        )}
      </button>

      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />
    </div>
  );
};
