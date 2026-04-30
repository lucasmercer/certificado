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
  fontName?: string;
  fontDescription?: string;
  fontFooter?: string;
  // Logo Support
  logoBytes?: Uint8Array | null;
  logoX?: number;
  logoY?: number;
  logoScale?: number;
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

  const fonts = {
    'Helvetica': await pdfDoc.embedFont(StandardFonts.Helvetica),
    'Helvetica-Bold': await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    'Times-Roman': await pdfDoc.embedFont(StandardFonts.TimesRoman),
    'Times-Bold': await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    'Times-Italic': await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    'Courier': await pdfDoc.embedFont(StandardFonts.Courier),
  };

  const getFont = (key?: string, fallback: keyof typeof fonts = 'Helvetica') => {
    return (fonts as any)[key || ''] || fonts[fallback];
  };

  const ccmNavy = rgb(12/255, 33/255, 52/255);
  const ccmGreen = rgb(34/255, 68/255, 45/255);
  const ccmGold = rgb(194/255, 161/255, 87/255);
  const ccmLightGreen = rgb(118/255, 168/255, 29/255);

  // 1. Draw Background/Decorations ONLY if NOT custom
  if (!isCustom) {
    const template = data.template || 'template1';
    
    if (template === 'template1') {
      // Green/Gold Wave layout (Top Left)
      page.drawEllipse({ x: 0, y: height, xScale: 500, yScale: 200, color: ccmGreen, rotate: { type: 'degrees', angle: -20 } });
      page.drawEllipse({ x: 40, y: height + 20, xScale: 480, yScale: 180, color: ccmGold, rotate: { type: 'degrees', angle: -20 } });
      
      // Gold Seal (Top Left cornerish)
      page.drawCircle({ x: 120, y: height - 120, size: 60, color: ccmGold });
      page.drawCircle({ x: 120, y: height - 120, size: 50, color: rgb(250/255, 217/255, 105/255) });
      
      const title = 'CERTIFICADO';
      const titleFont = fonts['Helvetica-Bold'];
      page.drawText(title, { x: width / 2 - titleFont.widthOfTextAtSize(title, 55) / 2 + 30, y: height - 140, size: 55, font: titleFont, color: ccmNavy });
      
      // Bottom Border
      page.drawRectangle({ x: 30, y: 30, width: width - 60, height: 10, color: ccmGold });

    } else if (template === 'template2') {
      // Blue/Gold Menção Honrosa
      page.drawEllipse({ x: width, y: height, xScale: 400, yScale: 600, color: ccmNavy, rotate: { type: 'degrees', angle: 45 } });
      page.drawEllipse({ x: width - 20, y: height - 20, xScale: 380, yScale: 580, color: ccmGold, rotate: { type: 'degrees', angle: 45 } });
      
      const title = 'CERTIFICADO DE';
      const subtitle = 'MENÇÃO HONROSA';
      const titleFont = fonts['Times-Roman'];
      page.drawText(title, { x: 120, y: height - 110, size: 38, font: titleFont, color: ccmNavy });
      page.drawText(subtitle, { x: 100, y: height - 160, size: 42, font: titleFont, color: ccmNavy });

    } else if (template === 'template3') {
      // Reconhecimento Layout
      page.drawRectangle({ x: 0, y: height - 100, width: 200, height: 200, color: ccmNavy, rotate: { type: 'degrees', angle: 30 } });
      page.drawRectangle({ x: width - 150, y: 0, width: 250, height: 250, color: ccmNavy, rotate: { type: 'degrees', angle: 30 } });
      page.drawRectangle({ x: width - 180, y: -20, width: 250, height: 250, color: ccmLightGreen, rotate: { type: 'degrees', angle: 30 } });

      const title = 'CERTIFICADO';
      const titleFont = fonts['Helvetica-Bold'];
      page.drawText(title, { x: width / 2 - titleFont.widthOfTextAtSize(title, 45) / 2, y: height - 110, size: 45, font: titleFont, color: ccmNavy });
      
      // Ribbon bar
      page.drawRectangle({ x: width / 2 - 150, y: height - 160, width: 300, height: 35, color: ccmLightGreen });
      const ribbonText = 'RECONHECIMENTO';
      page.drawText(ribbonText, { x: width / 2 - fonts['Helvetica-Bold'].widthOfTextAtSize(ribbonText, 16) / 2, y: height - 148, size: 16, font: fonts['Helvetica-Bold'], color: ccmNavy });

    } else if (template === 'template4') {
      // Paraná State Style
      const title = 'Certificado de';
      const subtitle = 'Menção Honrosa';
      const titleFont = fonts['Times-Roman'];
      page.drawText(title, { x: width / 2 - titleFont.widthOfTextAtSize(title, 36) / 2, y: height - 100, size: 36, font: titleFont, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(subtitle, { x: width / 2 - titleFont.widthOfTextAtSize(subtitle, 42) / 2, y: height - 150, size: 42, font: titleFont, color: rgb(0.1, 0.1, 0.1) });
      
      // Quotes section
      const quote = 'Sucesso é o acúmulo de pequenos esforços repetidos dia a dia.';
      page.drawText(quote, { x: width - 350, y: 180, size: 14, font: fonts['Times-Italic'], color: rgb(0.2, 0.2, 0.2) });

    } else if (template === 'template5') {
      // Wave Right
      page.drawEllipse({ x: width, y: 0, xScale: 600, yScale: 900, color: ccmNavy, rotate: { type: 'degrees', angle: 10 } });
      page.drawEllipse({ x: width + 50, y: 0, xScale: 600, yScale: 900, color: ccmGreen, rotate: { type: 'degrees', angle: 15 } });

      const title = 'CERTIFICADO';
      const titleFont = fonts['Helvetica-Bold'];
      page.drawText(title, { x: width / 2 - titleFont.widthOfTextAtSize(title, 55) / 2, y: height - 130, size: 55, font: titleFont, color: ccmNavy, characterSpacing: 8 });
    }
  }

  // 2. Content (Description)
  const descriptionLines = data.additionalText.split('\n');
  const selectedFontDesc = getFont(data.fontDescription, 'Times-Italic');
  let currentY = height - 260 + (data.yOffsetDescription || 0);
  for (const line of descriptionLines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    const descFontSize = 18;
    const descWidth = selectedFontDesc.widthOfTextAtSize(cleanLine, descFontSize);
    page.drawText(cleanLine, {
      x: (width / 2 - descWidth / 2) + (data.xOffsetDescription || 0),
      y: currentY,
      size: descFontSize,
      font: selectedFontDesc,
      color: rgb(0.15, 0.15, 0.15),
    });
    currentY -= 26;
  }

  // 3. Student Name
  const studentName = data.name;
  const selectedFontName = getFont(data.fontName, 'Helvetica-Bold');
  let nameFontSize = data.fontSize || 48;
  let nameWidth = selectedFontName.widthOfTextAtSize(studentName, nameFontSize);
  const maxWidth = width - 240;
  while (nameWidth > maxWidth && nameFontSize > 12) {
    nameFontSize -= 2;
    nameWidth = selectedFontName.widthOfTextAtSize(studentName, nameFontSize);
  }

  page.drawText(studentName, {
    x: (width / 2 - nameWidth / 2) + (data.xOffsetName || 0),
    y: height / 2 - 40 + (data.yOffsetName || 0),
    size: nameFontSize,
    font: selectedFontName,
    color: rgb(0, 0, 0),
  });

  // 4. Logo (If provided)
  if (data.logoBytes) {
    try {
      const logoImage = await pdfDoc.embedPng(data.logoBytes);
      const dims = logoImage.scale(data.logoScale || 0.5);
      page.drawImage(logoImage, {
        x: (width / 2 - dims.width / 2) + (data.logoX || 0),
        y: (height - dims.height - 40) + (data.logoY || 0),
        width: dims.width,
        height: dims.height,
      });
    } catch (e) {
      console.error("Failed to embed logo PNG", e);
    }
  }

  // 5. Signatures / Footer (Only if showElements is true)
  if (showElements) {
    const sigY = 110 + (data.yOffsetSignatures || 0);
    const sigXOffset = data.xOffsetSignatures || 0;
    const sigColor = rgb(0.2, 0.2, 0.2);
    const selectedFontFooter = getFont(data.fontFooter, 'Helvetica');
    const template = data.template || 'template1';

    // Signature labels based on specific model design
    let leftSig = 'Direção';
    let rightSig = 'Direção Aux.';
    
    if (template === 'template2' || template === 'template4') {
      leftSig = 'Direção Geral';
      rightSig = 'Direção Auxiliar';
    } else if (template === 'template3' || template === 'template5') {
      leftSig = 'Direção';
      rightSig = 'Direção Auxiliar';
    }

    // Left Signature
    page.drawLine({ start: { x: 100 + sigXOffset, y: sigY }, end: { x: 300 + sigXOffset, y: sigY }, thickness: 0.5, color: sigColor });
    page.drawText(leftSig, { x: (200 + sigXOffset) - selectedFontFooter.widthOfTextAtSize(leftSig, 10) / 2, y: sigY - 15, size: 10, font: selectedFontFooter, color: sigColor });

    // Right Signature
    page.drawLine({ start: { x: width - 300 + sigXOffset, y: sigY }, end: { x: width - 100 + sigXOffset, y: sigY }, thickness: 0.5, color: sigColor });
    page.drawText(rightSig, { x: (width - 200 + sigXOffset) - selectedFontFooter.widthOfTextAtSize(rightSig, 10) / 2, y: sigY - 15, size: 10, font: selectedFontFooter, color: sigColor });

    // Middle Date Field
    const [year, month, day] = data.date.split('-');
    const dateStr = `Reserva - PR, ${day}/${month}/${year}`;
    
    // Label
    page.drawText('DATA', { x: (width / 2 - selectedFontFooter.widthOfTextAtSize('DATA', 8) / 2) + sigXOffset, y: sigY - 15, size: 8, font: selectedFontFooter, color: sigColor });
    
    // Date Value
    page.drawText(dateStr, { 
      x: (width / 2 - selectedFontFooter.widthOfTextAtSize(dateStr, 12) / 2) + sigXOffset, 
      y: 60 + (data.yOffsetSignatures || 0), 
      size: 12, 
      font: selectedFontFooter, 
      color: rgb(0,0,0) 
    });
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
