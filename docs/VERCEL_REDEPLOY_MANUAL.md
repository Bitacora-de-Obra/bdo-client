# 🔄 Redeploy Manual en Vercel

## 📋 Pasos para Redeploy Manual

Si Vercel no detecta automáticamente el nuevo commit, puedes hacer un redeploy manual:

### Opción 1: Desde el Dashboard de Deployments

1. **Ve a la página de Deployments**
   - https://vercel.com/camila-arenas-projects/~/deployments

2. **Encuentra el deployment de producción de `bdo-client`**
   - Busca el deployment con el proyecto "bdo-client"
   - Debería tener el label "Production" y "Current"

3. **Click en los tres puntos (⋯)**
   - Al lado del deployment, hay un menú de tres puntos
   - Click en él

4. **Selecciona "Redeploy"**
   - En el menú desplegable, selecciona "Redeploy"
   - Confirma el redeploy

5. **Espera a que termine**
   - Verás un nuevo deployment en la lista
   - El nuevo deployment debería mostrar el commit más reciente

### Opción 2: Desde el Overview

1. **Ve al Overview del proyecto**
   - https://vercel.com/camila-arenas-projects/bdo-client

2. **Click en "Instant Rollback"**
   - En la sección "Production Deployment"
   - Click en el botón "Instant Rollback"

3. **Selecciona el commit más reciente**
   - Debería aparecer una lista de commits
   - Selecciona el commit `f0d973e` (trigger: force Vercel redeploy)
   - O el commit `c66f26f` (merge: resolve .gitignore conflict)

4. **Confirma el rollback/deploy**
   - Esto creará un nuevo deployment con el commit seleccionado

### Opción 3: Verificar que Vercel esté conectado a GitHub

1. **Ve a Settings → Git**
   - Verifica que el repositorio esté conectado
   - Verifica que la rama de producción sea `main`
   - Verifica que "Auto-deploy" esté habilitado

2. **Si no está conectado o hay problemas:**
   - Re-conecta el repositorio
   - O haz un push vacío adicional:
     ```bash
     git commit --allow-empty -m "trigger: force Vercel redeploy v2"
     git push origin main
     ```

## ✅ Verificación

Después del redeploy:
1. El nuevo deployment debería mostrar el commit `f0d973e` o más reciente
2. El status debería cambiar a "Building" y luego "Ready"
3. Una vez listo, verifica que https://bdigitales.com/ ya no muestre "Crear cuenta"

## ⚠️ Nota

El deployment `CFTdGLSZK` que veo es un "Redeploy of B2FcEtyZq", lo que significa que es un redeploy del mismo commit antiguo. Necesitas hacer un redeploy que use el nuevo commit en `main`.

