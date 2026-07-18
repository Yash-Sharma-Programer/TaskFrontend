import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  members: vi.fn(),
  getMember: vi.fn(),
  invite: vi.fn(),
}));

vi.mock('../api', () => ({
  organisationsApi: {
    members: mocks.members,
    invite: mocks.invite,
    role: vi.fn(),
    removeMember: vi.fn(),
  },
  usersApi: { get: mocks.getMember },
}));

import TeamPage from '../pages/TeamPage';
import { useAppStore } from '../store/useAppStore';

const renderTeam = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TeamPage />
    </QueryClientProvider>,
  );
};

describe('Team page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      organisation: { id: 'org1', name: 'Demo Org', role: 'owner' },
      user: { id: 'owner1', fullName: 'Owner User' },
    });
    mocks.members.mockResolvedValue({
      data: {
        data: {
          members: [
            {
              id: 'membership1',
              role: 'owner',
              userId: {
                id: 'owner1',
                fullName: 'Owner User',
                email: 'owner@test.local',
                lastActiveAt: new Date().toISOString(),
              },
              taskStats: { assigned: 3, completed: 2 },
            },
          ],
        },
      },
    });
    mocks.invite.mockResolvedValue({
      data: { message: 'Invitation request sent in TaskFlow' },
    });
  });

  it('renders members without reading an unopened profile query', async () => {
    renderTeam();
    expect(await screen.findByText('Owner User')).toBeInTheDocument();
    expect(screen.getByText('owner@test.local')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(mocks.getMember).not.toHaveBeenCalled();
  });

  it('sends an in-app invitation using a username', async () => {
    renderTeam();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /invite member/i }));
    await user.type(screen.getByLabelText('TaskFlow username'), 'new.member');
    await user.click(screen.getByRole('button', { name: /send invitation/i }));
    await waitFor(() =>
      expect(mocks.invite).toHaveBeenCalledWith('org1', {
        username: 'new.member',
        role: 'member',
      }),
    );
  });
});
