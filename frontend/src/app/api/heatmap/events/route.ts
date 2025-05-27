

import { CompressedTraces } from '@/app/libs/HeatMap';
import db from '@/db/lib/connection';
import { NextResponse, type NextRequest } from "next/server";

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('api-key');

  if (apiKey !== 'test') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: CompressedTraces[];

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const values = body.map(item => [
    item.site,
    item.page,
    item.isMobile,
    Buffer.from(item.events, 'base64'),
  ]);

  try {
    const query = `
      INSERT INTO binary_events (site, path, is_mobile, compressed_data)
      VALUES ${values.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ')}
    `;

    const flatValues = values.flat();

    await db.query(query, flatValues);

    return NextResponse.json({ message: 'OK' }, { status: 201 });
  } catch (err) {
    console.error('[POST] DB insert error:', err);
    return NextResponse.json({ message: 'Insert failed' }, { status: 500 });
  }
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

  try {
    const query = `
      SELECT compressed_data
      FROM binary_events
      WHERE site = $1
        AND path = $2
        AND is_mobile = $3
        AND created_at >= $4
        AND created_at <= $5
    `;

    const values = [site, page, isMobile === "true", from, to];

    const result = await db.query(query, values);

    const responseData = result.rows.map(item => {
      const base64 = item.compressed_data.toString('base64');

      return {
        compressed_data: base64,
      };
    });

    return NextResponse.json({
      data: responseData,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: 500, message: "Error while listing traces" });
  }
}