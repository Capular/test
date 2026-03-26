import LayoutShell from "@/components/dashboard/LayoutShell";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <LayoutShell>{children}</LayoutShell>;
}
