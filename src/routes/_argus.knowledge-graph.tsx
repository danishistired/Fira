import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_argus/knowledge-graph")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
  component: () => null,
});
