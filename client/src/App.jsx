import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import Login           from './pages/Login';
import Register        from './pages/Register';
import AdminTaskList   from './pages/admin/TaskList';
import UploadTask      from './pages/admin/UploadTask';
import AdminSubmissions from './pages/admin/Submissions';
import TaskUserDetail  from './pages/admin/TaskUserDetail';
import AdminPosts      from './pages/admin/AdminPosts';
import PostEditor      from './pages/admin/PostEditor';
import UserTasksList   from './pages/user/TasksList';
import TaskDetail      from './pages/user/TaskDetail';
import UserHistory     from './pages/user/History';
import UserCalendar    from './pages/user/Calendar';
import UserFeed        from './pages/user/UserFeed';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/tasks' : '/user/tasks'} replace />;
}

function Protected({ adminOnly: onlyAdmin, children }) {
  return (
    <ProtectedRoute adminOnly={onlyAdmin}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Admin */}
      <Route path="/admin/tasks"       element={<Protected adminOnly><AdminTaskList /></Protected>} />
      <Route path="/admin/upload"      element={<Protected adminOnly><UploadTask /></Protected>} />
      <Route path="/admin/submissions" element={<Protected adminOnly><AdminSubmissions /></Protected>} />
      <Route path="/admin/submissions/:taskId/user/:userId" element={<Protected adminOnly><TaskUserDetail /></Protected>} />
      <Route path="/admin/posts"       element={<Protected adminOnly><AdminPosts /></Protected>} />
      <Route path="/admin/posts/create" element={<Protected adminOnly><PostEditor /></Protected>} />
      <Route path="/admin/posts/:id/edit" element={<Protected adminOnly><PostEditor /></Protected>} />

      {/* User */}
      <Route path="/user/tasks"    element={<Protected><UserTasksList /></Protected>} />
      <Route path="/user/tasks/:id" element={<Protected><TaskDetail /></Protected>} />
      <Route path="/user/history"  element={<Protected><UserHistory /></Protected>} />
      <Route path="/user/calendar" element={<Protected><UserCalendar /></Protected>} />
      <Route path="/user/feed"     element={<Protected><UserFeed /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
