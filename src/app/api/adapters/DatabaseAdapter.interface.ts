import { GroupedTraces } from "@/app/libs/HeatMap";

export type CreateBinaryArgs = { compressedData: Uint8Array<ArrayBufferLike> } & GroupedTraces
export type CreateJSONArgs = { compressedData: string } & GroupedTraces
export type ListArgs = {
  site: string
  page: string
  isMobile: string
  from: string
  to: string
}
export interface DatabaseAdapter {
  createAsBinary(data: CreateBinaryArgs): Promise<void>
  createAsJSON(data: CreateJSONArgs): Promise<void>
  list(args: ListArgs): Promise<{
    compressed_data: string;
  }[]>
}