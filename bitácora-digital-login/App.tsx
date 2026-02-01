import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, CheckCircle2, Origami } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './components/Logo';
import { InputField } from './components/InputField';
import { LoginFormData, LoginStatus } from './types';

function App() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [status, setStatus] = useState<LoginStatus>(LoginStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear errors on typing
    if (status === LoginStatus.ERROR) {
      setStatus(LoginStatus.IDLE);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setErrorMsg("Por favor completa todos los campos.");
      setStatus(LoginStatus.ERROR);
      return;
    }

    setStatus(LoginStatus.LOADING);

    // Simulate API Call
    setTimeout(() => {
      // Mock success for any input
      setStatus(LoginStatus.SUCCESS);
    }, 2000);
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 overflow-hidden">
      
      {/* Left Side: Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-12 xl:p-20 relative z-10 bg-white shadow-2xl lg:shadow-none">
        
        {/* Top: Header/Logo for Mobile */}
        <div className="flex justify-between items-center lg:hidden mb-8">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-brand-yellow flex items-center justify-center border border-slate-200">
               <Origami className="w-5 h-5 text-slate-800" />
             </div>
             <span className="font-bold text-slate-800">Kata Lab</span>
           </div>
        </div>

        {/* Center: Main Form Content */}
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Logo className="mb-10" />
            
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Bienvenido</h2>
              <p className="text-slate-500">
                Portal de supervisión y control de obra.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <InputField
                id="email"
                label="Correo Corporativo"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="usuario@consorciosanmateo.com"
                icon={Mail}
              />
              
              <InputField
                id="password"
                label="Contraseña"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                icon={Lock}
              />

              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-brand-800 focus:ring-brand-500 border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">
                    Recordarme
                  </label>
                </div>
                
                <div className="text-sm">
                  <a href="#" className="font-medium text-brand-700 hover:text-brand-900 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center">
                  {errorMsg}
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={status === LoginStatus.LOADING || status === LoginStatus.SUCCESS}
                className={`
                  w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white 
                  transition-all duration-300 ease-in-out
                  ${status === LoginStatus.SUCCESS 
                    ? 'bg-green-600 hover:bg-green-700 ring-4 ring-green-100' 
                    : 'bg-brand-800 hover:bg-brand-900 hover:shadow-brand-900/30 ring-0 hover:ring-4 hover:ring-brand-100'
                  }
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed
                `}
              >
                {status === LoginStatus.LOADING ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Validando credenciales...
                  </>
                ) : status === LoginStatus.SUCCESS ? (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Acceso Correcto
                  </>
                ) : (
                  <>
                    Ingresar al Sistema
                    <ArrowRight className="ml-2 h-4 w-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>

        {/* Footer: Credits & Copyright */}
        <div className="mt-8 lg:mt-0 flex items-center justify-between text-xs text-slate-400">
           <span>© 2024 Consorcio San Mateo.</span>
           <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-default">
             <span>Desarrollado por</span>
             <span className="font-bold text-slate-600 flex items-center gap-1">
               <Origami className="w-3 h-3 text-yellow-500" />
               KATA LAB
             </span>
           </div>
        </div>
      </div>

      {/* Right Side: Image/Visual (Hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-slate-900">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 z-0"
        >
          <img 
            // Using a picsum image that resembles architecture/structure
            src="https://picsum.photos/id/193/1200/1600" 
            alt="Modern Construction"
            className="w-full h-full object-cover opacity-60 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-800/60 to-slate-900/40" />
        </motion.div>
        
        <div className="absolute inset-0 z-10 flex flex-col justify-end p-20 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <div className="w-16 h-1 bg-yellow-400 mb-6 rounded-full" />
            <h2 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
              Excelencia en<br/>
              Ingeniería y Construcción.
            </h2>
            <p className="text-lg text-slate-200 max-w-md leading-relaxed">
              Plataforma integral para el seguimiento de obra, control de calidad y gestión de recursos del Consorcio.
            </p>
            
            <div className="mt-12 flex items-center gap-4">
               <div className="flex -space-x-3">
                 {[1,2,3].map((i) => (
                   <div key={i} className="w-10 h-10 rounded-full border-2 border-brand-900 bg-slate-200 overflow-hidden">
                     <img src={`https://picsum.photos/seed/${i + 50}/100/100`} alt="User" className="w-full h-full object-cover" />
                   </div>
                 ))}
                 <div className="w-10 h-10 rounded-full border-2 border-brand-900 bg-brand-700 flex items-center justify-center text-xs font-bold">
                   +50
                 </div>
               </div>
               <div className="text-sm font-medium text-slate-300">
                 Equipo Técnico y Administrativo
               </div>
            </div>
          </motion.div>
        </div>
      </div>

    </div>
  );
}

export default App;