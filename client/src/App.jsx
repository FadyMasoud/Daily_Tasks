import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login          from './pages/Login';
import Register       from './pages/Register';
import AdminTaskList  from './pages/admin/TaskList';
import UploadTask     from './pages/admin/UploadTask';
import AdminSubmissions from './pages/admin/Submissions';
import TaskUserDetail from './pages/admin/TaskUserDetail';
import UserTasksList  from './pages/user/TasksList';
import TaskDetail     from './pages/user/TaskDetail';
import UserHistory    from './pages/user/History';
import UserCalendar   from './pages/user/Calendar';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/tasks' : '/user/tasks'} replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/admin/tasks"       element={<ProtectedRoute adminOnly><AdminTaskList /></ProtectedRoute>} />
        <Route path="/admin/upload"      element={<ProtectedRoute adminOnly><UploadTask /></ProtectedRoute>} />
        <Route path="/admin/submissions" element={<ProtectedRoute adminOnly><AdminSubmissions /></ProtectedRoute>} />
        <Route path="/admin/submissions/:taskId/user/:userId" element={<ProtectedRoute adminOnly><TaskUserDetail /></ProtectedRoute>} />

        <Route path="/user/tasks"       element={<ProtectedRoute><UserTasksList /></ProtectedRoute>} />
        <Route path="/user/tasks/:id"   element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
        <Route path="/user/history"     element={<ProtectedRoute><UserHistory /></ProtectedRoute>} />
        <Route path="/user/calendar"    element={<ProtectedRoute><UserCalendar /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
