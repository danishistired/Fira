import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { Home as HomePage } from "./_argus.index";

export const Route = createFileRoute("/_argus")({
  component: ArgusLayout,
});

function ArgusLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {pathname === "/" ? <HomePage /> : <Outlet />}
    </div>
  );
}
