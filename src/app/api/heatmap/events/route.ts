

import { GroupedTraces } from '@/app/libs/HeatMap'
import { NextResponse, type NextRequest } from "next/server"
import path from 'node:path'
import protobuf from 'protobufjs'
import { PostgresAdapter } from '../../adapters/PostgresAdapter'
import { SupabaseAdapter } from '../../adapters/SupabaseAdapter'

const root = await protobuf.load(path.resolve(process.cwd(), 'public', 'trace.proto'))

const postgresAdapter = new PostgresAdapter()
const supabaseAdapter = new SupabaseAdapter()

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const TraceBatch = root.lookupType('TraceBatch')

  const apiKey = request.headers.get('api-key')

  if (apiKey !== 'test') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body: GroupedTraces[] = await request.json()

  await Promise.all(
    body.map(async (item) => {
      const payload = { events: item.originalEvents };

      const errMsg = TraceBatch.verify(payload);
      if (errMsg) throw new Error(`Protobuf validation failed: ${errMsg}`);

      const message = TraceBatch.create(payload)
      const buffer = TraceBatch.encode(message).finish()

      const recordsInJSON = body.flatMap(item => item.originalEvents)

      await Promise.all([
        postgresAdapter.createAsBinary({ ...item, compressedData: buffer }),
        postgresAdapter.createAsJSON({ ...item, compressedData: JSON.stringify(recordsInJSON) })
      ])
    })
  )

  return NextResponse.json({ message: 'OK' }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const site = request.nextUrl.searchParams.get("site")
  const page = request.nextUrl.searchParams.get("page")
  const isMobile = request.nextUrl.searchParams.get("isMobile")
  const from = request.nextUrl.searchParams.get("from")
  const to = request.nextUrl.searchParams.get("to")

  if (!site || !page || !isMobile || !from || !to) {
    return NextResponse.json({ status: 400, message: "Missing query parameters" })
  }

  const data = await supabaseAdapter.list({ site, page, isMobile, from, to })

  const responseData = data!.map(item => {
    const TraceBatch = root.lookupType("TraceBatch");
    const message = TraceBatch.decode(Buffer.from(item.compressed_data.replace(/^\\x/, ''), 'hex'));
    const object = TraceBatch.toObject(message, {
      longs: String,
      enums: String,
      bytes: String,
      defaults: true,
    });

    return {
      compressed_data: object.events,
    }
  })

  return NextResponse.json({
    data: responseData,
  })
}