import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Navigation } from "./Navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import logo from "@/assets/logo-panpas.jpg";

export const Header = () => {
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Déconnexion réussie");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="PANPAS Immobilier" className="h-10 w-auto" />
          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-primary">PANPAS Immobilier</h1>
            <p className="text-xs text-muted-foreground">Gestion Immobilière</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <Navigation />
          {user && (
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px]">
            <div className="flex items-center gap-3 mb-6">
              <img src={logo} alt="PANPAS Immobilier" className="h-10 w-auto" />
              <div>
                <h1 className="text-lg font-bold text-primary">PANPAS</h1>
                <p className="text-xs text-muted-foreground">Immobilier</p>
              </div>
            </div>
            <Navigation mobile />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
