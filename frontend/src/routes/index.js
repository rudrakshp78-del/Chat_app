import { Suspense, lazy } from "react";
import { Navigate, useRoutes } from "react-router-dom";

import DashboardLayout from "../layouts/dashboard";
import LoadingScreen from "../components/LoadingScreen";
import MainLayout from "../layouts/main";

const Loadable = (Component) => (props) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component {...props} />
  </Suspense>
);

export default function Router() {
  return useRoutes([
    {
      path: "/auth",
      element: <MainLayout />,
      children: [
        { element: <LoginPage />, path: "login" },
        { element: <RegisterPage />, path: "Register" },
        { element: <ResetPasswordPage />, path: "reset-password" },
        { element: <NewPasswordPage />, path: "new-password" },
        { element: <VerifyPage />, path: "Verify" },
      ],
    },
    {
      path: "/",
      element: <DashboardLayout />,
      children: [
        {
          index: true,
          element: <Navigate to="/app" replace />,
        },
        {
          path: "app",
          element: <GeneralApp />,
        },
        { path: "Settings", element: <Settings /> },
        { path: "group", element: <GroupPage /> },
        {
          path: "call",
          element: <CallPage />,
        },
        {
          path: "Profile",
          element: <ProfilePage />,
        },
        {
          path: "404",
          element: <Page404 />,
        },
        {
          path: "*",
          element: <Navigate to="/404" replace />,
        },
      ],
    },
  ]);
}

const GeneralApp = Loadable(
  lazy(() => import("../pages/dashboard/GeneralApp")),
);

const LoginPage = Loadable(lazy(() => import("../pages/auth/login")));

const RegisterPage = Loadable(lazy(() => import("../pages/auth/Register")));

const ResetPasswordPage = Loadable(
  lazy(() => import("../pages/auth/ResetPassword")),
);

const NewPasswordPage = Loadable(
  lazy(() => import("../pages/auth/NewPassword")),
);

const Settings = Loadable(lazy(() => import("../pages/dashboard/Settings")));

const CallPage = Loadable(lazy(() => import("../pages/dashboard/call")));

const GroupPage = Loadable(lazy(() => import("../pages/dashboard/Group")));

const Page404 = Loadable(lazy(() => import("../pages/Page404")));

const ProfilePage = Loadable(lazy(() => import("../pages/dashboard/Profile")));

const VerifyPage = Loadable(lazy(() => import("../pages/auth/Verify")));

