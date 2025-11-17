# Guía de Pruebas para Modo Offline

## Pruebas Manuales

### 1. Verificar que el Service Worker esté registrado

1. Abre la aplicación en el navegador (http://localhost:3000)
2. Abre las DevTools (F12)
3. Ve a la pestaña **Application** > **Service Workers**
4. Deberías ver el Service Worker registrado con el scope `/`
5. Estado debería ser "activated and is running"

### 2. Verificar IndexedDB

1. En DevTools, ve a **Application** > **Storage** > **IndexedDB**
2. Deberías ver la base de datos `bdo-offline-db` con 3 object stores:
   - `operations` - Operaciones pendientes
   - `cache` - Datos cacheados
   - `entities` - Entidades almacenadas localmente

### 3. Probar modo offline en la consola

Abre la consola del navegador y ejecuta:

```javascript
// Importar funciones de prueba
import('./src/services/offline/test').then(m => {
  // Ejecutar todas las pruebas
  m.runTests();
  
  // O pruebas individuales:
  // m.simulateOffline(); // Crear una operación offline
  // m.checkPendingOperations(); // Ver operaciones pendientes
});
```

### 4. Probar creación de anotación offline

1. **Simular modo offline:**
   - En DevTools, ve a **Network** tab
   - Selecciona "Offline" en el dropdown de throttling
   - O desconecta tu internet físicamente

2. **Crear una anotación:**
   - Intenta crear una nueva anotación en la aplicación
   - Deberías ver el indicador offline en la esquina inferior derecha
   - La anotación debería guardarse localmente

3. **Verificar en IndexedDB:**
   - En DevTools > Application > IndexedDB > bdo-offline-db > operations
   - Deberías ver la operación pendiente

4. **Reconectar:**
   - Vuelve a conectar (quita "Offline" del throttling o reconecta internet)
   - El indicador debería cambiar a "Online"
   - La sincronización debería ocurrir automáticamente
   - La anotación debería aparecer en el servidor

### 5. Verificar cache de recursos

1. Con la aplicación cargada, desconecta internet
2. Recarga la página (F5)
3. La aplicación debería cargar desde el cache del Service Worker
4. Deberías poder navegar por la aplicación (aunque sin datos nuevos del servidor)

### 6. Verificar indicador visual

1. El componente `OfflineIndicator` debería aparecer en la esquina inferior derecha cuando:
   - Estás offline
   - Hay operaciones pendientes de sincronización

2. El indicador muestra:
   - Estado online/offline
   - Número de operaciones pendientes
   - Botón para sincronizar manualmente (si hay conexión)

## Comandos útiles en la consola

```javascript
// Ver estado de conexión
console.log('Online:', navigator.onLine);

// Ver Service Worker
navigator.serviceWorker.getRegistration().then(reg => console.log(reg));

// Ver operaciones pendientes (requiere importar el módulo)
import('./src/services/offline/db').then(m => 
  m.offlineDB.getPendingOperations().then(ops => console.log(ops))
);

// Forzar sincronización
import('./src/services/offline/sync').then(m => m.syncManager.sync());
```

## Problemas comunes

### Service Worker no se registra
- Verifica que estés usando HTTPS o localhost
- Verifica que el archivo `public/sw.js` exista
- Revisa la consola para errores

### Operaciones no se encolan
- Verifica que `navigator.onLine` sea `false`
- Revisa la consola para errores de IndexedDB
- Verifica que el endpoint sea una operación mutante (POST, PUT, PATCH, DELETE)

### Sincronización no funciona
- Verifica que haya conexión a internet
- Revisa la consola para errores de red
- Verifica que el token de autenticación sea válido

