import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  members: vi.fn(),
  messages: vi.fn(),
  send: vi.fn(),
  remove: vi.fn(),
  download: vi.fn(),
}));

vi.mock('../api', () => ({ chatApi: mocks }));

import ChatPage from '../pages/ChatPage';
import { useAppStore } from '../store/useAppStore';

describe('Chat page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      user: { id: 'owner1', fullName: 'Owner User' },
      organisation: { id: 'org1', role: 'owner' },
    });
    mocks.members.mockResolvedValue({
      data: {
        data: {
          members: [
            {
              id: 'member1',
              fullName: 'Member User',
              username: 'member.user',
              role: 'member',
              unread: 0,
              lastActiveAt: new Date().toISOString(),
            },
          ],
        },
      },
    });
    mocks.messages.mockResolvedValue({ data: { data: { messages: [] } } });
    mocks.send.mockResolvedValue({ data: { data: { message: { id: 'm1' } } } });
    mocks.remove.mockResolvedValue({ data: { success: true } });
    mocks.download.mockResolvedValue({ data: new Blob(['saved file']) });
  });

  it('selects a member and sends text with an emoji', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ChatPage />
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /member user/i }));
    await user.type(screen.getByLabelText('Message'), 'Hello ');
    await user.click(screen.getByRole('button', { name: 'Add emoji' }));
    await user.click(screen.getByRole('button', { name: '😀' }));
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalled());
    const form = mocks.send.mock.calls[0][1];
    expect(mocks.send.mock.calls[0][0]).toBe('member1');
    expect(form.get('body')).toBe('Hello 😀');
  });

  it('saves an attachment and deletes a message for the current user', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    mocks.messages.mockResolvedValue({
      data: {
        data: {
          messages: [
            {
              _id: 'message1',
              sender: { id: 'owner1', fullName: 'Owner User' },
              recipient: { id: 'member1', fullName: 'Member User' },
              body: 'Project file',
              attachments: [
                { _id: 'attachment1', name: 'brief.txt', mimeType: 'text/plain', size: 20, url: '/uploads/brief.txt' },
              ],
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ChatPage /></QueryClientProvider>);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /member user/i }));
    await user.click(await screen.findByRole('button', { name: 'Save brief.txt' }));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledWith('message1', 'attachment1'));
    await user.click(screen.getByRole('button', { name: 'Message options' }));
    await user.click(screen.getByRole('button', { name: 'Delete for me' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('message1', 'me'));
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    click.mockRestore();
  });
});
