-- Add acknowledgement fields to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS date_reception TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recu_par TEXT,
ADD COLUMN IF NOT EXISTS canal_envoi TEXT DEFAULT 'systeme' CHECK (canal_envoi IN ('systeme', 'email', 'sms', 'whatsapp')),
ADD COLUMN IF NOT EXISTS tentatives_envoi INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS dernier_erreur TEXT;

-- Add index for better performance on date queries
CREATE INDEX IF NOT EXISTS idx_notifications_date_reception ON public.notifications(date_reception);
CREATE INDEX IF NOT EXISTS idx_notifications_locataire_date ON public.notifications(locataire_id, date_envoi DESC);

-- Add comment for documentation
COMMENT ON COLUMN public.notifications.date_reception IS 'Date et heure de réception/accusé de réception de la notification';
COMMENT ON COLUMN public.notifications.recu_par IS 'Nom ou identifiant de la personne ayant accusé réception';
COMMENT ON COLUMN public.notifications.canal_envoi IS 'Canal utilisé pour l''envoi de la notification';
COMMENT ON COLUMN public.notifications.tentatives_envoi IS 'Nombre de tentatives d''envoi de la notification';
COMMENT ON COLUMN public.notifications.dernier_erreur IS 'Message de la dernière erreur d''envoi si applicable';