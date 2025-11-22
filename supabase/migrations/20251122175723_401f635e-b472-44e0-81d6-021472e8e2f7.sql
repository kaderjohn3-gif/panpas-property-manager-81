-- Phase 1: Complete Database Schema for PANPAS Immobilier

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'gestionnaire', 'viewer');

-- Create enum for property types
CREATE TYPE public.type_bien AS ENUM ('maison', 'boutique', 'chambre', 'magasin');

-- Create enum for property status
CREATE TYPE public.statut_bien AS ENUM ('disponible', 'occupe');

-- Create enum for contract status
CREATE TYPE public.statut_contrat AS ENUM ('actif', 'termine');

-- Create enum for payment status
CREATE TYPE public.statut_paiement AS ENUM ('paye', 'en_attente', 'retard');

-- Create enum for payment type
CREATE TYPE public.type_paiement AS ENUM ('loyer', 'avance', 'caution');

-- Create enum for expense categories
CREATE TYPE public.categorie_depense AS ENUM ('reparation', 'electricite', 'eau', 'vidange', 'autre');

-- 1. PROPRIETAIRES TABLE
CREATE TABLE public.proprietaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  telephone TEXT NOT NULL,
  email TEXT,
  adresse TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. BIENS TABLE
CREATE TABLE public.biens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  type type_bien NOT NULL,
  adresse TEXT NOT NULL,
  proprietaire_id UUID NOT NULL REFERENCES public.proprietaires(id) ON DELETE RESTRICT,
  loyer_mensuel DECIMAL(10,2) NOT NULL CHECK (loyer_mensuel >= 0),
  statut statut_bien NOT NULL DEFAULT 'disponible',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. LOCATAIRES TABLE
CREATE TABLE public.locataires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  telephone TEXT NOT NULL,
  email TEXT,
  adresse TEXT,
  piece_identite TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CONTRATS TABLE
CREATE TABLE public.contrats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locataire_id UUID NOT NULL REFERENCES public.locataires(id) ON DELETE RESTRICT,
  bien_id UUID NOT NULL REFERENCES public.biens(id) ON DELETE RESTRICT,
  date_debut DATE NOT NULL,
  date_fin DATE,
  loyer_mensuel DECIMAL(10,2) NOT NULL CHECK (loyer_mensuel >= 0),
  caution DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (caution >= 0),
  avance_mois INTEGER NOT NULL DEFAULT 0 CHECK (avance_mois >= 0),
  statut statut_contrat NOT NULL DEFAULT 'actif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. PAIEMENTS TABLE
CREATE TABLE public.paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrat_id UUID NOT NULL REFERENCES public.contrats(id) ON DELETE RESTRICT,
  locataire_id UUID NOT NULL REFERENCES public.locataires(id) ON DELETE RESTRICT,
  bien_id UUID NOT NULL REFERENCES public.biens(id) ON DELETE RESTRICT,
  montant DECIMAL(10,2) NOT NULL CHECK (montant > 0),
  type type_paiement NOT NULL,
  mois_concerne DATE,
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  statut statut_paiement NOT NULL DEFAULT 'paye',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. DEPENSES TABLE
CREATE TABLE public.depenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bien_id UUID NOT NULL REFERENCES public.biens(id) ON DELETE RESTRICT,
  categorie categorie_depense NOT NULL,
  description TEXT NOT NULL,
  montant DECIMAL(10,2) NOT NULL CHECK (montant > 0),
  date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
  recu_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. USER_ROLES TABLE (for authentication and authorization)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  locataire_id UUID REFERENCES public.locataires(id) ON DELETE CASCADE,
  date_envoi TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut TEXT NOT NULL DEFAULT 'en_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_biens_proprietaire ON public.biens(proprietaire_id);
CREATE INDEX idx_biens_statut ON public.biens(statut);
CREATE INDEX idx_contrats_locataire ON public.contrats(locataire_id);
CREATE INDEX idx_contrats_bien ON public.contrats(bien_id);
CREATE INDEX idx_contrats_statut ON public.contrats(statut);
CREATE INDEX idx_paiements_contrat ON public.paiements(contrat_id);
CREATE INDEX idx_paiements_locataire ON public.paiements(locataire_id);
CREATE INDEX idx_paiements_bien ON public.paiements(bien_id);
CREATE INDEX idx_paiements_date ON public.paiements(date_paiement);
CREATE INDEX idx_depenses_bien ON public.depenses(bien_id);
CREATE INDEX idx_depenses_date ON public.depenses(date_depense);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at on all tables
CREATE TRIGGER set_updated_at_proprietaires
  BEFORE UPDATE ON public.proprietaires
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_biens
  BEFORE UPDATE ON public.biens
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_locataires
  BEFORE UPDATE ON public.locataires
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_contrats
  BEFORE UPDATE ON public.contrats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_paiements
  BEFORE UPDATE ON public.paiements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_depenses
  BEFORE UPDATE ON public.depenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  );
$$;

-- Enable Row Level Security on all tables
ALTER TABLE public.proprietaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locataires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for PROPRIETAIRES
CREATE POLICY "Authenticated users can view proprietaires"
  ON public.proprietaires FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and gestionnaires can insert proprietaires"
  ON public.proprietaires FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Admins and gestionnaires can update proprietaires"
  ON public.proprietaires FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Only admins can delete proprietaires"
  ON public.proprietaires FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for BIENS
CREATE POLICY "Authenticated users can view biens"
  ON public.biens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and gestionnaires can insert biens"
  ON public.biens FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Admins and gestionnaires can update biens"
  ON public.biens FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Only admins can delete biens"
  ON public.biens FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for LOCATAIRES
CREATE POLICY "Authenticated users can view locataires"
  ON public.locataires FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and gestionnaires can insert locataires"
  ON public.locataires FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Admins and gestionnaires can update locataires"
  ON public.locataires FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Only admins can delete locataires"
  ON public.locataires FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for CONTRATS
CREATE POLICY "Authenticated users can view contrats"
  ON public.contrats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and gestionnaires can insert contrats"
  ON public.contrats FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Admins and gestionnaires can update contrats"
  ON public.contrats FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Only admins can delete contrats"
  ON public.contrats FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for PAIEMENTS
CREATE POLICY "Authenticated users can view paiements"
  ON public.paiements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and gestionnaires can insert paiements"
  ON public.paiements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Admins and gestionnaires can update paiements"
  ON public.paiements FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Only admins can delete paiements"
  ON public.paiements FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for DEPENSES
CREATE POLICY "Authenticated users can view depenses"
  ON public.depenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and gestionnaires can insert depenses"
  ON public.depenses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Admins and gestionnaires can update depenses"
  ON public.depenses FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Only admins can delete depenses"
  ON public.depenses FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for USER_ROLES
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for NOTIFICATIONS
CREATE POLICY "Authenticated users can view notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to automatically assign admin role to first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the first user
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Default role for new users is 'viewer'
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'viewer');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to assign role on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();