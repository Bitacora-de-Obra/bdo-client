/**
 * Genera una URL de avatar con iniciales y color según la entidad del usuario
 */
export function generateAvatarUrl(user: { fullName: string; entity?: string | null }): string {
  const initials = getInitials(user.fullName);
  const color = getEntityColor(user.entity);
  const backgroundColor = color.background;
  const textColor = color.text;
  
  // Generar SVG como data URL
  const svg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="${backgroundColor}"/>
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="40" font-weight="bold" 
            fill="${textColor}" text-anchor="middle" dominant-baseline="central">
        ${initials}
      </text>
    </svg>
  `.trim();
  
  // Usar encodeURIComponent para evitar problemas con caracteres especiales
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Obtiene las iniciales del nombre completo (máximo 2 letras)
 */
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Obtiene el color según la entidad
 */
function getEntityColor(entity?: string | null): { background: string; text: string } {
  if (!entity) {
    return { background: '#6B7280', text: '#FFFFFF' }; // Gris por defecto
  }
  
  const normalized = entity.toUpperCase();
  
  if (normalized === 'IDU') {
    return { background: '#3B82F6', text: '#FFFFFF' }; // Azul
  } else if (normalized === 'CONTRATISTA') {
    return { background: '#10B981', text: '#FFFFFF' }; // Verde
  } else if (normalized === 'INTERVENTORIA') {
    return { background: '#EF4444', text: '#FFFFFF' }; // Rojo
  }
  
  return { background: '#6B7280', text: '#FFFFFF' }; // Gris por defecto
}

/**
 * Obtiene el avatar URL del usuario, usando el generado si no tiene uno
 */
export function getUserAvatarUrl(user: { fullName: string; entity?: string | null; avatarUrl?: string | null }): string {
  // Si tiene avatarUrl y no es una URL vacía o por defecto, usarlo
  if (user.avatarUrl && user.avatarUrl.trim() && !user.avatarUrl.includes('randomuser.me')) {
    return user.avatarUrl;
  }
  
  // Generar avatar con iniciales
  return generateAvatarUrl(user);
}

