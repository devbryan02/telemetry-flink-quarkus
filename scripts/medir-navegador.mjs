// Mide el dashboard en un navegador real (spec §11): FPS y latencia p95 de la tarjeta de métricas.
//
// 1. Abrir Edge o Chrome con depuración remota, por ejemplo:
//    msedge --remote-debugging-port=9222 --user-data-dir=%TEMP%\edge-medicion http://localhost:3000
// 2. node scripts/medir-navegador.mjs [url] [segundos]
//
// Toma una muestra por segundo de la tarjeta (latencia p95, edad del último dato, lotes/s) y cuenta
// los frames pintados en ese tiempo.
const [url = "http://localhost:3000", segundosTxt = "15"] = process.argv.slice(2)
const segundos = Number(segundosTxt)

const objetivos = await (await fetch("http://127.0.0.1:9222/json/list")).json()
const pagina = objetivos.find((t) => t.type === "page")
if (!pagina) throw new Error("No hay ninguna pestaña abierta en el navegador con --remote-debugging-port=9222")

const ws = new WebSocket(pagina.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pendientes = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pendientes.has(m.id)) {
    pendientes.get(m.id)(m)
    pendientes.delete(m.id)
  }
}
const cmd = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id
    pendientes.set(n, r)
    ws.send(JSON.stringify({ id: n, method, params }))
  })

await cmd("Page.enable")
await cmd("Page.navigate", { url })
await new Promise((r) => setTimeout(r, 8000)) // carga inicial, mapa y primer lote

const medicion = `new Promise((resolver) => {
  const muestras = []
  let frames = 0
  const inicio = performance.now()
  const leer = (etiqueta) => {
    const texto = document.querySelector('[data-slot=card]')?.innerText ?? ''
    const m = texto.match(new RegExp(etiqueta + '\\\\s*([0-9.]+)'))
    return m ? Number(m[1]) : null
  }
  const contar = () => { frames++; requestAnimationFrame(contar) }
  requestAnimationFrame(contar)
  const intervalo = setInterval(() => {
    muestras.push({ p95: leer('Latencia p95'), edad: leer('Edad último dato'), lotes: leer('Lotes/s') })
    if (performance.now() - inicio >= ${segundos * 1000}) {
      clearInterval(intervalo)
      resolver({ fps: Math.round(frames / ((performance.now() - inicio) / 1000)), muestras })
    }
  }, 1000)
})`
const r = await cmd("Runtime.evaluate", { expression: medicion, awaitPromise: true, returnByValue: true })
const { fps, muestras } = r.result.result.value

const valores = (campo) => muestras.map((m) => m[campo]).filter((v) => v !== null).sort((a, b) => a - b)
const percentil = (lista, p) => (lista.length ? lista[Math.min(lista.length - 1, Math.floor(lista.length * p))] : null)
const p95 = valores("p95")
const edad = valores("edad")
const lotes = valores("lotes")

console.log(
  JSON.stringify({
    fps,
    latenciaP95_s: { mediana: percentil(p95, 0.5), max: p95.at(-1) ?? null },
    edadUltimoDato_s: { mediana: percentil(edad, 0.5), max: edad.at(-1) ?? null },
    lotesPorSegundo: percentil(lotes, 0.5),
    muestras: muestras.length,
  }),
)
ws.close()
process.exit(0)
