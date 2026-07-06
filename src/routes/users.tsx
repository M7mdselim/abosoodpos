import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { userService } from "@/services/userService";
import type { User, UserRole } from "@/types";
import { useSession } from "@/context/RoleContext";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/users")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    const session = authService.getSession();
    if (session?.role !== "admin" && session?.role !== "developer") {
      throw redirect({ to: "/pos" });
    }
  },
  component: UsersPage,
});

function UsersPage() {
  const { session } = useSession();
  const [tick, setTick] = useState(0);
  const [creating, setCreating] = useState(false);
  const list = userService.list();

  const isAdminOrDev = session?.role === "admin" || session?.role === "developer";

  if (!isAdminOrDev) {
    return (
      <PageShell title="Users">
        <div className="text-center text-muted-foreground py-16">
          Admins only.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Users"
      subtitle={`${list.length} users`}
      actions={
        <Button size="lg" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-5 w-5" /> New User
        </Button>
      }
    >
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-semibold">{u.name}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={u.status === "active"}
                      onCheckedChange={(v) => {
                        userService.update(u.id, { status: v ? "active" : "inactive" });
                        setTick((t) => t + 1);
                      }}
                    />
                    <span className="text-xs">{u.status}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      userService.remove(u.id);
                      toast.success("User removed");
                      setTick((t) => t + 1);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <NewUserDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={() => setTick((t) => t + 1)}
      />
    </PageShell>
  );
}

function NewUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("cashier");

  function save() {
    if (!name) {
      toast.error("Enter a name");
      return;
    }
    userService.create({ name, role: role as any, status: "active" });
    toast.success("User created");
    onCreated();
    onOpenChange(false);
    setName("");
    setRole("cashier");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New User</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
