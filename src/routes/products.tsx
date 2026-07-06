import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productService } from "@/services/productService";
import type { Product, ProductCategory } from "@/types";
import { formatCurrency } from "@/utils/format";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
});

const CATEGORIES: ProductCategory[] = [
  "Engine Oil",
  "Oil Filter",
  "Air Filter",
  "Cabin Filter",
  "Fuel Filter",
  "Additives",
  "Accessories",
];

function ProductsPage() {
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useMemo(() => productService.search(query), [query, tick]);
  const refresh = () => setTick((t) => t + 1);

  return (
    <PageShell
      title="Products"
      subtitle={`${list.length} products`}
      actions={
        <Button size="lg" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-5 w-5" /> New Product
        </Button>
      }
    >
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="h-12 pl-10"
        />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead className="text-right">Buy</TableHead>
              <TableHead className="text-right">Sell</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold">{p.name}</TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell>{p.brand}</TableCell>
                <TableCell className="font-mono text-xs">{p.barcode}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.buyingPrice)}</TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {formatCurrency(p.sellingPrice)}
                </TableCell>
                <TableCell className="text-right">{p.stock}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        productService.remove(p.id);
                        toast.success("Product deleted");
                        refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProductDialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        product={editing}
        onSaved={refresh}
      />
    </PageShell>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: Product | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Omit<Product, "id">>({
    name: "",
    brand: "",
    category: "Engine Oil",
    barcode: "",
    buyingPrice: 0,
    sellingPrice: 0,
    stock: 0,
  });

  useEffect(() => {
    if (product) {
      const { id: _id, ...rest } = product;
      setForm(rest);
    } else {
      setForm({
        name: "",
        brand: "",
        category: "Engine Oil",
        barcode: "",
        buyingPrice: 0,
        sellingPrice: 0,
        stock: 0,
      });
    }
  }, [product, open]);

  function save() {
    if (!form.name || !form.brand) {
      toast.error("Fill product name and brand");
      return;
    }
    if (product) {
      productService.update(product.id, form);
      toast.success("Product updated");
    } else {
      productService.create(form);
      toast.success("Product created");
    }
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "New Product"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Product Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as ProductCategory })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Brand</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Barcode</Label>
            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Buying Price</Label>
              <Input type="number" value={form.buyingPrice} onChange={(e) => setForm({ ...form, buyingPrice: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Selling Price</Label>
              <Input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </div>
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
