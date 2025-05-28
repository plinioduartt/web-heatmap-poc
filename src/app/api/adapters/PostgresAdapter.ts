/* eslint-disable @typescript-eslint/no-unused-vars */
import { Pool } from 'pg'
import { CreateBinaryArgs, CreateJSONArgs, DatabaseAdapter } from "./DatabaseAdapter.interface"

export class PostgresAdapter implements DatabaseAdapter {
  private readonly pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  })

  async createAsBinary(data: CreateBinaryArgs): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `
          INSERT INTO events (site, path, is_mobile, compressed_data)
          VALUES ($1, $2, $3, $4)
        `,
        [data.site, data.page, data.isMobile, data.compressedData]
      )
      await client.query('COMMIT')
    } catch {
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
  }

  async createAsJSON(data: CreateJSONArgs): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `
          INSERT INTO events_json (site, path, is_mobile, data)
          VALUES ($1, $2, $3, $4)
        `,
        [data.site, data.page, data.isMobile, data.compressedData]
      )
      await client.query('COMMIT')
    } catch {
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
  }

  list(_args: unknown): Promise<{ compressed_data: string }[]> {
    throw new Error('Method not implemented.')
  }
}