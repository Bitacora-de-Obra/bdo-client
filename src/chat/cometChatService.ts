import { CometChat } from "@cometchat/chat-sdk-javascript";
import { CometChatUIKit } from "@cometchat/chat-uikit-react";
import { UIKitSettingsBuilder } from "@cometchat/uikit-shared";
import type { User } from "../../types";
import { api } from "../services/api";

const appId = import.meta.env.VITE_COMETCHAT_APP_ID as string | undefined;
const region = import.meta.env.VITE_COMETCHAT_REGION as string | undefined;

let initPromise: Promise<void> | null = null;
let loginPromise: Promise<CometChat.User | null> | null = null;

const ensureInitialized = async () => {
  if (!appId || !region) {
    console.warn(
      "[CometChat] Variables VITE_COMETCHAT_APP_ID y VITE_COMETCHAT_REGION no están configuradas."
    );
    return;
  }

  if (!initPromise) {
    const appSettings = new CometChat.AppSettingsBuilder()
      .subscribePresenceForAllUsers()
      .setRegion(region)
      .autoEstablishSocketConnection(true)
      .build();
    initPromise = CometChat.init(appId, appSettings)
      .then(() => {
        const uiKitSettings = new UIKitSettingsBuilder()
          .setAppId(appId)
          .setRegion(region)
          .subscribePresenceForAllUsers()
          .setAutoEstablishSocketConnection(true)
          .build();
        return CometChatUIKit.init(uiKitSettings);
      })
      .then(() => undefined)
      .catch((error) => {
        console.error("[CometChat] Error inicializando SDK:", error);
        initPromise = null;
        throw error;
      });
  }

  return initPromise;
};

export const loginCometChat = async (user: User) => {
  if (!user || !user.id) return;
  if (!appId || !region) return;

  await ensureInitialized();

  try {
    const loggedUser = await CometChat.getLoggedinUser();
    if (loggedUser && loggedUser.getUid() === user.id) {
      return loggedUser;
    }
    if (loggedUser) {
      await CometChatUIKit.logout();
    }
  } catch (error) {
    console.warn("[CometChat] No se pudo obtener el usuario logueado:", error);
  }

  try {
    if (!loginPromise) {
      loginPromise = (async () => {
        const { authToken } = (await api("/chat/cometchat/session", {
          method: "POST",
        })) as { authToken: string };
        if (!authToken) {
          throw new Error("No se recibió authToken de CometChat.");
        }
        await CometChatUIKit.loginWithAuthToken(authToken);
        return CometChat.getLoggedinUser();
      })();
    }
    return await loginPromise;
  } catch (error) {
    console.error("[CometChat] Error durante el login:", error);
    throw error;
  } finally {
    loginPromise = null;
  }
};

export const logoutCometChat = async () => {
  if (!appId || !region) return;
  await ensureInitialized();
  try {
    const current = await CometChat.getLoggedinUser();
    if (current) {
      await CometChatUIKit.logout();
    }
  } catch (error) {
    console.warn("[CometChat] Error cerrando sesión:", error);
  }
};
