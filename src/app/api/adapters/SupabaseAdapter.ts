/* eslint-disable @typescript-eslint/no-unused-vars */
import { createClient } from '@supabase/supabase-js'
import { CreateBinaryArgs, CreateJSONArgs, DatabaseAdapter, ListArgs } from "./DatabaseAdapter.interface"

export class SupabaseAdapter implements DatabaseAdapter {
  private readonly supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_API_KEY!
  )

  async createAsBinary(_data: CreateBinaryArgs): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async createAsJSON(_data: CreateJSONArgs): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async list(args: ListArgs): Promise<{ compressed_data: string }[]> {
    const { data, error } = await this.supabaseClient
      .from("events")
      .select("compressed_data")
      .eq("site", args.site)
      .eq("path", args.page)
      .eq("is_mobile", args.isMobile === "true")
      .gte("created_at", args.from)
      .lte("created_at", args.to)

    if (error) {
      console.error(error)
      throw new Error('Error while listing traces')
    }
    return data
  }
}