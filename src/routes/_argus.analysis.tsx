import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_argus/analysis")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
  component: () => null,
});
