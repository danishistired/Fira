import { createFileRoute } from "@tanstack/react-router";
import { Home } from "./_argus.index";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "ARGUS" }] }),
  component: Home,
});
