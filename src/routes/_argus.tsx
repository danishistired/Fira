import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_argus")({
  component: () => (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Outlet />
    </div>
  ),
});
