import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const login = vi.fn().mockResolvedValue({});
vi.mock('../context/AuthContext',()=>({useAuth:()=>({login})}));
import { LoginPage } from '../pages/AuthPages';

describe('login form',()=>{
  it('validates and submits credentials',async()=>{render(<MemoryRouter><LoginPage/></MemoryRouter>);const user=userEvent.setup();await user.clear(screen.getByLabelText('Email'));await user.type(screen.getByLabelText('Email'),'user@example.test');await user.clear(screen.getByLabelText('Password'));await user.type(screen.getByLabelText('Password'),'Testing@123');await user.click(screen.getByRole('button',{name:/log in/i}));await waitFor(()=>expect(login).toHaveBeenCalledWith({email:'user@example.test',password:'Testing@123'}));});
});
