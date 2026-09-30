// Converte um PDF em uma imagem PNG por página, inteiramente no navegador, para reaproveitar
// sem nenhuma mudança o pipeline de upload de fotos já existente (POST /api/upload por
// arquivo -> array de URLs em answerKeyImages/studentExamImages). Evita depender de uma lib
// nativa de rasterização de PDF no servidor/Docker (poppler, mupdf etc.).
'use client'

const PDF_RENDER_SCALE = 2 // resolução maior para manter a legibilidade pra IA

async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  return pdfjsLib
}

function canvasToPngFile(canvas: HTMLCanvasElement, fileName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Não foi possível converter a página do PDF em imagem.'))
        return
      }
      resolve(new File([blob], fileName, { type: 'image/png' }))
    }, 'image/png')
  })
}

export async function convertPdfToImageFiles(file: File): Promise<File[]> {
  const pdfjsLib = await loadPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const baseName = file.name.replace(/\.pdf$/i, '')
  const pageFiles: File[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Não foi possível preparar o canvas para renderizar o PDF.')
    }

    await page.render({ canvasContext: context, viewport, canvas }).promise

    const fileName = `${baseName}-pagina-${pageNumber}.png`
    pageFiles.push(await canvasToPngFile(canvas, fileName))
  }

  return pageFiles
}
