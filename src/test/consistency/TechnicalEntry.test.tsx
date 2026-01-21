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
        id: 'entry-tech-123',
        folioNumber: 2,
        type: EntryType.TECHNICAL,
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
        // Technical Data
        locationDetails: 'Test Location 123',
        description: 'Test Description Activity',
        activitiesPerformed: 'Legacy Activity',
        
        // Resources (just text check)
        materialsUsed: 'Cement, Bricks',
        contractorPersonnel: [{ role: 'Engineer', quantity: 2 }],
        
        // Observations
        contractorObservations: 'Tech Contractor Obs',
        interventoriaObservations: 'Tech Interventoria Obs',
        additionalObservations: 'Tech Additional Obs',
        
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


describe('Technical Entry Consistency', () => {

    it('should SHOW all standard fields', () => {
        render(<EntryDetailModal {...defaultProps} />);

        // Assert Location
        expect(screen.getByText('Localización / Tramo')).toBeInTheDocument();
        // Value is rendered as text in DetailRow
        expect(screen.getByText('Test Location 123')).toBeInTheDocument();

        // Assert Description (Resumen General)
        expect(screen.getByText('Resumen general del día')).toBeInTheDocument();
        expect(screen.getByText('Test Description Activity')).toBeInTheDocument();
        
        // Assert Activities Performed
        expect(screen.getByText('Actividades realizadas')).toBeInTheDocument();
        expect(screen.getByText('Legacy Activity')).toBeInTheDocument();

        // Assert Observations
        expect(screen.getByText(/Tech Contractor Obs/i)).toBeInTheDocument();
        expect(screen.getByText(/Tech Interventoria Obs/i)).toBeInTheDocument();
        expect(screen.getByText(/Tech Additional Obs/i)).toBeInTheDocument();

        // Assert Resources
        expect(screen.getByText(/Cement/)).toBeInTheDocument();
        expect(screen.getByText(/Bricks/)).toBeInTheDocument();
        expect(screen.getByText(/Engineer/)).toBeInTheDocument();
    });
});
