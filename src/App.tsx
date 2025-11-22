import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import Dashboard from "./pages/Dashboard";
import Biens from "./pages/Biens";
import Proprietaires from "./pages/Proprietaires";
import Locataires from "./pages/Locataires";
import Paiements from "./pages/Paiements";
import Depenses from "./pages/Depenses";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/biens" element={<Biens />} />
              <Route path="/proprietaires" element={<Proprietaires />} />
              <Route path="/locataires" element={<Locataires />} />
              <Route path="/paiements" element={<Paiements />} />
              <Route path="/depenses" element={<Depenses />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
