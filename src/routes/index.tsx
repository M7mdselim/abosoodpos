import { createFileRoute, redirect } from "@tanstack/react-router";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    throw redirect({ to: "/pos" });
  },
});
