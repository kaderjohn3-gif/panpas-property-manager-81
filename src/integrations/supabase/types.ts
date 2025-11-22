export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      biens: {
        Row: {
          adresse: string
          created_at: string
          description: string | null
          id: string
          loyer_mensuel: number
          nom: string
          proprietaire_id: string
          statut: Database["public"]["Enums"]["statut_bien"]
          type: Database["public"]["Enums"]["type_bien"]
          updated_at: string
        }
        Insert: {
          adresse: string
          created_at?: string
          description?: string | null
          id?: string
          loyer_mensuel: number
          nom: string
          proprietaire_id: string
          statut?: Database["public"]["Enums"]["statut_bien"]
          type: Database["public"]["Enums"]["type_bien"]
          updated_at?: string
        }
        Update: {
          adresse?: string
          created_at?: string
          description?: string | null
          id?: string
          loyer_mensuel?: number
          nom?: string
          proprietaire_id?: string
          statut?: Database["public"]["Enums"]["statut_bien"]
          type?: Database["public"]["Enums"]["type_bien"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biens_proprietaire_id_fkey"
            columns: ["proprietaire_id"]
            isOneToOne: false
            referencedRelation: "proprietaires"
            referencedColumns: ["id"]
          },
        ]
      }
      contrats: {
        Row: {
          avance_mois: number
          bien_id: string
          caution: number
          created_at: string
          date_debut: string
          date_fin: string | null
          id: string
          locataire_id: string
          loyer_mensuel: number
          statut: Database["public"]["Enums"]["statut_contrat"]
          updated_at: string
        }
        Insert: {
          avance_mois?: number
          bien_id: string
          caution?: number
          created_at?: string
          date_debut: string
          date_fin?: string | null
          id?: string
          locataire_id: string
          loyer_mensuel: number
          statut?: Database["public"]["Enums"]["statut_contrat"]
          updated_at?: string
        }
        Update: {
          avance_mois?: number
          bien_id?: string
          caution?: number
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          id?: string
          locataire_id?: string
          loyer_mensuel?: number
          statut?: Database["public"]["Enums"]["statut_contrat"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrats_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_locataire_id_fkey"
            columns: ["locataire_id"]
            isOneToOne: false
            referencedRelation: "locataires"
            referencedColumns: ["id"]
          },
        ]
      }
      depenses: {
        Row: {
          bien_id: string
          categorie: Database["public"]["Enums"]["categorie_depense"]
          created_at: string
          date_depense: string
          description: string
          id: string
          montant: number
          recu_url: string | null
          updated_at: string
        }
        Insert: {
          bien_id: string
          categorie: Database["public"]["Enums"]["categorie_depense"]
          created_at?: string
          date_depense?: string
          description: string
          id?: string
          montant: number
          recu_url?: string | null
          updated_at?: string
        }
        Update: {
          bien_id?: string
          categorie?: Database["public"]["Enums"]["categorie_depense"]
          created_at?: string
          date_depense?: string
          description?: string
          id?: string
          montant?: number
          recu_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depenses_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens"
            referencedColumns: ["id"]
          },
        ]
      }
      locataires: {
        Row: {
          adresse: string | null
          created_at: string
          email: string | null
          id: string
          nom: string
          piece_identite: string | null
          telephone: string
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom: string
          piece_identite?: string | null
          telephone: string
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          piece_identite?: string | null
          telephone?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          date_envoi: string
          id: string
          locataire_id: string | null
          message: string
          statut: string
          type: string
        }
        Insert: {
          created_at?: string
          date_envoi?: string
          id?: string
          locataire_id?: string | null
          message: string
          statut?: string
          type: string
        }
        Update: {
          created_at?: string
          date_envoi?: string
          id?: string
          locataire_id?: string | null
          message?: string
          statut?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_locataire_id_fkey"
            columns: ["locataire_id"]
            isOneToOne: false
            referencedRelation: "locataires"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          bien_id: string
          contrat_id: string
          created_at: string
          date_paiement: string
          id: string
          locataire_id: string
          mois_concerne: string | null
          montant: number
          notes: string | null
          statut: Database["public"]["Enums"]["statut_paiement"]
          type: Database["public"]["Enums"]["type_paiement"]
          updated_at: string
        }
        Insert: {
          bien_id: string
          contrat_id: string
          created_at?: string
          date_paiement?: string
          id?: string
          locataire_id: string
          mois_concerne?: string | null
          montant: number
          notes?: string | null
          statut?: Database["public"]["Enums"]["statut_paiement"]
          type: Database["public"]["Enums"]["type_paiement"]
          updated_at?: string
        }
        Update: {
          bien_id?: string
          contrat_id?: string
          created_at?: string
          date_paiement?: string
          id?: string
          locataire_id?: string
          mois_concerne?: string | null
          montant?: number
          notes?: string | null
          statut?: Database["public"]["Enums"]["statut_paiement"]
          type?: Database["public"]["Enums"]["type_paiement"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paiements_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_locataire_id_fkey"
            columns: ["locataire_id"]
            isOneToOne: false
            referencedRelation: "locataires"
            referencedColumns: ["id"]
          },
        ]
      }
      proprietaires: {
        Row: {
          adresse: string | null
          created_at: string
          email: string | null
          id: string
          nom: string
          notes: string | null
          telephone: string
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom: string
          notes?: string | null
          telephone: string
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          notes?: string | null
          telephone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestionnaire" | "viewer"
      categorie_depense:
        | "reparation"
        | "electricite"
        | "eau"
        | "vidange"
        | "autre"
      statut_bien: "disponible" | "occupe"
      statut_contrat: "actif" | "termine"
      statut_paiement: "paye" | "en_attente" | "retard"
      type_bien: "maison" | "boutique" | "chambre" | "magasin"
      type_paiement: "loyer" | "avance" | "caution"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestionnaire", "viewer"],
      categorie_depense: [
        "reparation",
        "electricite",
        "eau",
        "vidange",
        "autre",
      ],
      statut_bien: ["disponible", "occupe"],
      statut_contrat: ["actif", "termine"],
      statut_paiement: ["paye", "en_attente", "retard"],
      type_bien: ["maison", "boutique", "chambre", "magasin"],
      type_paiement: ["loyer", "avance", "caution"],
    },
  },
} as const
