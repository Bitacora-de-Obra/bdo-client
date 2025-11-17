import { UserRole } from '../../types';

/**
 * Obtiene el nombre completo del rol basado en la entidad del usuario
 * Simplifica los roles a: IDU, Interventoría, Contratista
 */
export function getFullRoleName(role: string | UserRole, entity?: string | null): string {
  // Si tenemos la entidad, usarla para determinar el rol
  if (entity) {
    if (entity === 'IDU') return 'IDU';
    if (entity === 'INTERVENTORIA') return 'Interventoría';
    if (entity === 'CONTRATISTA') return 'Contratista';
  }
  
  // Fallback al mapeo tradicional
  const roleMap: Record<string, string> = {
    'RESIDENT': 'Residente de Obra',
    'SUPERVISOR': 'Supervisor',
    'CONTRACTOR_REP': 'Contratista',
    'ADMIN': 'IDU',
    'Residente de Obra': 'Residente de Obra',
    'Supervisor': 'Supervisor',
    'Contratista': 'Contratista',
    'IDU': 'IDU',
    'Interventoría': 'Interventoría',
    'Representante Contratista': 'Contratista', // Compatibilidad
    'Administrador IDU': 'IDU', // Compatibilidad
    'Invitado': 'Contratista',
  };
  return roleMap[role] || String(role);
}


