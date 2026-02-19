import { Navigate, createBrowserRouter } from "react-router-dom";
import { MAIN_PATH } from "src/constant";
import MainLayout from "src/layouts/MainLayout";
import {
  AuthProvider,
  ProtectedRoute,
  AdminLayout,
  LoginPage,
  DashboardPage,
  ContentsPage,
  HeroPage,
  SectionsPage,
  MenuPage,
  LogsPage,
} from "src/admin";

const router = createBrowserRouter([
  // Main Public Routes
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: MAIN_PATH.root,
        element: <Navigate to={`/${MAIN_PATH.browse}`} />,
      },
      {
        path: MAIN_PATH.browse,
        lazy: () => import("src/pages/HomePage"),
      },
      {
        path: `${MAIN_PATH.browse}/genre/movie`,
        lazy: () => import("src/pages/HomePage"),
      },
      {
        path: `${MAIN_PATH.browse}/genre/tv`,
        lazy: () => import("src/pages/HomePage"),
      },
      {
        path: `${MAIN_PATH.browse}/latest`,
        lazy: () => import("src/pages/HomePage"),
      },
      {
        path: "my-list",
        lazy: () => import("src/pages/MyListPage"),
      },
      {
        path: `${MAIN_PATH.browse}/:mediaType/:id`,
        lazy: () => import("src/pages/DetailPage"),
      },
      {
        path: MAIN_PATH.genreExplore,
        children: [
          {
            path: ":genreId",
            lazy: () => import("src/pages/GenreExplore"),
          },
        ],
      },
      {
        path: `${MAIN_PATH.watch}/:mediaType/:id`,
        lazy: () => import("src/pages/WatchPage"),
      },
      {
        path: MAIN_PATH.watch,
        lazy: () => import("src/pages/WatchPage"),
      },
      {
        path: "account",
        lazy: () => import("src/pages/AccountPage"),
      },
    ],
  },

  // Admin Login (standalone, no layout)
  {
    path: "/admin/login",
    element: (
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    ),
  },

  // Admin Protected Routes
  {
    path: "/admin",
    element: (
      <AuthProvider>
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      </AuthProvider>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "contents",
        element: <ContentsPage />,
      },
      {
        path: "hero",
        element: <HeroPage />,
      },
      {
        path: "sections",
        element: <SectionsPage />,
      },
      {
        path: "menu",
        element: <MenuPage />,
      },
      {
        path: "logs",
        element: <LogsPage />,
      },
    ],
  },
]);

export default router;
