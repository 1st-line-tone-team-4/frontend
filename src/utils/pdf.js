import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

export async function getPdfPageCount(file) {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  })

  const document = await loadingTask.promise
  try {
    return document.numPages
  } finally {
    await loadingTask.destroy()
  }
}
