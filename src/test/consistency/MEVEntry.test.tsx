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

vi.mock('../../../components/ui/ToastProvider', () => ({
    useToast: () => ({
        addToast: vi.fn(),
        removeToast: vi.fn()
    })
}));

vi.mock('../../../src/services/api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
    }
}));

const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    entry: {
        id: 'entry-mev-123',
        folioNumber: 5,
        type: EntryType.MEV,
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
        // MEV Data
        mevNovelties: 'Novedades de maquinaria: Excavadora en mantenimiento',
        
        // Standard fields
        description: 'MEV Daily Description',
        // MEV uses specific fields for observations
        mevContractorResponse: 'MEV Contractor Obs',
        mevFindings: 'MEV Interventoria Obs',
        additionalObservations: 'MEV Additional Obs',
        
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

describe('MEV Entry Consistency', () => {

    it('should SHOW MEV novelties and observations', () => {
        render(<EntryDetailModal {...defaultProps} />);

        // Assert MEV Novelties text is rendered
        expect(screen.getByText('Maquinaria y Equipos (MEV)')).toBeInTheDocument();
        expect(screen.getByText(/Excavadora en mantenimiento/)).toBeInTheDocument();
        
        // Assert Observations
        expect(screen.getByText(/MEV Contractor Obs/)).toBeInTheDocument();
        expect(screen.getByText(/MEV Interventoria Obs/)).toBeInTheDocument();
        expect(screen.getByText(/MEV Additional Obs/)).toBeInTheDocument();
    });
});
