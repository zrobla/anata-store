import { SellerAuthProvider } from "@/components/seller-auth-provider";
import { SellerStudioShell } from "@/components/seller-studio-shell";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SellerAuthProvider>
      <SellerStudioShell>{children}</SellerStudioShell>
    </SellerAuthProvider>
  );
}
