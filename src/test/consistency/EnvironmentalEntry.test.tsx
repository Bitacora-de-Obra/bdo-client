import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EntryDetailModal from '../../../components/EntryDetailModal';
import { UserRole, EntryType, EntryStatus } from '../../../types';

// Mock useAuth
const mockUser = {
  id: 'user-123',
  fullName: 'Test User',
  email: 'test@example.com',
  avatarUrl: 'https://example.com/avatar.jpg',
  status: 'active' as const,
  projectRole: UserRole.CONTRACTOR_REP,
  appRole: 'editor' as const
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser
  })
}));

// Mock useToast
vi.mock('../../../components/ui/ToastProvider', () => ({
  useToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn()
  })
}));

// Mock API
vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock props
const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  entry: {
    id: 'entry-123',
    folioNumber: 1,
    type: EntryType.ENVIRONMENTAL,
    status: EntryStatus.DRAFT,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entryDate: new Date().toISOString(),
    author: {
      id: 'author-123',
      fullName: 'Author Name',
      projectRole: UserRole.CONTRACTOR_REP,
      avatarUrl: ''
    },
    // Environmental Data
    environmentalTramos: [
      {
        tramoId: 'tramo-1',
        tramoName: 'Tramo Test 1',
        summary: 'Actividad diaria del tramo 1',
        interventorObservations: 'Obs Interventoria 1',
        contractorObservations: 'Obs Contratista 1',
        // Checklist items
        sewerProtection: 'CUMPLE',
        materialStorage: 'NO_CUMPLE',
        cleanliness: 'CUMPLE',
        coveredTrucks: 'CUMPLE',
        greenZones: 'CUMPLE',
        treeProtection: 'CUMPLE',
        enclosure: 'CUMPLE',
        upsCount: '5',
        boalPersonnelCount: '10', // CRITICAL: This is the field to check
        emergency: true,
        emergencyDescription: 'Emergency Test'
      }
    ],
    environmentalDetail: null, // Legacy field
    
    // Global fields that should be hidden/shown based on logic (but we removed them)
    description: 'Global Description', // Should be ignored/hidden in modal for environmental
    environmentContractorResponse: 'Global Response', // Should be hidden
    additionalObservations: 'Global Additional Obs',
    reviewTasks: [],
    signatureTasks: [],
  } as any,
  onUpdate: vi.fn(),
  onRefresh: vi.fn(),
  onAddComment: vi.fn(),
  onSign: vi.fn(),
  onDelete: vi.fn(),
  currentUser: mockUser,
  availableUsers: []
};

describe('Environmental Entry Consistency', () => {
    
  it('should SHOW checklist and BOAL personnel for CONTRACTOR', () => {
    // Setup user as Contractor
    mockUser.projectRole = UserRole.CONTRACTOR_REP;
    
    render(<EntryDetailModal {...defaultProps} />);
    
    // Assert Tramo 1 Header
    expect(screen.getByText('Tramo 1')).toBeInTheDocument();
    expect(screen.getByText('Tramo Test 1')).toBeInTheDocument();
    
    // Assert Summary (Registro diario)
    expect(screen.getByText('Actividad diaria del tramo 1')).toBeInTheDocument();
    
    // Assert Checklist Items (Visible to Contractor)
    expect(screen.getByText('Alcantarillado/Sumideros:')).toBeInTheDocument();
    expect(screen.getByText('Manejo de acopios/RCD:')).toBeInTheDocument();
    
    // Assert BOAL Personnel (Visible to Contractor)
    expect(screen.getByText('Cantidad personal BOAL:')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    
    // Assert Emergency
    expect(screen.getByText('¿Emergencias?:')).toBeInTheDocument();
    expect(screen.getByText('Emergency Test')).toBeInTheDocument();
    
    // Assert Global Fields DO NOT exist (Strict check)
    expect(screen.queryByText('Registro diario de actividades')).not.toBeInTheDocument(); // Global header
    expect(screen.queryByText('Respuesta del contratista')).not.toBeInTheDocument(); // Global header
    // "Global Description" text might exist if "Observaciones del contratista" uses it? 
    // No, strictly verify header absence first.
  });

  it('should HIDE checklist and BOAL personnel for INTERVENTORIA', () => {
    // Setup user as Interventoria
    mockUser.projectRole = UserRole.SUPERVISOR;
    
    render(<EntryDetailModal {...defaultProps} />);
    
    // Assert Tramo info still visible
    expect(screen.getByText('Tramo Test 1')).toBeInTheDocument();
    expect(screen.getByText('Actividad diaria del tramo 1')).toBeInTheDocument();
    
    // Assert Checklist Items HIDDEN
    expect(screen.queryByText('Alcantarillado/Sumideros:')).not.toBeInTheDocument();
    expect(screen.queryByText('Manejo de acopios/RCD:')).not.toBeInTheDocument();
    
    // Assert BOAL Personnel HIDDEN
    expect(screen.queryByText('Cantidad personal BOAL:')).not.toBeInTheDocument();
    
    // Assert Emergency HIDDEN (It's part of the checklist block)
    expect(screen.queryByText('¿Emergencias?:')).not.toBeInTheDocument();
  });
  
  it('should NOT show global non-tramo fields', () => {
     mockUser.projectRole = UserRole.CONTRACTOR_REP;
     render(<EntryDetailModal {...defaultProps} />);
     
     // Verify "Respuesta del contratista" global field is GONE
     const globalResponseTexts = screen.queryAllByText('Respuesta del contratista');
     // There might be labels named 'Respuesta del contratista' inside other panels (SST?), so be specific.
     // In Environmental panel, we removed the global one.
     // We can check that the SPECIFIC text value "Global Response" is NOT present.
     expect(screen.queryByText('Global Response')).not.toBeInTheDocument();
     
     // Verify "Localización / Tramo" global label is GONE
     expect(screen.queryByText('Localización / Tramo')).not.toBeInTheDocument();
  });
});
