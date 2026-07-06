import { createFileRoute, redirect } from "@tanstack/react-router";
import { POSScreen } from "@/components/pos/POSScreen";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/pos")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: POSScreen,
});
