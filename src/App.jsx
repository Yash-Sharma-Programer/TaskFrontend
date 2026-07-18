import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import { GuestRoute, ProtectedRoute, UserRoute } from './routes/ProtectedRoute';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages';
import OnboardingPage from './pages/OnboardingPage';
import InvitationPage from './pages/InvitationPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import BoardPage from './pages/BoardPage';
import MyTasksPage from './pages/MyTasksPage';
import CalendarPage from './pages/CalendarPage';
import TimelinePage from './pages/TimelinePage';
import TeamPage from './pages/TeamPage';
import FilesPage from './pages/FilesPage';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App(){return <Routes><Route path="/" element={<Navigate to="/dashboard" replace/>}/><Route path="/login" element={<GuestRoute><LoginPage/></GuestRoute>}/><Route path="/register" element={<GuestRoute><RegisterPage/></GuestRoute>}/><Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage/></GuestRoute>}/><Route path="/reset-password" element={<ResetPasswordPage/>}/><Route path="/onboarding" element={<UserRoute><OnboardingPage/></UserRoute>}/><Route path="/invitations" element={<UserRoute><InvitationPage/></UserRoute>}/><Route element={<ProtectedRoute/>}><Route element={<AppLayout/>}><Route path="/dashboard" element={<DashboardPage/>}/><Route path="/projects" element={<ProjectsPage/>}/><Route path="/projects/:projectId/board" element={<BoardPage/>}/><Route path="/my-tasks" element={<MyTasksPage/>}/><Route path="/chat" element={<ChatPage/>}/><Route path="/calendar" element={<CalendarPage/>}/><Route path="/timeline" element={<TimelinePage/>}/><Route path="/team" element={<TeamPage/>}/><Route path="/files" element={<FilesPage/>}/><Route path="/settings" element={<SettingsPage/>}/></Route></Route><Route path="*" element={<NotFoundPage/>}/></Routes>}
