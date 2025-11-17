// import React, {
//   createContext,
//   useState,
//   useContext,
//   useEffect,
//   ReactNode,
// } from "react";
// import { User } from "../../types";
// import apiFetch from "../services/api"; // <-- Usamos nuestro nuevo servicio

// interface AuthContextType {
//   user: User | null;
//   token: string | null;
//   isLoading: boolean;
//   login: (email: string, password: string) => Promise<void>;
//   logout: () => void;
//   error: string | null;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider: React.FC<{ children: ReactNode }> = ({
//   children,
// }) => {
//   console.log("AuthProvider: Component rendering"); // <-- AÑADE ESTE LOG AQUÍ
//   const [user, setUser] = useState<User | null>(null);
//   const [token, setToken] = useState<string | null>(() =>
//     localStorage.getItem("authToken")
//   ); // <-- Leemos el token al inicio
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const initializeAuth = async () => {
//       console.log("AuthProvider: Intentando inicializar..."); // <-- LOG 1
//       // Si tenemos un token guardado, intentamos verificarlo con el backend
//       if (token) {
//         console.log("AuthProvider: Token encontrado en estado:", token); // <-- LOG 2
//         try {
//           console.log("AuthProvider: Llamando a /api/auth/me..."); // <-- LOG 3
//           const userData = await apiFetch("/auth/me");
//           console.log("AuthProvider: /api/auth/me respondió OK:", userData); // <-- LOG 4
//           setUser(userData);
//         } catch (e) {
//           // Si el token es inválido o expiró, lo limpiamos
//           console.error(
//             "AuthProvider: Fallo al verificar el token con /api/auth/me.",
//             e
//           ); // <-- LOG 5 (Error)
//           localStorage.removeItem("authToken");
//           setToken(null);
//           setUser(null);
//         }
//       } else {
//         console.log("AuthProvider: No se encontró token en el estado inicial."); // <-- LOG 6 (No hay token)
//       }
//       console.log(
//         "AuthProvider: Finalizando inicialización, setLoading(false)"
//       ); // <-- LOG 7
//       setIsLoading(false);
//     };

//     initializeAuth();
//   }, [token]); // La dependencia [token] está bien

// const login = async (email: string, password: string) => {
//   console.log("!!! AuthProvider: Función login INICIADA."); // <-- Log aquí
//   setError(null);
//     setIsLoading(true); // <--- Mueve setIsLoading(true) aquí
//     console.log("AuthProvider: Iniciando login..."); // <-- LOG NUEVO
//     try {
//       console.log(`!!! AuthProvider: Llamando a apiFetch('/auth/login') con email: ${email}`);
//       const result = await apiFetch("/auth/login", {
//         // <-- USA apiFetch
//         method: "POST",
//         body: JSON.stringify({ email, password }),
//       });
//       console.log("AuthProvider: Respuesta de /api/auth/login:", result); // <-- LOG NUEVO
//       console.log("AuthProvider: Token RECIBIDO del backend:", result.token); // <-- AÑADE ESTE LOG
//       setUser(result.user);
//       setToken(result.token);
//       localStorage.setItem("authToken", result.token);

//       // 'token' in result ya no aplica directamente con apiFetch,
//       // asumimos que si no hay error, la respuesta es correcta.
//       setUser(result.user);
//       setToken(result.token);
//       console.log(
//         "AuthProvider: setToken y setUser llamados con:",
//         result.token,
//         result.user
//       ); // <-- LOG NUEVO
//       localStorage.setItem("authToken", result.token);
//       // localStorage.setItem('authUser', JSON.stringify(result.user)); // No es necesario guardar todo el usuario, el token es suficiente.
//       localStorage.removeItem("authUser"); // Limpiamos el usuario viejo si existía
//       // setIsLoading(false); // <--- QUITA setIsLoading(false) de aquí

//       // } catch (e) { // <-- Cambia el tipo de error
//     } catch (e: any) {
//       // <-- Usa 'any' o un tipo más específico si lo tienes
//       console.error("AuthProvider: Error durante el login:", e); // <-- LOG NUEVO (Error)
//       setError(e.message || "Error desconocido durante el login."); // <-- Muestra el error de la API
//       // Limpiamos en caso de error
//       setUser(null);
//       setToken(null);
//       localStorage.removeItem("authToken");
//       localStorage.removeItem("authUser");
//     } finally {
//       console.log("AuthProvider: Finalizando login, setLoading(false)"); // <-- LOG NUEVO
//       setIsLoading(false); // <--- Mueve setIsLoading(false) aquí al finally
//     }
//   };

//   const logout = () => {
//     setUser(null);
//     setToken(null);
//     localStorage.removeItem("authToken");
//   };

//   return (
//     <AuthContext.Provider
//       value={{ user, token, isLoading, login, logout, error }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = (): AuthContextType => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// };
