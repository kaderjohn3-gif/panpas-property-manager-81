import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Navigation } from "./Navigation";
import logo from "@/assets/logo-panpas.jpg";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-lg">
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between px-3 sm:px-4 lg:px-8 gap-3">
          {/* Logo et Titre */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <img 
              src={logo} 
              alt="PANPAS Immobilier" 
              className="h-8 sm:h-10 w-auto rounded-lg shadow-md flex-shrink-0" 
            />
            <div className="hidden sm:block min-w-0">
              <h1 className="text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent whitespace-nowrap">
                PANPAS Immobilier
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                Gestion Immobilière Moderne
              </p>
            </div>
            <div className="sm:hidden min-w-0">
              <h1 className="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                PANPAS
              </h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:block flex-shrink-0">
            <Navigation />
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="lg:hidden flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-accent/50">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px]">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b">
                <img src={logo} alt="PANPAS Immobilier" className="h-10 w-auto rounded-lg shadow-md" />
                <div>
                  <h1 className="text-base font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    PANPAS
                  </h1>
                  <p className="text-xs text-muted-foreground">Immobilier</p>
                </div>
              </div>
              <Navigation mobile />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
