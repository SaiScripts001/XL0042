/**
 * Document → image pipeline.
 * Everything the AI reads becomes a JPEG: photos/screenshots are downscaled,
 * PDFs are rasterised page-by-page with pdf.js (so scanned PDFs work too).
 *
 * pdf.js is dynamically imported so it only loads when a PDF is actually
 * uploaded — the landing page stays fast.
 */
const MAX_PAGES = 3 // qwen vision accepts max 3 images per request
/**
 * Vision tokens scale with image AREA (≈1 token per 784 px), so this is the
 * single biggest cost lever: a 1600px photo costs ~2.5x more than 1100px.
 * 1100px still reads prescriptions and lab reports clearly, and the AI flags
 * anything it cannot read instead of guessing.
 */
const MAX_DIM = 1100
const THUMB_DIM = 420

let pdfPromise = null
function loadPdfJs() {
  if (!pdfPromise) {
    pdfPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjsLib, worker]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjsLib
    })
  }
  return pdfPromise
}

/** Load any blob into an <img>, draw it to a canvas, return a JPEG data URL. */
function rasterise(source, maxDim, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff' // flattens transparent PNGs so text stays readable
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Could not read this image file.'))
    img.src = source
  })
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

async function renderPdf(file) {
  const pdfjsLib = await loadPdfJs()
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const pages = []
  const count = Math.min(pdf.numPages, MAX_PAGES)

  for (let n = 1; n <= count; n++) {
    const page = await pdf.getPage(n)
    const viewport = page.getViewport({ scale: 1 })
    const scale = Math.min(2, MAX_DIM / viewport.width)
    const scaled = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(scaled.width)
    canvas.height = Math.round(scaled.height)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport: scaled }).promise
    pages.push(canvas.toDataURL('image/jpeg', 0.85))
  }
  return { pages, totalPages: pdf.numPages }
}

/**
 * @returns {Promise<{pages:string[], thumb:string, fileName:string, totalPages:number, isPdf:boolean}>}
 */
export async function prepareDocument(file) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)

  let pages
  let totalPages = 1

  if (isPdf) {
    const rendered = await renderPdf(file)
    pages = rendered.pages
    totalPages = rendered.totalPages
  } else {
    const dataUrl = await readAsDataURL(file)
    pages = [await rasterise(dataUrl, MAX_DIM)]
  }

  return {
    pages,
    thumb: await rasterise(pages[0], THUMB_DIM, 0.7),
    fileName: file.name,
    totalPages,
    isPdf,
  }
}

export const ACCEPTED = 'image/*,application/pdf'
export const MAX_BYTES = 15 * 1024 * 1024
