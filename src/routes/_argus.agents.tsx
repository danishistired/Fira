import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_argus/agents")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
  component: () => null,
});
