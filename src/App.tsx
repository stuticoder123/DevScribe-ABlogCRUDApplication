import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { PublicLayout } from './layouts/PublicLayout';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { ExplorePage } from './pages/ExplorePage';
import { BlogDetailsPage } from './pages/BlogDetailsPage';
import { AuthorProfilePage } from './pages/AuthorProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage, UnauthorizedPage, ForbiddenPage } from './pages/ErrorPages';

const UserDashboardPage = lazy(() =>
  import('./pages/UserDashboardPage').then((m) => ({ default: m.UserDashboardPage }))
);
const MyBlogsPage = lazy(() =>
  import('./pages/MyBlogsPage').then((m) => ({ default: m.MyBlogsPage }))
);
const BlogEditorPage = lazy(() =>
  import('./pages/BlogEditorPage').then((m) => ({ default: m.BlogEditorPage }))
);
const BookmarksPage = lazy(() =>
  import('./pages/BookmarksPage').then((m) => ({ default: m.BookmarksPage }))
);
const ProfileSettingsPage = lazy(() =>
  import('./pages/ProfileSettingsPage').then((m) => ({ default: m.ProfileSettingsPage }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
      <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      <span>Loading workspace module...</span>
    </div>
  </div>
);

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/"
                  element={
                    <PublicLayout>
                      <LandingPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/explore"
                  element={
                    <PublicLayout>
                      <ExplorePage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/blog/:slug"
                  element={
                    <PublicLayout>
                      <BlogDetailsPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/author/:username"
                  element={
                    <PublicLayout>
                      <AuthorProfilePage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <PublicLayout>
                      <LoginPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicLayout>
                      <RegisterPage />
                    </PublicLayout>
                  }
                />

                {/* Protected Authenticated Author Workspace Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <WorkspaceLayout>
                        <UserDashboardPage />
                      </WorkspaceLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-blogs"
                  element={
                    <ProtectedRoute>
                      <WorkspaceLayout>
                        <MyBlogsPage initialStatus="all" />
                      </WorkspaceLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/drafts"
                  element={
                    <ProtectedRoute>
                      <WorkspaceLayout>
                        <MyBlogsPage initialStatus="draft" />
                      </WorkspaceLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/create"
                  element={
                    <ProtectedRoute>
                      <WorkspaceLayout>
                        <BlogEditorPage />
                      </WorkspaceLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/edit/:blogId"
                  element={
                    <ProtectedRoute>
                      <WorkspaceLayout>
                        <BlogEditorPage />
                      </WorkspaceLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/bookmarks"
                  element={
                    <ProtectedRoute>
                      <WorkspaceLayout>
                        <BookmarksPage />
                      </WorkspaceLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <WorkspaceLayout>
                        <ProfileSettingsPage />
                      </WorkspaceLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <WorkspaceLayout>
                        <ProfileSettingsPage />
                      </WorkspaceLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Admin-Only Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <WorkspaceLayout>
                        <AdminDashboardPage />
                      </WorkspaceLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requireAdmin>
                      <WorkspaceLayout>
                        <AdminDashboardPage />
                      </WorkspaceLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/blogs"
                  element={
                    <ProtectedRoute requireAdmin>
                      <WorkspaceLayout>
                        <AdminDashboardPage />
                      </WorkspaceLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Explicit Status Pages */}
                <Route
                  path="/unauthorized"
                  element={
                    <PublicLayout>
                      <UnauthorizedPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/forbidden"
                  element={
                    <PublicLayout>
                      <ForbiddenPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="*"
                  element={
                    <PublicLayout>
                      <NotFoundPage />
                    </PublicLayout>
                  }
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
