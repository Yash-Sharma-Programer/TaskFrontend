import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Files, FolderKanban, LayoutDashboard, LogOut, Menu, MessageCircle, Moon, Settings, Sun, Users, X, GanttChart, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { invitationsApi, notificationsApi, organisationsApi, workspacesApi } from '../api';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/ui';
import { useSocket } from '../hooks/useSocket';

const links = [
  ['Dashboard', '/dashboard', LayoutDashboard], ['Projects', '/projects', FolderKanban], ['My Tasks', '/my-tasks', ListChecks], ['Chat', '/chat', MessageCircle], ['Calendar', '/calendar', CalendarDays], ['Timeline', '/timeline', GanttChart], ['Team', '/team', Users], ['Files', '/files', Files], ['Settings', '/settings', Settings]
];
const Sidebar = ({ mobile = false }) => {
  const { sidebarCollapsed, toggleSidebar, setMobileNav } = useAppStore(); const collapsed = sidebarCollapsed && !mobile;
  return <aside className={`${collapsed ? 'w-20' : 'w-64'} flex h-full shrink-0 flex-col bg-gradient-to-b from-plum-950 to-plum-900 text-white transition-[width]`}>
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-coral font-black">T</span>{!collapsed && <span className="text-xl font-black">TaskFlow</span>}{mobile && <button className="ml-auto rounded-lg p-2 hover:bg-white/10" onClick={() => setMobileNav(false)}><X/></button>}</div>
    <nav className="flex-1 space-y-1 p-3">{links.map(([label,to,Icon]) => <NavLink key={to} to={to} onClick={() => setMobileNav(false)} className={({isActive}) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-coral text-white shadow-lg shadow-coral/20' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}><Icon size={19}/>{!collapsed && label}</NavLink>)}</nav>
    {!mobile && <button className="m-3 flex items-center justify-center rounded-xl bg-white/10 p-2.5 hover:bg-white/15" onClick={toggleSidebar}>{collapsed ? <ChevronRight size={18}/> : <><ChevronLeft size={18}/><span className="ml-2 text-sm">Collapse</span></>}</button>}
  </aside>;
};
const NotificationMenu = () => {
  const [open, setOpen] = useState(false);
  const [responding, setResponding] = useState(null);
  const queryClient = useQueryClient();
  const { setOrganisations, selectOrganisation } = useAppStore();
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((response) => response.data.data),
    refetchInterval: 60000,
  });
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['invitations'],
    queryFn: () =>
      invitationsApi.list().then((response) => response.data.data.invitations),
    refetchInterval: 60000,
  });
  const items = data?.notifications || [];
  const unread = (data?.unread || 0) + pendingInvitations.length;

  const markAll = async () => {
    const old = queryClient.getQueryData(['notifications']);
    queryClient.setQueryData(['notifications'], (current) =>
      current
        ? {
            ...current,
            unread: 0,
            notifications: current.notifications.map((notification) => ({
              ...notification,
              readAt: notification.readAt || new Date().toISOString(),
            })),
          }
        : current,
    );
    try {
      await notificationsApi.readAll();
    } catch {
      queryClient.setQueryData(['notifications'], old);
    } finally {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  };

  const respondToInvitation = async (invitation, action) => {
    setResponding(invitation.id);
    try {
      await invitationsApi.respond(invitation.id, action);
      await queryClient.invalidateQueries({ queryKey: ['invitations'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (action === 'accept') {
        const organisations = (await organisationsApi.list()).data.data
          .organisations;
        setOrganisations(organisations);
        const joined = organisations.find(
          (organisation) => organisation.id === invitation.organisation.id,
        );
        if (joined) selectOrganisation(joined);
        toast.success(`You joined ${invitation.organisation.name}`);
      } else {
        toast.success('Invitation declined');
      }
      setOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not respond to invitation');
    } finally {
      setResponding(null);
    }
  };

  const openNotification = async (notification) => {
    const old = queryClient.getQueryData(['notifications']);
    if (!notification.readAt) {
      queryClient.setQueryData(['notifications'], (current) =>
        current
          ? {
              ...current,
              unread: Math.max(0, current.unread - 1),
              notifications: current.notifications.map((item) =>
                item.id === notification.id
                  ? { ...item, readAt: new Date().toISOString() }
                  : item,
              ),
            }
          : current,
      );
    }
    try {
      if (!notification.readAt) await notificationsApi.read(notification.id);
    } catch {
      queryClient.setQueryData(['notifications'], old);
    }
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    setOpen(false);
    if (notification.link) location.assign(notification.link);
  };

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen(!open)}
        className="relative rounded-xl border border-line bg-white p-2.5 dark:border-white/10 dark:bg-white/5"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-30 w-[min(92vw,380px)] rounded-2xl border border-line bg-card p-2 shadow-2xl dark:border-white/10 dark:bg-plum-900">
          <div className="flex items-center justify-between p-2">
            <strong>Notifications</strong>
            <button className="text-xs font-semibold text-coral" onClick={markAll}>
              Mark all read
            </button>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {pendingInvitations.map((invitation) => (
              <div
                className="rounded-xl border border-coral/20 bg-coral/5 p-3 text-sm"
                key={invitation.id}
              >
                <strong>Join {invitation.organisation.name}</strong>
                <p className="mt-1 text-xs text-muted">
                  {invitation.invitedBy.fullName} invited you as {invitation.role}.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold dark:border-white/10"
                    disabled={responding === invitation.id}
                    onClick={() => respondToInvitation(invitation, 'reject')}
                  >
                    Decline
                  </button>
                  <button
                    className="rounded-lg bg-coral px-3 py-1.5 text-xs font-bold text-white"
                    disabled={responding === invitation.id}
                    onClick={() => respondToInvitation(invitation, 'accept')}
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
            {items.map((notification) => (
              <button
                key={notification.id}
                onClick={() => openNotification(notification)}
                className={`w-full rounded-xl p-3 text-left text-sm hover:bg-canvas dark:hover:bg-white/5 ${!notification.readAt ? 'bg-coral/5' : ''}`}
              >
                <span className="font-semibold">{notification.title}</span>
                <p className="mt-1 text-xs text-muted">{notification.message}</p>
              </button>
            ))}
            {!pendingInvitations.length && !items.length && (
              <p className="p-6 text-center text-sm text-muted">You’re all caught up.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default function AppLayout() {
  useSocket();
  const { organisation, organisations, selectOrganisation, setOrganisations, workspace, setWorkspace, mobileNav, setMobileNav, theme, compact, setAppearance, user } = useAppStore(); const { logout } = useAuth(); const navigate = useNavigate();
  const { data: workspaceData } = useQuery({ queryKey: ['workspaces', organisation?.id], queryFn: () => workspacesApi.list().then((r) => r.data.data.workspaces), enabled: Boolean(organisation) });
  const switchOrg = async (id) => { const selected = organisations.find((o) => o.id === id); selectOrganisation(selected); const orgs = (await organisationsApi.list()).data.data.organisations; setOrganisations(orgs); navigate('/dashboard'); };
  const toggleTheme = () => { const next = theme === 'dark' ? 'light' : 'dark'; setAppearance({ theme: next }); document.documentElement.classList.toggle('dark', next === 'dark'); };
  const doLogout = async () => { await logout(); toast.success('Logged out'); navigate('/login'); };
  return <div className={theme === 'dark' ? 'dark' : ''}><div className="flex h-screen overflow-hidden bg-canvas dark:bg-[#1c0d25]"><div className="hidden lg:block"><Sidebar/></div>{mobileNav && <div className="fixed inset-0 z-40 flex bg-plum-950/50 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setMobileNav(false)}><Sidebar mobile/></div>}<div className="flex min-w-0 flex-1 flex-col"><header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-card px-4 dark:border-white/10 dark:bg-plum-900 sm:px-6"><button className="rounded-xl p-2 hover:bg-canvas lg:hidden" onClick={() => setMobileNav(true)}><Menu/></button><select aria-label="Organisation" className="max-w-40 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/5" value={organisation?.id || ''} onChange={(e) => switchOrg(e.target.value)}>{organisations.map((o) => <option value={o.id} key={o.id}>{o.name}</option>)}</select>{workspaceData?.length > 0 && <select aria-label="Workspace" className="hidden max-w-40 rounded-xl border border-line bg-white px-3 py-2 text-sm sm:block dark:border-white/10 dark:bg-white/5" value={workspace?.id || workspaceData[0].id} onChange={(e) => setWorkspace(workspaceData.find((w) => w.id === e.target.value))}>{workspaceData.map((w) => <option value={w.id} key={w.id}>{w.name}</option>)}</select>}<div className="ml-auto flex items-center gap-2"><button aria-label="Toggle theme" onClick={toggleTheme} className="rounded-xl border border-line bg-white p-2.5 dark:border-white/10 dark:bg-white/5">{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button><NotificationMenu/><div className="hidden items-center gap-2 pl-2 sm:flex"><Avatar user={user}/><div className="max-w-32"><p className="truncate text-sm font-bold">{user?.fullName}</p><p className="truncate text-xs text-muted">{organisation?.role}</p></div></div><button aria-label="Log out" className="rounded-xl p-2.5 text-muted hover:bg-danger/10 hover:text-danger" onClick={doLogout}><LogOut size={19}/></button></div></header><main className={`scrollbar-thin flex-1 overflow-y-auto ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6 lg:p-8'}`}><Outlet/></main></div></div></div>;
}
