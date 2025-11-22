import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Navigation } from "./Navigation";
import logo from "@/assets/logo-panpas.jpg";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-3">
          <img src={logo} alt="PANPAS Immobilier" className="h-10 w-auto rounded-lg shadow-sm" />
          <div className="hidden md:block">
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              PANPAS Immobilier
            </h1>
            <p className="text-xs text-muted-foreground">Gestion Immobilière Moderne</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:block">
          <Navigation />
        </div>

        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="hover:bg-accent/50">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px]">
            <div className="flex items-center gap-3 mb-8">
              <img src={logo} alt="PANPAS Immobilier" className="h-10 w-auto rounded-lg shadow-sm" />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  PANPAS
                </h1>
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
