import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_argus/threat-map")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
  component: () => null,
});
