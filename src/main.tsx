import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChatPage } from "./components/ChatPage";
import { chatClient } from "./lib/chat";
import { initLocale } from "./lib/i18n";
import { initTheme } from "./lib/theme";
import { initViewportLock } from "./lib/viewport";
import "./styles.css";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ChatPage,
});

const router = createRouter({ routeTree: rootRoute.addChildren([chatRoute]) });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient();

initViewportLock();
initTheme();
initLocale();
chatClient.connect();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
