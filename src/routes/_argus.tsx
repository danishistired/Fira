import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { Sidebar } from "@/components/argus/Sidebar";
import { TopBar } from "@/components/argus/TopBar";

export const Route = createFileRoute("/_argus")({
  component: ArgusLayout,
});

function ArgusLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="pl-[72px] md:pl-[240px] transition-all">
        <TopBar />
        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
