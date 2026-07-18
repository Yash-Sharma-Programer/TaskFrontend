import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(persist((set) => ({
  user: null, organisations: [], organisation: null, workspace: null, sidebarCollapsed: false, mobileNav: false, theme: 'light', compact: false,
  setAuth: (user) => set({ user }), clearAuth: () => set({ user: null, organisations: [], organisation: null, workspace: null }),
  setOrganisations: (organisations) => set((state) => ({ organisations, organisation: organisations.find((item) => item.id === state.organisation?.id) || organisations[0] || null })),
  selectOrganisation: (organisation) => { if (organisation) localStorage.setItem('taskflow-organisation', organisation.id); else localStorage.removeItem('taskflow-organisation'); set({ organisation, workspace: null }); },
  setWorkspace: (workspace) => set({ workspace }), toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })), setMobileNav: (mobileNav) => set({ mobileNav }),
  setAppearance: ({ theme, compact }) => set((s) => ({ theme: theme ?? s.theme, compact: compact ?? s.compact }))
}), { name: 'taskflow-auth', partialize: (s) => ({ user: s.user, organisation: s.organisation, workspace: s.workspace, sidebarCollapsed: s.sidebarCollapsed, theme: s.theme, compact: s.compact }) }));
