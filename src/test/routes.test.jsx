import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../routes/ProtectedRoute';

vi.mock('../context/AuthContext',()=>({useAuth:()=>({user:null,ready:true})}));
vi.mock('../store/useAppStore',()=>({useAppStore:(selector)=>selector({organisation:null})}));
describe('protected routes',()=>{it('redirects unauthenticated users to login',()=>{render(<MemoryRouter initialEntries={['/dashboard']}><Routes><Route path="/login" element={<p>Login screen</p>}/><Route element={<ProtectedRoute/>}><Route path="/dashboard" element={<p>Private</p>}/></Route></Routes></MemoryRouter>);expect(screen.getByText('Login screen')).toBeInTheDocument();});});
