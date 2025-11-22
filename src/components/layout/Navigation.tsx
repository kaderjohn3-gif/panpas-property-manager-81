import { NavLink } from "@/components/NavLink";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  UserCheck, 
  CreditCard, 
  Receipt,
  Bell,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationProps {
  mobile?: boolean;
}

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/biens", icon: Building2, label: "Biens" },
  { to: "/proprietaires", icon: Users, label: "Propriétaires" },
  { to: "/locataires", icon: UserCheck, label: "Locataires" },
  { to: "/paiements", icon: CreditCard, label: "Paiements" },
  { to: "/depenses", icon: Receipt, label: "Dépenses" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/rapports", icon: FileText, label: "Rapports" },
];

export const Navigation = ({ mobile }: NavigationProps) => {
  return (
    <nav className={cn(
      mobile ? "flex flex-col space-y-2" : "flex items-center space-x-1"
    )}>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
              "text-muted-foreground hover:text-primary hover:bg-accent/50",
              "hover:scale-105 active:scale-95",
              mobile && "w-full"
            )}
            activeClassName="text-primary bg-accent shadow-sm font-semibold"
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
