

import EventEmitter from "events"

export interface TraceRegisterProps {
  site: string
  page: string
  isMobile: boolean
  originalX: number
  originalY: number
  x: number
  y: number
  clientWidth: number
  clientHeight: number
  scrollHeight: number
}

export interface GroupedTraces {
  site: string
  page: string
  isMobile: boolean
  events: string
  originalEvents: TraceRegisterProps[]
}

interface IHeatMap {
  track(): void
  stop(): void
  report(props: { page: string, site: string }): Promise<void>
}

export interface HeatMapOptions {
  /** Time interval in miliseconds collect data */
  timeInterval?: number
  /** Quantity of interactions of the maximum heat */
  maxIntensity?: number
  /** API that will persist all the events */
  postEventsAPI?: `${"https" | "http"}://${string}`,
  /** API that will retrieve all the events */
  getEventsAPI?: `${"https" | "http"}://${string}`,
  /** API key to handle authorization */
  apiKey?: string
}

export class HeatMap implements IHeatMap {
  private traces: TraceRegisterProps[] = []
  private isMobile: boolean = false
  private site: string | undefined
  private currentPage: string | undefined
  private options: HeatMapOptions = {}
  private eventbus: EventEmitter
  private ctx: CanvasRenderingContext2D | undefined

  constructor(args: HeatMapOptions = { maxIntensity: 10 }) {
    this.options = args
    this.eventbus = new EventEmitter()
    this.subscribe()
  }

  track(): void {
    this.isMobile = window.innerWidth <= 768
    this.site = window.location.host
    this.currentPage = window.location.pathname

    if (this.isMobile) {
      this.stop()
      throw new Error('Method not implemented.') // TODO: Implement mobile approach
    }

    window.addEventListener('mousemove', this.handle.bind(this))

    if (this.options.timeInterval) {
      setInterval(() => {
        this.eventbus.emit('post_events', this.traces)
        this.clearTraces()
      }, this.options.timeInterval)
    }
  }

  async report(props: { page: string, site: string }): Promise<void> {
    await this.fetchTraces(props.page, props.site)
  }

  stop(): void {
    this.clear()
    window.removeEventListener('mousemove', this.handle, false)
  }

  private subscribe() {
    // this.eventbus.on('heatmap_draw', (trace: TraceRegisterProps) => {
    //   this.drawElement(trace)
    // })

    this.eventbus.on('post_events', async (traces) => {
      this.post(traces)
    })
  }

  private clearTraces() {
    this.traces = []
  }

  private clear() {
    this.site = undefined
    this.currentPage = undefined
    this.clearTraces()
  }

  private async post(traces: TraceRegisterProps[]): Promise<void> {
    if (!traces.length) return
    if (!this.options.postEventsAPI) throw new Error('Invalid HeatMap property options.postEventsApi')
    if (!this.options.apiKey) throw new Error('Invalid HeatMap property options.apiKey')

    await fetch(this.options.postEventsAPI, {
      method: 'POST',
      headers: {
        'api-key': this.options.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(this.group(traces))
    })
  }

  private group(traces: TraceRegisterProps[]): GroupedTraces[] {
    const mapper = new Map<string, TraceRegisterProps[]>()

    for (const trace of traces) {
      const key = `${trace.page}||${trace.site}||${trace.isMobile}`
      if (!mapper.has(key)) {
        mapper.set(key, [])
      }
      mapper.get(key)!.push(trace)
    }

    const grouped: GroupedTraces[] = []

    for (const [key, group] of mapper.entries()) {
      const [page, site, isMobile] = key.split('||')

      grouped.push({
        page,
        site,
        isMobile: isMobile === 'true',
        events: Buffer.from(JSON.stringify(group)).toString('base64'),
        originalEvents: group
      })
    }

    return grouped
  }

  private heatMapBuffer = new Map<string, number>();

  private increaseHeat(x: number, y: number): number {
    const cellSize = 10; // precisão da célula
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    const key = `${cellX},${cellY}`;

    const current = this.heatMapBuffer.get(key) || 0;
    const updated = current + 1;

    this.heatMapBuffer.set(key, updated);

    return updated;
  }

  private getHeatColor(intensity: number): string {
    if (intensity >= 20) return 'rgba(255, 0, 0, 0.4)'; // vermelho
    if (intensity >= 10) return 'rgba(255, 165, 0, 0.3)'; // laranja
    if (intensity >= 5) return 'rgba(255, 255, 0, 0.2)'; // amarelo
    return 'rgba(0, 255, 0, 0.1)'; // verde
  }

  private drawElement(props: TraceRegisterProps): void {
    const ctx = this.getCanvaCtx();
    const x = (props.x / 100) * document.documentElement.clientWidth;
    const y = (props.y / 100) * document.documentElement.scrollHeight;

    const intensity = this.increaseHeat(x, y);
    const color = this.getHeatColor(intensity);
    const radius = 30;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color); // centro forte
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // borda transparente

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private getCanvaCtx(): CanvasRenderingContext2D {
    if (this.ctx) return this.ctx

    const canvas = document.getElementById("heatmap") as HTMLCanvasElement
    if (!canvas) {
      this.stop()
      throw new Error(`Invalid canvas in [${HeatMap.name}]`)
    }

    canvas.width = document.documentElement.clientWidth
    canvas.height = document.documentElement.scrollHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("Failed to get canvas context")
    }
    this.ctx = ctx
    return ctx
  }

  private handle(event: MouseEvent) {
    if (!this.currentPage || !this.site) return

    const x = (event.pageX / document.documentElement.clientWidth) * 100
    const y = (event.pageY / document.documentElement.scrollHeight) * 100

    const trace: TraceRegisterProps = {
      site: this.site,
      page: this.currentPage,
      isMobile: this.isMobile,
      originalX: event.pageX,
      originalY: event.pageY,
      x,
      y,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
      scrollHeight: document.documentElement.scrollHeight
    }

    this.traces = [...this.traces, trace]
    // this.eventbus.emit('heatmap_draw', trace)
  }

  private async fetchTraces(page: string, site: string) {
    const url = new URL(this.options.getEventsAPI!)
    url.searchParams.set('from', '2020-10-10')
    url.searchParams.set('to', '2025-10-10')
    url.searchParams.set('page', page)
    url.searchParams.set('site', site)
    url.searchParams.set('isMobile', 'false')

    const response = await fetch(url.toString(), {
      headers: {
        'api-key': this.options.apiKey!,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()
    const data = json.data as Array<{ compressed_data: TraceRegisterProps[] }>

    for (const item of data) {
      try {
        const traces = item.compressed_data
        for (const trace of traces) {
          this.drawElement(trace)
        }
      } catch (error) {
        console.error('Erro ao descomprimir e desenhar traces:', error)
      }
    }
  }
}