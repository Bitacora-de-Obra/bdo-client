import React, { useState, useRef, useEffect } from "react";
import { api } from "../../src/services/api";
import { Icon } from "../../components/icons/Icon";
import { HardHatIcon, XMarkIcon, PaperAirplaneIcon } from "../icons/Icon";

type Message = {
  id: string;
  text: string;
  sender: "user" | "bot";
};

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: inputValue,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Llamamos al backend
      const { response } = await api.chatbot.query(userMessage.text);

      const botMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        text: response,
        sender: "bot",
      };
      setMessages((prev) => [...prev, botMessage]);
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
    setInputValue(action);
    // Auto-submit the quick action
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: action,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    api.chatbot.query(action)
      .then(({ response }) => {
        const botMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          text: response,
          sender: "bot",
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
      backgroundColor: "#007BFF",
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
      backgroundColor: "#007BFF",
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
          <div style={styles.chatHeader}>Asistente de Bitácora</div>

          <div style={styles.messageList}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.message,
                  ...(msg.sender === "user"
                    ? styles.userMessage
                    : styles.botMessage),
                }}
              >
                {msg.text}
              </div>
            ))}
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

          <form onSubmit={handleSubmit} style={styles.inputForm}>
            <input
              type="text"
              style={styles.input}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu pregunta..."
              aria-label="Escribe tu pregunta"
              disabled={isLoading}
            />
            <button
              type="submit"
              style={styles.sendButton}
              aria-label="Enviar"
              disabled={isLoading}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
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
          <HardHatIcon className="w-7 h-7" />
        )}
      </button>
    </div>
  );
};
