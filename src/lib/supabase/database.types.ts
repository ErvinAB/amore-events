
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_users": {
                  Row: {
                    "created_at": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"description": Json | null,"id": string,"image_path": string | null,"is_active": boolean,"name": NonNullable<Json>,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: Json | null,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"name": NonNullable<Json>,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: Json | null,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"name"?: NonNullable<Json>,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"personalization_fields": {
                  Row: {
                    "created_at": string,"help_text": Json | null,"id": string,"label": NonNullable<Json>,"max_length": number | null,"options": Json | null,"placeholder": Json | null,"product_id": string,"required": boolean,"sort_order": number,"type": Database["public"]['Enums']["personalization_field_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"help_text"?: Json | null,"id"?: string,"label": NonNullable<Json>,"max_length"?: number | null,"options"?: Json | null,"placeholder"?: Json | null,"product_id": string,"required"?: boolean,"sort_order"?: number,"type": Database["public"]['Enums']["personalization_field_type"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"help_text"?: Json | null,"id"?: string,"label"?: NonNullable<Json>,"max_length"?: number | null,"options"?: Json | null,"placeholder"?: Json | null,"product_id"?: string,"required"?: boolean,"sort_order"?: number,"type"?: Database["public"]['Enums']["personalization_field_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "personalization_fields_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_categories": {
                  Row: {
                    "category_id": string,"product_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"product_id": string
                  }
                  Update: {
                    "category_id"?: string,"product_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_categories_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_images": {
                  Row: {
                    "alt_text": Json | null,"created_at": string,"height": number | null,"id": string,"product_id": string,"sort_order": number,"storage_path": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text"?: Json | null,"created_at"?: string,"height"?: number | null,"id"?: string,"product_id": string,"sort_order"?: number,"storage_path": string,"width"?: number | null
                  }
                  Update: {
                    "alt_text"?: Json | null,"created_at"?: string,"height"?: number | null,"id"?: string,"product_id"?: string,"sort_order"?: number,"storage_path"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_images_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "created_at": string,"description": Json | null,"id": string,"is_featured": boolean,"is_new": boolean,"name": NonNullable<Json>,"price_minor": number,"sale_price_minor": number | null,"short_description": Json | null,"sku": string | null,"slug": string,"status": Database["public"]['Enums']["product_status"],"stock": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: Json | null,"id"?: string,"is_featured"?: boolean,"is_new"?: boolean,"name": NonNullable<Json>,"price_minor": number,"sale_price_minor"?: number | null,"short_description"?: Json | null,"sku"?: string | null,"slug": string,"status"?: Database["public"]['Enums']["product_status"],"stock"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: Json | null,"id"?: string,"is_featured"?: boolean,"is_new"?: boolean,"name"?: NonNullable<Json>,"price_minor"?: number,"sale_price_minor"?: number | null,"short_description"?: Json | null,"sku"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["product_status"],"stock"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"store_settings": {
                  Row: {
                    "business_address": string | null,"currency_code": string,"delivery_estimate": Json | null,"delivery_fee_minor": number,"facebook_url": string | null,"free_delivery_threshold_minor": number | null,"id": boolean,"instagram_url": string | null,"store_name": string,"support_email": string | null,"support_phone": string | null,"tiktok_url": string | null,"updated_at": string,"whatsapp_number": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_address"?: string | null,"currency_code"?: string,"delivery_estimate"?: Json | null,"delivery_fee_minor"?: number,"facebook_url"?: string | null,"free_delivery_threshold_minor"?: number | null,"id"?: boolean,"instagram_url"?: string | null,"store_name"?: string,"support_email"?: string | null,"support_phone"?: string | null,"tiktok_url"?: string | null,"updated_at"?: string,"whatsapp_number"?: string | null
                  }
                  Update: {
                    "business_address"?: string | null,"currency_code"?: string,"delivery_estimate"?: Json | null,"delivery_fee_minor"?: number,"facebook_url"?: string | null,"free_delivery_threshold_minor"?: number | null,"id"?: boolean,"instagram_url"?: string | null,"store_name"?: string,"support_email"?: string | null,"support_phone"?: string | null,"tiktok_url"?: string | null,"updated_at"?: string,"whatsapp_number"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "personalization_field_type": "text"|"textarea"|"select"|"date","product_status": "draft"|"active"|"archived"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "personalization_field_type": ["text", "textarea", "select", "date"],"product_status": ["draft", "active", "archived"]
          }
        }
} as const
