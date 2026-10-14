import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_argus/knowledge-graph")({
  head: () => ({ meta: [{ title: "ARGUS" }] }),
  component: DisabledRoute,
});

function DisabledRoute() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="max-w-lg space-y-3">
        <h1 className="text-2xl font-semibold">This section is disabled</h1>
        <p className="text-sm text-muted-foreground">The old dashboard content was removed. Use the home page to upload samples and chat with ARGUS.</p>
        <Link to="/" className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}
