import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_argus/submissions")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
  component: () => null,
});
