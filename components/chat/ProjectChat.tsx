import React, { useMemo } from "react";
import {
  CometChatConversationsWithMessages,
  CometChatThemeContext,
} from "@cometchat/chat-uikit-react";
import {
  CometChatPalette,
  CometChatTypography,
  CometChatFont,
  CometChatTheme,
  PaletteItem,
} from "@cometchat/uikit-resources";
import { WithMessagesStyle } from "@cometchat/uikit-shared";
import { useAuth } from "../../contexts/AuthContext";

const ProjectChat: React.FC = () => {
  const { user, isLoading, isChatReady } = useAuth();

  const containerClass = useMemo(
    () =>
      "w-full h-[calc(100vh-6rem)] min-h-[560px] rounded-[28px] shadow-xl border border-transparent overflow-hidden bg-white",
    []
  );

  const surfaceBackgroundClass = useMemo(
    () =>
      "p-4 h-full bg-[#f4f1fb] flex items-center justify-center rounded-[32px]",
    []
  );

  const chatTheme = useMemo(() => {
    const brand = "#6852D6";
    const brandMuted = "#E3DDFC";
    const lightBackground = "#F7F6FB";

    const palette = new CometChatPalette({
      mode: "light",
      primary: new PaletteItem({ light: brand, dark: "#9D83FF" }),
      primary150: new PaletteItem({ light: brandMuted, dark: "#3F2B88" }),
      primary500: new PaletteItem({ light: "#4F39B8", dark: "#B8A6FF" }),
      background: new PaletteItem({ light: lightBackground, dark: "#1C1C28" }),
      secondary: new PaletteItem({ light: "#FFFFFF", dark: "#35354A" }),
      tertiary: new PaletteItem({ light: "#A4A4B5", dark: "#C7C7D5" }),
      accent: new PaletteItem({ light: "#FFB547", dark: "#FFB547" }),
      success: new PaletteItem({ light: "#37C77F", dark: "#37C77F" }),
      error: new PaletteItem({ light: "#FF6B6B", dark: "#FF7A7A" }),
    });

    const baseFont = "'Inter', 'Roboto', 'Segoe UI', sans-serif";
    const typography = new CometChatTypography({
      fontFamily: baseFont,
      fontWeightRegular: "400",
      fontWeightMedium: "500",
      fontWeightSemibold: "600",
      fontWeightBold: "700",
      title1: new CometChatFont({
        fontFamily: baseFont,
        fontSize: "18px",
        fontWeight: "600",
      }),
      subtitle1: new CometChatFont({
        fontFamily: baseFont,
        fontSize: "15px",
        fontWeight: "500",
      }),
      text1: new CometChatFont({
        fontFamily: baseFont,
        fontSize: "14px",
        fontWeight: "400",
      }),
      text2: new CometChatFont({
        fontFamily: baseFont,
        fontSize: "13px",
        fontWeight: "400",
      }),
      caption1: new CometChatFont({
        fontFamily: baseFont,
        fontSize: "12px",
        fontWeight: "500",
      }),
    });

    return new CometChatTheme({ palette, typography });
  }, []);

  const conversationsStyle = useMemo(
    () =>
      new WithMessagesStyle({
        background: "#FFFFFF",
        borderRadius: "28px",
        border: "1px solid rgba(104, 82, 214, 0.08)",
        messageTextColor: "#141414",
        messageTextFont: "'Inter', 'Roboto', sans-serif",
        width: "100%",
        height: "100%",
      }),
    []
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Preparando el espacio de chat...
        </div>
      );
    }

    if (!user) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Inicia sesión para acceder al chat del proyecto.
        </div>
      );
    }

    if (!isChatReady) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Conectando al chat del proyecto...
        </div>
      );
    }

    return (
      <CometChatThemeContext.Provider value={{ theme: chatTheme }}>
        <div className="h-full">
          <CometChatConversationsWithMessages
            conversationsWithMessagesStyle={conversationsStyle}
          />
        </div>
      </CometChatThemeContext.Provider>
    );
  };

  return (
    <div className={surfaceBackgroundClass}>
      <div className={containerClass}>
        {renderContent()}
      </div>
    </div>
  );
};

export default ProjectChat;
