

import { CompressedTraces } from '@/app/libs/HeatMap'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from "next/server"

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_API_KEY!
)

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('api-key');

  if (apiKey !== 'test') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body: CompressedTraces[] = await request.json();

  const records = body.map(item => ({
    site: item.site,
    path: item.page,
    is_mobile: item.isMobile,
    compressed_data: Buffer.from(item.events, 'base64'), // decodifica base64 para Buffer
  }));

  const { error } = await supabase
    .from("events")
    .insert(records);

  if (error) {
    console.error(error);
    return NextResponse.json({ message: '[POST /heatmap/events] Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ message: 'OK' }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const site = request.nextUrl.searchParams.get("site");
  const page = request.nextUrl.searchParams.get("page");
  const isMobile = request.nextUrl.searchParams.get("isMobile");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (!site || !page || !isMobile || !from || !to) {
    return NextResponse.json({ status: 400, message: "Missing query parameters" });
  }

  const { data, error } = await supabase
    .from("events")
    .select("compressed_data")
    .eq("site", site)
    .eq("path", page)
    .eq("is_mobile", isMobile === "true")
    .gte("created_at", from)
    .lte("created_at", to);

  if (error) {
    console.error(error);
    return NextResponse.json({ status: 500, message: "Error while listing traces" });
  }

  const responseData = data!.map(item => {
    const hex = item.compressed_data.startsWith('\\x') ? item.compressed_data.slice(2) : item.compressed_data;
    const buffer = Buffer.from(hex, 'hex');

    const base64 = buffer.toString('base64');

    return {
      compressed_data: base64,
    }
  })

  return NextResponse.json({
    data: responseData,
  })
}

// const inflateRawAsync = promisify(inflateRaw);

// export async function GET(request: NextRequest) {
//   const site = request.nextUrl.searchParams.get("site");
//   const page = request.nextUrl.searchParams.get("page");
//   const isMobile = request.nextUrl.searchParams.get("isMobile");
//   const from = request.nextUrl.searchParams.get("from");
//   const to = request.nextUrl.searchParams.get("to");

//   if (!site || !page || !isMobile || !from || !to) {
//     return NextResponse.json({ status: 400, message: "Missing query parameters" });
//   }

//   const { data, error } = await supabase
//     .from("events")
//     .select("compressed_data")
//     .eq("site", site)
//     .eq("path", page)
//     .eq("is_mobile", isMobile === "true")
//     .gte("created_at", from)
//     .lte("created_at", to);

//   if (error) {
//     console.error(error);
//     return NextResponse.json({ status: 500, message: "Error while listing traces" });
//   }

//   async function* jsonBatchGenerator() {
//     for (const item of data!) {
//       // Se compressed_data for string base64
//       const compressedBase64 = typeof item.compressed_data === 'string'
//         ? item.compressed_data
//         : item.compressed_data.toString('base64');

//       const compressedBuffer = Buffer.from(compressedBase64, 'base64');

//       // Inflate raw deflate (pako.deflateRaw)
//       const decompressedBuffer = await inflateRawAsync(compressedBuffer);

//       const jsonString = decompressedBuffer.toString('utf-8');

//       const events = JSON.parse(jsonString);

//       yield JSON.stringify(events) + "\n"; // NDJSON
//     }
//   }

//   const readable = Readable.from(jsonBatchGenerator());
//   const gzipStream = createGzip();
//   const compressedStream = readable.pipe(gzipStream);

//   return new Response(compressedStream as any, {
//     status: 200,
//     headers: {
//       "Content-Type": "application/x-ndjson",
//       "Content-Encoding": "gzip",
//       "Cache-Control": "no-cache",
//     },
//   });
// }