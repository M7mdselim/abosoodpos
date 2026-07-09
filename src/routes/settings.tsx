import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import { authService } from "@/services/authService";
import { store } from "@/services/store";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wrench, Printer, Sliders, RefreshCw, Eye } from "lucide-react";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { session } = useSession();
  const { language } = useLanguage();
  const router = useRouter();

  // App settings state
  const settings = store.settings;
  const [receiptWidth, setReceiptWidth] = useState(settings.receiptWidth || 80);
  const [receiptMargin, setReceiptMargin] = useState(settings.receiptMargin !== undefined ? settings.receiptMargin : 4);
  const [receiptFontSize, setReceiptFontSize] = useState(settings.receiptFontSize || 11);

  const handleSaveSettings = () => {
    store.settings = {
      ...settings,
      receiptWidth,
      receiptMargin,
      receiptFontSize,
    };
    toast.success(
      language === "ar" ? "تم حفظ إعدادات الطابعة بنجاح وتحديث النظام" : "Receipt printer settings saved successfully!"
    );
    router.invalidate();
  };

  const handleApplyPreset = (width: number, margin: number, fontSize: number) => {
    setReceiptWidth(width);
    setReceiptMargin(margin);
    setReceiptFontSize(fontSize);
    toast.success(
      language === "ar"
        ? `تم تطبيق الإعداد المسبق: عرض ${width}مم`
        : `Applied preset for ${width}mm width`
    );
  };

  const handleResetSettings = () => {
    setReceiptWidth(80);
    setReceiptMargin(4);
    setReceiptFontSize(11);
    toast.success(
      language === "ar" ? "تمت إعادة تعيين الإعدادات الافتراضية" : "Reset to defaults successfully"
    );
  };

  // Mock sale data for the receipt preview
  const mockPreviewSale = {
    invoiceNumber: "INV-2026-9999",
    date: new Date(),
    cashierName: session?.username || "الكاشير",
    customerName: "محمد سليم (تجريبي)",
    customerPhone: "01021111666",
    carBrand: "تويوتا",
    carModel: "كامري",
    km: 145000,
    items: [
      { productId: "p1", name: "زيت تويوتا الأصلي 5W-30 (4L)", quantity: 1, unitPrice: 150 },
      { productId: "p2", name: "فلتر زيت ممتاز", quantity: 1, unitPrice: 45 },
    ],
    subtotal: 195,
    discount: 0,
    vat: 29.25,
    total: 224.25,
    paymentMethod: "Cash",
    oilUsed: "Toyota 5W-30",
    oilMileage: 10000,
  };

  return (
    <PageShell
      title={language === "ar" ? "إعدادات الطابعة والفواتير" : "Printer & Receipt Settings"}
      subtitle={language === "ar" ? "تخصيص عرض الورق، الهوامش وحجم الخط ليلائم طابعتك الحرارية" : "Configure receipt roll width, margin spacing, and print font sizing"}
    >
      <div className="grid gap-6 md:grid-cols-5 items-start">
        {/* Left Control Panel: Columns 1-3 */}
        <div className="md:col-span-3 space-y-6">
          <Card className="border-border shadow-sm bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground flex items-center gap-2 text-base">
                <Sliders className="h-5 w-5 text-primary" />
                {language === "ar" ? "أبعاد الورق وحجم الخط" : "Paper Dimensions & Font Size"}
              </CardTitle>
              <CardDescription>
                {language === "ar"
                  ? "اسحب المؤشر لضبط المقاسات بما يتناسب مع طابعة الفواتير (مثال: HPRT, Xprinter)"
                  : "Drag the sliders below to adjust layout measurements for POS hardware"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Width Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">
                    {language === "ar" ? "عرض الورق (ملي)" : "Paper Width (mm)"}
                  </Label>
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {receiptWidth} mm
                  </span>
                </div>
                <Slider
                  min={40}
                  max={120}
                  step={1}
                  value={[receiptWidth]}
                  onValueChange={(val) => setReceiptWidth(val[0])}
                  className="py-2"
                />
                <p className="text-[10px] text-muted-foreground">
                  {language === "ar"
                    ? "طابعات الفواتير الكبيرة تستخدم مقاس 80 مم، وطابعات الفيزا الصغيرة تستخدم 58 مم."
                    : "Standard desktop receipt printers use 80mm; mobile terminals use 58mm."}
                </p>
              </div>

              {/* Margins Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">
                    {language === "ar" ? "الهوامش الجانبية (ملي)" : "Side Margins (mm)"}
                  </Label>
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {receiptMargin} mm
                  </span>
                </div>
                <Slider
                  min={0}
                  max={15}
                  step={1}
                  value={[receiptMargin]}
                  onValueChange={(val) => setReceiptMargin(val[0])}
                  className="py-2"
                />
                <p className="text-[10px] text-muted-foreground">
                  {language === "ar"
                    ? "المسافة البيضاء عند الحواف الجانبية لضمان عدم قص النصوص المطبوعة."
                    : "Whitespace margin on left/right edges to prevent text clipping."}
                </p>
              </div>

              {/* Font Size Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">
                    {language === "ar" ? "حجم خط الطباعة الأساسي" : "Base Print Font Size"}
                  </Label>
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {receiptFontSize} px
                  </span>
                </div>
                <Slider
                  min={8}
                  max={20}
                  step={0.5}
                  value={[receiptFontSize]}
                  onValueChange={(val) => setReceiptFontSize(val[0])}
                  className="py-2"
                />
                <p className="text-[10px] text-muted-foreground">
                  {language === "ar"
                    ? "حجم الخط الافتراضي للنصوص الداخلية. سيتم تكبير أو تصغير العناوين تلقائياً بنسب متناسقة."
                    : "Base scaling for text elements. Sub-headings and values scale proportionally."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Presets Card */}
          <Card className="border-border shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground text-sm font-bold flex items-center gap-2">
                <Printer className="h-4.5 w-4.5 text-primary" />
                {language === "ar" ? "إعدادات مسبقة سريعة للماكينات" : "Hardware Quick Presets"}
              </CardTitle>
              <CardDescription>
                {language === "ar"
                  ? "اختر المقاس الجاهز المناسب لنوع جهاز الطباعة المتصل لديك"
                  : "Apply preset measurements quickly based on your printer model"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApplyPreset(80, 4, 11)}
                className="text-xs"
              >
                {language === "ar" ? "طابعة سطح المكتب 80 مم (Xprinter/HPRT)" : "Desktop 80mm Roll"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApplyPreset(58, 2, 9.5)}
                className="text-xs"
              >
                {language === "ar" ? "طابعة المحمول 58 مم (VISA/Pax/سلكي)" : "Mobile 58mm Slip"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApplyPreset(110, 6, 13)}
                className="text-xs"
              >
                {language === "ar" ? "فواتير عريضة 110 مم" : "Wide 110mm Label"}
              </Button>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={handleResetSettings} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              {language === "ar" ? "إعادة تعيين الافتراضي" : "Reset Defaults"}
            </Button>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => window.print()} variant="outline" className="gap-1.5">
                <Printer className="h-3.5 w-3.5" />
                {language === "ar" ? "طباعة تجربة" : "Print Test Page"}
              </Button>
              <Button size="sm" onClick={handleSaveSettings}>
                {language === "ar" ? "حفظ الإعدادات" : "Save Settings"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Live Preview: Columns 4-5 */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground px-1">
            <Eye className="h-4 w-4 text-primary" />
            <span>{language === "ar" ? "معاينة مباشرة للتعديل" : "Live Layout Preview"}</span>
          </div>

          {/* Receipt Print Style injected for the test page print */}
          <style>{`
            #receipt-print-only {
              display: none;
            }
            @media print {
              @page {
                size: ${receiptWidth}mm auto;
                margin: 0;
              }
              html, body {
                width: ${receiptWidth}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                height: auto !important;
                background: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              /* Hide the main application container and all dialog portals */
              #root,
              [data-radix-portal] {
                display: none !important;
              }
              /* Show only the flat print-only sibling container */
              #receipt-print-only {
                display: block !important;
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 6mm ${receiptMargin}mm !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                direction: rtl !important;
                font-family: system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif !important;
                font-size: ${receiptFontSize}px !important;
              }
              #receipt-print-only * {
                font-family: system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif !important;
                color: black !important;
                border-color: black !important;
                opacity: 1 !important;
              }
              #receipt-print-only table,
              #receipt-print-only td,
              #receipt-print-only th,
              #receipt-print-only .grid {
                font-size: 0.95em !important;
              }
              #receipt-print-only h1,
              #receipt-print-only .text-sm {
                font-size: 1.1em !important;
              }
              #receipt-print-only .text-base {
                font-size: 1.25em !important;
              }
            }
          `}</style>

          {/* Floated receipt preview window on screen */}
          <div className="w-full bg-muted border border-dashed border-border rounded-xl p-4 flex justify-center items-start overflow-x-auto min-h-[520px]">
            <div
              id="settings-receipt-print"
              dir="rtl"
              className="bg-white text-black shadow-lg rounded border border-border transition-all duration-150 text-right leading-normal font-sans animate-in fade-in"
              style={{
                width: `${receiptWidth}mm`,
                padding: `6mm ${receiptMargin}mm`,
                fontSize: `${receiptFontSize}px`,
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif'
              }}
            >
              {/* Header */}
              <div className="text-center">
                <div 
                  className="font-black text-black leading-tight"
                  style={{ fontSize: `${receiptFontSize * 1.3}px` }}
                >
                  {settings.companyNameAr}
                </div>
                <div 
                  className="mt-0.5 font-semibold text-black"
                  style={{ fontSize: `${receiptFontSize * 0.9}px` }}
                >
                  {settings.sloganAr}
                </div>
                <div 
                  className="mt-1 text-black font-medium"
                  style={{ fontSize: `${receiptFontSize * 0.8}px` }}
                >
                  {settings.phone && `ت: ${settings.phone}`}
                  {settings.phone && settings.address && " | "}
                  {settings.address && `${settings.address}`}
                </div>
              </div>
              
              <div className="my-2 border-t-2 border-dashed border-black" />
              
              {/* Metadata */}
              <div 
                className="grid grid-cols-2 gap-y-1 text-black"
                style={{ fontSize: `${receiptFontSize * 0.9}px` }}
              >
                <div><b>رقم الفاتورة:</b></div>
                <div className="text-left font-bold">{mockPreviewSale.invoiceNumber}</div>
                <div><b>التاريخ والوقت:</b></div>
                <div className="text-left">
                  {mockPreviewSale.date.toLocaleDateString("ar-EG")} {mockPreviewSale.date.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div><b>أمين الصندوق:</b></div>
                <div className="text-left">{mockPreviewSale.cashierName}</div>
              </div>
              
              <div className="my-2 border-t border-dashed border-black" />
              
              {/* Customer */}
              <div 
                className="text-right leading-tight space-y-0.5 bg-black/[0.01] p-1.5 border border-dashed border-black rounded"
                style={{ fontSize: `${receiptFontSize * 0.9}px` }}
              >
                <div><b>العميل:</b> {mockPreviewSale.customerName}</div>
                <div><b>الهاتف:</b> {mockPreviewSale.customerPhone}</div>
                <div><b>السيارة:</b> {mockPreviewSale.carBrand} {mockPreviewSale.carModel} — {mockPreviewSale.km.toLocaleString()} كم</div>
              </div>
              
              <div className="my-2 border-t border-dashed border-black" />
              
              {/* Product Items Table */}
              <table 
                className="w-full text-black border-collapse"
                style={{ fontSize: `${receiptFontSize * 0.9}px` }}
              >
                <thead>
                  <tr className="border-b border-black text-right font-bold">
                    <th className="py-1 text-right w-[45%]">البند</th>
                    <th className="py-1 text-center w-[15%]">الكمية</th>
                    <th className="py-1 text-left w-[20%]">السعر</th>
                    <th className="py-1 text-left w-[20%]">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {mockPreviewSale.items.map((it, idx) => (
                    <tr key={idx} className="border-b border-dashed border-black/20">
                      <td className="py-1 text-right">{it.name}</td>
                      <td className="py-1 text-center">{it.quantity}</td>
                      <td className="py-1 text-left">{it.unitPrice.toFixed(0)}</td>
                      <td className="py-1 text-left font-bold">{(it.quantity * it.unitPrice).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="my-2 border-t border-dashed border-black" />
              
              {/* Totals */}
              <div 
                className="space-y-1 text-black"
                style={{ fontSize: `${receiptFontSize * 0.9}px` }}
              >
                <div className="flex justify-between">
                  <span className="text-black/80">الإجمالي الفرعي</span>
                  <span className="font-semibold">{mockPreviewSale.subtotal.toFixed(0)} ج.م</span>
                </div>
                {mockPreviewSale.discount > 0 && (
                  <div className="flex justify-between text-black">
                    <span>الخصم</span>
                    <span>-{mockPreviewSale.discount.toFixed(0)} ج.م</span>
                  </div>
                )}
                {mockPreviewSale.vat > 0 && (
                  <div className="flex justify-between">
                    <span>الضريبة (15%)</span>
                    <span>{mockPreviewSale.vat.toFixed(0)} ج.م</span>
                  </div>
                )}
                <div 
                  className="flex justify-between border-y-2 border-black py-1 font-extrabold my-1 text-black"
                  style={{ fontSize: `${receiptFontSize * 1.1}px` }}
                >
                  <span>الإجمالي الكلي</span>
                  <span>{mockPreviewSale.total.toFixed(0)} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>طريقة الدفع</span>
                  <span>{mockPreviewSale.paymentMethod === "Cash" ? "نقدي" : "كارت"}</span>
                </div>
              </div>
              
              {/* Next Recommended Change */}
              {mockPreviewSale.oilUsed && mockPreviewSale.oilMileage && (
                <>
                  <div className="my-2 border-t border-dashed border-black" />
                  <div className="border border-black p-2 rounded text-center bg-black/[0.01]"
                    style={{ fontSize: `${receiptFontSize * 0.9}px` }}
                  >
                    <div className="font-bold text-black">تغيير الزيت القادم الموصى به ({mockPreviewSale.oilMileage.toLocaleString()} كم)</div>
                    <div className="mt-1 font-extrabold text-black tracking-wide"
                      style={{ fontSize: `${receiptFontSize * 1.3}px` }}
                    >
                      {(mockPreviewSale.km + mockPreviewSale.oilMileage).toLocaleString()} كم
                    </div>
                  </div>
                </>
              )}
              
              <div className="my-2 border-t border-dashed border-black" />
              <div 
                className="text-center text-black font-bold"
                style={{ fontSize: `${receiptFontSize * 0.9}px` }}
              >
                شكراً لزيارتكم — رافقتكم السلامة!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Render the identical clean print-only receipt sibling container directly in body */}
      {typeof document !== "undefined" && createPortal(
        <div 
          id="receipt-print-only" 
          dir="rtl"
        >
          {/* Header */}
          <div className="text-center">
            <div className="text-sm font-black text-black leading-tight">
              {settings.companyNameAr}
            </div>
            <div className="mt-0.5 font-semibold text-black">
              {settings.sloganAr}
            </div>
            <div className="mt-1 text-black font-medium">
              {settings.phone && `ت: ${settings.phone}`}
              {settings.phone && settings.address && " | "}
              {settings.address && `${settings.address}`}
            </div>
          </div>
          
          <div className="my-2 border-t-2 border-dashed border-black" />
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-y-1 text-black">
            <div><b>رقم الفاتورة:</b></div>
            <div className="text-left font-bold">{mockPreviewSale.invoiceNumber}</div>
            <div><b>التاريخ والوقت:</b></div>
            <div className="text-left">
              {mockPreviewSale.date.toLocaleDateString("ar-EG")} {mockPreviewSale.date.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div><b>أمين الصندوق:</b></div>
            <div className="text-left">{mockPreviewSale.cashierName}</div>
          </div>
          
          <div className="my-2 border-t border-dashed border-black" />
          
          {/* Customer */}
          <div className="text-right leading-tight space-y-0.5 bg-black/[0.01] p-1.5 border border-dashed border-black rounded">
            <div><b>العميل:</b> {mockPreviewSale.customerName}</div>
            <div><b>الهاتف:</b> {mockPreviewSale.customerPhone}</div>
            <div><b>السيارة:</b> {mockPreviewSale.carBrand} {mockPreviewSale.carModel} — {mockPreviewSale.km.toLocaleString()} كم</div>
          </div>
          
          <div className="my-2 border-t border-dashed border-black" />
          
          {/* Product Items Table */}
          <table className="w-full text-black border-collapse">
            <thead>
              <tr className="border-b border-black text-right font-bold">
                <th className="py-1 text-right w-[45%]">البند</th>
                <th className="py-1 text-center w-[15%]">الكمية</th>
                <th className="py-1 text-left w-[20%]">السعر</th>
                <th className="py-1 text-left w-[20%]">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {mockPreviewSale.items.map((it, idx) => (
                <tr key={idx} className="border-b border-dashed border-black/20">
                  <td className="py-1 text-right">{it.name}</td>
                  <td className="py-1 text-center">{it.quantity}</td>
                  <td className="py-1 text-left">{it.unitPrice.toFixed(0)}</td>
                  <td className="py-1 text-left font-bold">{(it.quantity * it.unitPrice).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="my-2 border-t border-dashed border-black" />
          
          {/* Totals */}
          <div className="space-y-1 text-black">
            <div className="flex justify-between">
              <span className="text-black/80">الإجمالي الفرعي</span>
              <span className="font-semibold">{mockPreviewSale.subtotal.toFixed(0)} ج.م</span>
            </div>
            {mockPreviewSale.discount > 0 && (
              <div className="flex justify-between text-black">
                <span>الخصم</span>
                <span>-{mockPreviewSale.discount.toFixed(0)} ج.م</span>
              </div>
            )}
            {mockPreviewSale.vat > 0 && (
              <div className="flex justify-between">
                <span>الضريبة (15%)</span>
                <span>{mockPreviewSale.vat.toFixed(0)} ج.م</span>
              </div>
            )}
            <div className="flex justify-between border-y-2 border-black py-1 font-extrabold my-1 text-black">
              <span>الإجمالي الكلي</span>
              <span>{mockPreviewSale.total.toFixed(0)} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>طريقة الدفع</span>
              <span>{mockPreviewSale.paymentMethod === "Cash" ? "نقدي" : "كارت"}</span>
            </div>
          </div>
          
          {/* Next Recommended Change */}
          {mockPreviewSale.oilUsed && mockPreviewSale.oilMileage && (
            <>
              <div className="my-2 border-t border-dashed border-black" />
              <div className="border border-black p-2 rounded text-center bg-black/[0.01]">
                <div className="font-bold text-black">تغيير الزيت القادم الموصى به ({mockPreviewSale.oilMileage.toLocaleString()} كم)</div>
                <div className="mt-1 font-extrabold text-black tracking-wide">
                  {(mockPreviewSale.km + mockPreviewSale.oilMileage).toLocaleString()} كم
                </div>
              </div>
            </>
          )}
          
          <div className="my-2 border-t border-dashed border-black" />
          <div className="text-center text-black font-bold">
            شكراً لزيارتكم — رافقتكم السلامة!
          </div>
        </div>,
        document.body
      )}
    </PageShell>
  );
}
