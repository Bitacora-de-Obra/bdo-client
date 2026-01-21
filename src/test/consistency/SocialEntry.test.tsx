import { describe, it, expect, vi } from 'vitest';
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
        id: 'entry-social-123',
        folioNumber: 3,
        type: EntryType.SOCIAL,
        status: EntryStatus.APPROVED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        entryDate: new Date().toISOString(),
        author: {
            id: 'author-123',
            fullName: 'Author Name',
            projectRole: UserRole.CONTRACTOR_REP,
            avatarUrl: ''
        },
        // Social Data (uses Tramos)
        socialTramos: [
            {
                tramoId: 'tramo-social-1',
                tramoName: 'Tramo Social Test',
                activities: 'Actividad Social Diaria',
                contractorObservations: 'Obs Social Contratista',
                interventoriaObservations: 'Obs Social Interventoria',
                // Additional fields
                pqrsds: [{ quantity: 1, subject: 'PQRS Test' }]
            }
        ],
        
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

describe('Social Entry Consistency', () => {

    it('should SHOW all social fields including daily activities', () => {
        render(<EntryDetailModal {...defaultProps} />);

        // Assert Tramo Name
        expect(screen.getByText('Tramo Social Test')).toBeInTheDocument();
        
        // Assert Daily Activities (Registro diario de actividades)
        expect(screen.getByText('Registro diario de actividades')).toBeInTheDocument();
        expect(screen.getByText('Actividad Social Diaria')).toBeInTheDocument();
        
        // Assert Observations
        expect(screen.getByText('Obs Social Contratista')).toBeInTheDocument();
        expect(screen.getByText('Obs Social Interventoria')).toBeInTheDocument();
        
        // Assert PQRS
        expect(screen.getByText(/PQRS Test/)).toBeInTheDocument();
    });
});
