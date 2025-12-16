import * as pdfjsLib from 'pdfjs-dist';

// Set worker source explicitly for browser environment
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

export const convertPdfToImages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const images: string[] = [];

  // Limit max pages to prevent browser crash on massive manuals, or process in chunks
  // For this demo, we'll cap at 20 pages for safety, or you can implement pagination loading.
  const pagesToProcess = Math.min(numPages, 20); 

  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdf.getPage(i);
    
    // Set scale for good resolution for AI (2.0 is usually sufficient)
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert to high quality JPEG to save some size compared to PNG
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    images.push(base64);
  }

  return images;
};
