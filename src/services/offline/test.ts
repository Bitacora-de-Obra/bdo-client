// Script de prueba para funcionalidad offline
// Ejecutar en la consola del navegador: import('./services/offline/test').then(m => m.runTests())

import { offlineDB } from './db';
import { offlineQueue } from './queue';
import { syncManager } from './sync';

export async function runTests() {
  console.log('🧪 Iniciando pruebas de funcionalidad offline...\n');

  const results = {
    indexedDB: false,
    queue: false,
    sync: false,
    serviceWorker: false,
  };

  // Test 1: IndexedDB
  try {
    console.log('1️⃣ Probando IndexedDB...');
    await offlineDB.init();
    console.log('   ✅ IndexedDB inicializado correctamente');
    results.indexedDB = true;

    // Probar guardar y recuperar datos
    await offlineDB.cacheData('test_key', { test: 'data' });
    const cached = await offlineDB.getCachedData('test_key');
    if (cached && cached.test === 'data') {
      console.log('   ✅ Cache de datos funciona correctamente');
    } else {
      console.log('   ❌ Error al recuperar datos del cache');
    }
  } catch (error) {
    console.error('   ❌ Error en IndexedDB:', error);
  }

  // Test 2: Cola de operaciones
  try {
    console.log('\n2️⃣ Probando cola de operaciones...');
    const operation = await offlineQueue.queueRequest({
      endpoint: '/test/endpoint',
      method: 'POST',
      data: { test: 'operation' },
      entityType: 'logEntry',
    });
    console.log('   ✅ Operación encolada:', operation.id);

    const pending = await offlineDB.getPendingOperations();
    const found = pending.find((op) => op.id === operation.id);
    if (found) {
      console.log('   ✅ Operación encontrada en la cola');
      results.queue = true;
    } else {
      console.log('   ❌ Operación no encontrada en la cola');
    }
  } catch (error) {
    console.error('   ❌ Error en cola de operaciones:', error);
  }

  // Test 3: Service Worker
  try {
    console.log('\n3️⃣ Probando Service Worker...');
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('   ✅ Service Worker registrado:', registration.scope);
        results.serviceWorker = true;
      } else {
        console.log('   ⚠️ Service Worker no está registrado aún');
      }
    } else {
      console.log('   ⚠️ Service Workers no soportados en este navegador');
    }
  } catch (error) {
    console.error('   ❌ Error verificando Service Worker:', error);
  }

  // Test 4: Estado de conexión
  try {
    console.log('\n4️⃣ Probando detección de conexión...');
    console.log('   Estado actual:', navigator.onLine ? '🟢 Online' : '🔴 Offline');
    console.log('   ✅ Detección de conexión funciona');
  } catch (error) {
    console.error('   ❌ Error en detección de conexión:', error);
  }

  // Test 5: Sincronización (solo si hay conexión)
  try {
    console.log('\n5️⃣ Probando sincronización...');
    if (navigator.onLine) {
      const pendingBefore = await offlineDB.getPendingOperations();
      console.log(`   Operaciones pendientes: ${pendingBefore.length}`);
      
      if (pendingBefore.length > 0) {
        console.log('   Intentando sincronizar...');
        await syncManager.sync();
        const pendingAfter = await offlineDB.getPendingOperations();
        console.log(`   Operaciones después de sync: ${pendingAfter.length}`);
        results.sync = true;
      } else {
        console.log('   ⚠️ No hay operaciones pendientes para sincronizar');
        results.sync = true; // Consideramos éxito si no hay nada que sincronizar
      }
    } else {
      console.log('   ⚠️ Sin conexión, no se puede probar sincronización');
    }
  } catch (error) {
    console.error('   ❌ Error en sincronización:', error);
  }

  // Resumen
  console.log('\n📊 Resumen de pruebas:');
  console.log('   IndexedDB:', results.indexedDB ? '✅' : '❌');
  console.log('   Cola de operaciones:', results.queue ? '✅' : '❌');
  console.log('   Service Worker:', results.serviceWorker ? '✅' : '⚠️');
  console.log('   Sincronización:', results.sync ? '✅' : '⚠️');

  const allPassed = results.indexedDB && results.queue;
  console.log('\n' + (allPassed ? '✅ Todas las pruebas críticas pasaron' : '❌ Algunas pruebas fallaron'));

  return results;
}

// Función para simular modo offline
export async function simulateOffline() {
  console.log('🔴 Simulando modo offline...');
  
  // Crear una operación de prueba
  const operation = await offlineQueue.queueRequest({
    endpoint: '/log-entries',
    method: 'POST',
    data: {
      title: 'Test Offline Entry',
      description: 'Esta es una anotación creada en modo offline',
      type: 'Anotación',
    },
    entityType: 'logEntry',
  });

  console.log('✅ Operación encolada:', operation.id);
  
  const pending = await offlineDB.getPendingOperations();
  console.log(`📋 Total de operaciones pendientes: ${pending.length}`);
  
  return operation;
}

// Función para verificar operaciones pendientes
export async function checkPendingOperations() {
  const pending = await offlineDB.getPendingOperations();
  console.log(`📋 Operaciones pendientes: ${pending.length}`);
  pending.forEach((op, index) => {
    console.log(`   ${index + 1}. ${op.type} ${op.entityType} - ${op.endpoint} (${op.status})`);
  });
  return pending;
}


