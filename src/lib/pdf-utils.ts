import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Use a CDN for the PDF.js worker
const setWorker = () => {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Using unpkg for better consistency with .mjs workers
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
};

export interface CertificateData {
  name: string;
  date: string;
  additionalText: string;
  fontSize: number;
  template: string;
  templatePdfBytes?: Uint8Array | null;
  // Positioning Offsets
  yOffsetName?: number;
  xOffsetName?: number;
  yOffsetDescription?: number;
  xOffsetDescription?: number;
  yOffsetSignatures?: number;
  xOffsetSignatures?: number;
  showSystemElements?: boolean;
}

export function formatName(name: string): string {
  const prepositions = ['de', 'da', 'do', 'das', 'dos', 'e'];
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && prepositions.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export const generateCertificate = async (data: CertificateData): Promise<Uint8Array> => {
  let pdfDoc: PDFDocument;
  let page;
  let width, height;

  const isCustom = data.template === 'custom';
  const showElements = data.showSystemElements !== false;

  if (isCustom && data.templatePdfBytes) {
    const basePdf = await PDFDocument.load(data.templatePdfBytes);
    pdfDoc = await PDFDocument.create();
    const [templatePage] = await pdfDoc.copyPages(basePdf, [0]);
    page = pdfDoc.addPage(templatePage);
    ({ width, height } = page.getSize());
  } else {
    pdfDoc = await PDFDocument.create();
    page = pdfDoc.addPage([841.89, 595.28]);
    ({ width, height } = page.getSize());
  }

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const ccmNavy = rgb(15/255, 32/255, 54/255);
  const ccmGreen = rgb(76/255, 116/255, 33/255);
  const ccmGold = rgb(212/255, 175/255, 55/255);

  // 1. Draw Background/Decorations ONLY if NOT custom or if explicitly asked
  if (!isCustom) {
    const template = data.template || 'template1';
    if (template === 'template1') {
      page.drawEllipse({ x: -10, y: height / 2, xScale: 150, yScale: 350, color: ccmNavy, opacity: 0.9 });
      page.drawEllipse({ x: -40, y: height / 2, xScale: 130, yScale: 320, color: ccmGreen, opacity: 0.7 });
      page.drawEllipse({ x: -70, y: height / 2, xScale: 110, yScale: 290, color: rgb(0.95, 0.95, 0.95), opacity: 1 });
      const title = 'Certificado de Menção Honrosa';
      page.drawText(title, { x: width / 2 - fontSerif.widthOfTextAtSize(title, 34) / 2 + 50, y: height - 120, size: 34, font: fontSerif });
    } else if (template === 'template4') {
      page.drawRectangle({ x: 0, y: 0, width, height, color: ccmNavy });
      page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: ccmGold, borderWidth: 4 });
      const title = 'CERTIFICADO DE MENÇÃO HONROSA';
      page.drawText(title, { x: width / 2 - fontBold.widthOfTextAtSize(title, 28) / 2, y: height - 120, size: 28, font: fontBold, color: ccmGold });
    } else {
      page.drawRectangle({ x: 30, y: 30, width: width - 60, height: height - 60, borderColor: ccmNavy, borderWidth: 1.5 });
      const title = 'CERTIFICADO';
      page.drawText(title, { x: width / 2 - fontBold.widthOfTextAtSize(title, 48) / 2, y: height - 130, size: 48, font: fontBold, color: ccmNavy });
    }
  }

  // 2. Content (Description)
  const descriptionLines = data.additionalText.split('\n');
  let currentY = height - 240 + (data.yOffsetDescription || 0);
  for (const line of descriptionLines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    const descFontSize = 18;
    const descWidth = fontItalic.widthOfTextAtSize(cleanLine, descFontSize);
    page.drawText(cleanLine, {
      x: (width / 2 - descWidth / 2) + (data.xOffsetDescription || 0),
      y: currentY,
      size: descFontSize,
      font: fontItalic,
      color: (isCustom || data.template === 'template4') && !isCustom ? rgb(0.9, 0.9, 0.9) : rgb(0.2, 0.2, 0.2),
    });
    currentY -= 26;
  }

  // 3. Student Name
  const studentName = data.name;
  const nameFont = fontBold;
  let nameFontSize = data.fontSize || 48;
  let nameWidth = nameFont.widthOfTextAtSize(studentName, nameFontSize);
  const maxWidth = width - 240;
  while (nameWidth > maxWidth && nameFontSize > 12) {
    nameFontSize -= 2;
    nameWidth = nameFont.widthOfTextAtSize(studentName, nameFontSize);
  }

  page.drawText(studentName, {
    x: (width / 2 - nameWidth / 2) + (data.xOffsetName || 0),
    y: height / 2 - 40 + (data.yOffsetName || 0),
    size: nameFontSize,
    font: nameFont,
    color: data.template === 'template4' ? ccmGold : rgb(0, 0, 0),
  });

  // 4. Signatures / Footer (Only if showElements is true)
  if (showElements) {
    const sigY = 110 + (data.yOffsetSignatures || 0);
    const sigXOffset = data.xOffsetSignatures || 0;
    const sigColor = data.template === 'template4' ? rgb(0.7, 0.7, 0.7) : rgb(0.4, 0.4, 0.4);

    page.drawLine({ start: { x: 100 + sigXOffset, y: sigY }, end: { x: 300 + sigXOffset, y: sigY }, thickness: 0.5, color: sigColor });
    page.drawText('Direção-Geral', { x: (200 + sigXOffset) - fontRegular.widthOfTextAtSize('Direção-Geral', 10) / 2, y: sigY - 15, size: 10, font: fontRegular, color: sigColor });

    page.drawLine({ start: { x: width - 300 + sigXOffset, y: sigY }, end: { x: width - 100 + sigXOffset, y: sigY }, thickness: 0.5, color: sigColor });
    page.drawText('Direção Auxiliar', { x: (width - 200 + sigXOffset) - fontRegular.widthOfTextAtSize('Direção Auxiliar', 10) / 2, y: sigY - 15, size: 10, font: fontRegular, color: sigColor });

    const [year, month, day] = data.date.split('-');
    const dateStr = `Ponta Grossa, ${day}/${month}/${year}`;
    page.drawText(dateStr, { x: (width / 2 - fontRegular.widthOfTextAtSize(dateStr, 11) / 2) + sigXOffset, y: 60 + (data.yOffsetSignatures || 0), size: 11, font: fontRegular, color: sigColor });
  }

  return await pdfDoc.save();
};

export const renderPdfToCanvas = async (pdfBytes: Uint8Array, canvas: HTMLCanvasElement) => {
  try {
    setWorker();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const loadingTask = pdfjsLib.getDocument({ 
      url,
      verbosity: 0,
    });
    
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    // Calculate scale to fit container width but keep quality
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Clear canvas before drawing
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: context,
      canvas: canvas,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error rendering PDF to canvas:', error);
    return false;
  }
};
