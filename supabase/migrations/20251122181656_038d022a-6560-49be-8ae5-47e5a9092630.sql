-- Modifier les RLS policies pour permettre l'accès public (sans authentification)

-- PROPRIETAIRES - Accès public complet
DROP POLICY IF EXISTS "Authenticated users can view proprietaires" ON public.proprietaires;
DROP POLICY IF EXISTS "Admins and gestionnaires can insert proprietaires" ON public.proprietaires;
DROP POLICY IF EXISTS "Admins and gestionnaires can update proprietaires" ON public.proprietaires;
DROP POLICY IF EXISTS "Only admins can delete proprietaires" ON public.proprietaires;

CREATE POLICY "Public can view proprietaires" ON public.proprietaires FOR SELECT USING (true);
CREATE POLICY "Public can insert proprietaires" ON public.proprietaires FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update proprietaires" ON public.proprietaires FOR UPDATE USING (true);
CREATE POLICY "Public can delete proprietaires" ON public.proprietaires FOR DELETE USING (true);

-- BIENS - Accès public complet
DROP POLICY IF EXISTS "Authenticated users can view biens" ON public.biens;
DROP POLICY IF EXISTS "Admins and gestionnaires can insert biens" ON public.biens;
DROP POLICY IF EXISTS "Admins and gestionnaires can update biens" ON public.biens;
DROP POLICY IF EXISTS "Only admins can delete biens" ON public.biens;

CREATE POLICY "Public can view biens" ON public.biens FOR SELECT USING (true);
CREATE POLICY "Public can insert biens" ON public.biens FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update biens" ON public.biens FOR UPDATE USING (true);
CREATE POLICY "Public can delete biens" ON public.biens FOR DELETE USING (true);

-- LOCATAIRES - Accès public complet
DROP POLICY IF EXISTS "Authenticated users can view locataires" ON public.locataires;
DROP POLICY IF EXISTS "Admins and gestionnaires can insert locataires" ON public.locataires;
DROP POLICY IF EXISTS "Admins and gestionnaires can update locataires" ON public.locataires;
DROP POLICY IF EXISTS "Only admins can delete locataires" ON public.locataires;

CREATE POLICY "Public can view locataires" ON public.locataires FOR SELECT USING (true);
CREATE POLICY "Public can insert locataires" ON public.locataires FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update locataires" ON public.locataires FOR UPDATE USING (true);
CREATE POLICY "Public can delete locataires" ON public.locataires FOR DELETE USING (true);

-- CONTRATS - Accès public complet
DROP POLICY IF EXISTS "Authenticated users can view contrats" ON public.contrats;
DROP POLICY IF EXISTS "Admins and gestionnaires can insert contrats" ON public.contrats;
DROP POLICY IF EXISTS "Admins and gestionnaires can update contrats" ON public.contrats;
DROP POLICY IF EXISTS "Only admins can delete contrats" ON public.contrats;

CREATE POLICY "Public can view contrats" ON public.contrats FOR SELECT USING (true);
CREATE POLICY "Public can insert contrats" ON public.contrats FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update contrats" ON public.contrats FOR UPDATE USING (true);
CREATE POLICY "Public can delete contrats" ON public.contrats FOR DELETE USING (true);

-- PAIEMENTS - Accès public complet
DROP POLICY IF EXISTS "Authenticated users can view paiements" ON public.paiements;
DROP POLICY IF EXISTS "Admins and gestionnaires can insert paiements" ON public.paiements;
DROP POLICY IF EXISTS "Admins and gestionnaires can update paiements" ON public.paiements;
DROP POLICY IF EXISTS "Only admins can delete paiements" ON public.paiements;

CREATE POLICY "Public can view paiements" ON public.paiements FOR SELECT USING (true);
CREATE POLICY "Public can insert paiements" ON public.paiements FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update paiements" ON public.paiements FOR UPDATE USING (true);
CREATE POLICY "Public can delete paiements" ON public.paiements FOR DELETE USING (true);

-- DEPENSES - Accès public complet
DROP POLICY IF EXISTS "Authenticated users can view depenses" ON public.depenses;
DROP POLICY IF EXISTS "Admins and gestionnaires can insert depenses" ON public.depenses;
DROP POLICY IF EXISTS "Admins and gestionnaires can update depenses" ON public.depenses;
DROP POLICY IF EXISTS "Only admins can delete depenses" ON public.depenses;

CREATE POLICY "Public can view depenses" ON public.depenses FOR SELECT USING (true);
CREATE POLICY "Public can insert depenses" ON public.depenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update depenses" ON public.depenses FOR UPDATE USING (true);
CREATE POLICY "Public can delete depenses" ON public.depenses FOR DELETE USING (true);