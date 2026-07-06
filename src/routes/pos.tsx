import { createFileRoute } from "@tanstack/react-router";
import { POSScreen } from "@/components/pos/POSScreen";

export const Route = createFileRoute("/pos")({
  component: POSScreen,
});
