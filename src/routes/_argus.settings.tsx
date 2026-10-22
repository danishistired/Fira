import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_argus/settings")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
  component: () => null,
});
