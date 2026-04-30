import React, { useState, useEffect, useRef } from 'react';
import { generateCertificate, renderPdfToCanvas, type CertificateData, formatName } from './lib/pdf-utils';
import { FileText, Download, Eye, Users, Calendar, Type, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_DESCRIPTION = "A Direção do Colégio Estadual Cívico-Militar Gregório Szeremeta\nconfere ao estudante o presente certificado de Menção Honrosa,\nem reconhecimento às boas práticas, atitudes exemplares e\ndedicação demonstradas ao longo do trimestre.";

type PdfTemplate = string;

export default function App() {
  const [names, setNames] = useState("Lucas Mercer Leniar, Pedro Albuquerque");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [additionalText, setAdditionalText] = useState(DEFAULT_DESCRIPTION);
  const [fontSize, setFontSize] = useState("48");
  const [template, setTemplate] = useState<PdfTemplate>('template1');
  const [templatePdfBytes, setTemplatePdfBytes] = useState<Uint8Array | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);
  
  // Custom Positioning State
  const [yOffsetName, setYOffsetName] = useState(0);
  const [xOffsetName, setXOffsetName] = useState(0);
  const [yOffsetDescription, setYOffsetDescription] = useState(0);
  const [xOffsetDescription, setXOffsetDescription] = useState(0);
  const [yOffsetSignatures, setYOffsetSignatures] = useState(0);
  const [xOffsetSignatures, setXOffsetSignatures] = useState(0);
  const [showSystemElements, setShowSystemElements] = useState(true);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRenderingCanvas, setIsRenderingCanvas] = useState(false);
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const bytes = new Uint8Array(event.target?.result as ArrayBuffer);
        setTemplatePdfBytes(bytes);
        setTemplateFileName(file.name);
        setTemplate('custom');
        // By default, hide system elements when using custom template
        setShowSystemElements(false);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handlePreview = async () => {
    if (!names.trim()) {
      alert("Por favor, preencha o campo 'Nomes'.");
      return;
    }
    setIsPreviewing(true);
    // Use the first student for preview
    const firstStudent = names.split(',')[0].trim();
    const studentData: CertificateData = {
      name: firstStudent,
      date,
      additionalText,
      fontSize: parseInt(fontSize) || 48,
      template,
      templatePdfBytes,
      yOffsetName,
      xOffsetName,
      yOffsetDescription,
      xOffsetDescription,
      yOffsetSignatures,
      xOffsetSignatures,
      showSystemElements
    };

    try {
      const pdfBytes = await generateCertificate(studentData);
      setPreviewPdfBytes(pdfBytes);
      setIsRenderingCanvas(true);
    } catch (error) {
      console.error("Preview failed:", error);
    } finally {
      setIsPreviewing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (previewPdfBytes) {
      const render = async () => {
        // Retry logic to wait for the canvas element to mount within AnimatePresence
        for (let i = 0; i < 10; i++) {
          if (canvasRef.current || !isMounted) break;
          await new Promise(r => setTimeout(r, 100));
        }

        if (canvasRef.current && isMounted) {
          const success = await renderPdfToCanvas(previewPdfBytes, canvasRef.current);
          if (isMounted) {
            setIsRenderingCanvas(false);
            if (!success) {
              alert("Erro ao renderizar o PDF no canvas. Tente novamente.");
            }
          }
        }
      };
      render();
    }
    return () => { isMounted = false; };
  }, [previewPdfBytes]);

  const handleDownloadAll = async () => {
    const studentNames = names.split(',').map(n => n.trim()).filter(n => n !== "");
    if (studentNames.length === 0) {
      alert("Por favor, insira ao menos um nome.");
      return;
    }

    setIsDownloading(true);
    try {
      for (const student of studentNames) {
        const capitalizedName = formatName(student);

        const studentData: CertificateData = {
          name: capitalizedName,
          date,
          additionalText,
          fontSize: parseInt(fontSize) || 48,
          template,
          templatePdfBytes,
          yOffsetName,
          xOffsetName,
          yOffsetDescription,
          xOffsetDescription,
          yOffsetSignatures,
          xOffsetSignatures,
          showSystemElements
        };

        const pdfBytes = await generateCertificate(studentData);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const fileName = `certificado_${capitalizedName.replace(/\s+/g, "_")}.pdf`;
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const studentCount = names.split(',').filter(n => n.trim()).length;

  return (
    <div className="flex flex-col h-screen w-full bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 px-8 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none">
              GERADOR DE CERTIFICADOS
            </h1>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">
              CCM Gregório Szeremeta
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none">Engine de Renderização</span>
            <span className="text-[10px] font-mono text-blue-600 font-bold">PDF-LIB v8.5</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isDownloading || isPreviewing || isRenderingCanvas ? "bg-amber-400 animate-pulse" : "bg-emerald-500")} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              {isDownloading ? "Processando Lote" : isPreviewing || isRenderingCanvas ? "Pintando Canvas" : "Sistema Pronto"}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-80 border-r border-slate-200 bg-white p-6 flex flex-col gap-6 overflow-y-auto shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="space-y-6">
            <section>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Lista de Alunos
              </label>
              <textarea
                value={names}
                onChange={(e) => setNames(e.target.value)}
                placeholder="Ex: Lucas Mercer, Maria Silva..."
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm text-slate-800 placeholder:text-slate-400 resize-none hover:border-slate-300"
              />
              <div className="flex justify-between items-center mt-2 px-1">
                <span className="text-[10px] font-medium text-slate-400">Separe por vírgulas</span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  {studentCount} Alunos
                </span>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-4">
              <section>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none font-medium hover:border-slate-300"
                />
              </section>
              <section>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Fonte Px</label>
                <input
                  type="number"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none font-medium hover:border-slate-300"
                />
              </section>
            </div>

            <section>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Selecione o Modelo (Template)</label>
              
              <div className="mb-4">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-blue-300 transition-all cursor-pointer group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileText size={20} className="text-slate-400 group-hover:text-blue-500 mb-2" />
                    <p className="text-[10px] text-slate-500 text-center px-4">
                      {templateFileName ? (
                        <span className="text-blue-600 font-bold">{templateFileName}</span>
                      ) : (
                        <span>Clique para subir seu PDF de fundo</span>
                      )}
                    </p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf" onChange={handleTemplateUpload} />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'template1', label: '1. Modelo Onda Verde' },
                  { id: 'template4', label: '2. Premium Gold/Azul' },
                  { id: 'template-std', label: '3. Institucional Padrão' },
                  ...(templatePdfBytes ? [{ id: 'custom', label: '✨ PDF PERSONALIZADO' }] : []),
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left",
                      template === t.id 
                        ? "bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/5 shadow-sm" 
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
                    {template === t.id && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Ajustes de Layout</label>
              
              <div className="space-y-4">
                {/* Nome Ajutes */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Posição do Nome</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Vertical (Y)</label>
                        <span className="text-[10px] font-mono text-blue-600">{yOffsetName > 0 ? "+" : ""}{yOffsetName}</span>
                      </div>
                      <input 
                        type="range" min="-400" max="400" value={yOffsetName} 
                        onChange={(e) => setYOffsetName(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Horiz. (X)</label>
                        <span className="text-[10px] font-mono text-blue-600">{xOffsetName > 0 ? "+" : ""}{xOffsetName}</span>
                      </div>
                      <input 
                        type="range" min="-400" max="400" value={xOffsetName} 
                        onChange={(e) => setXOffsetName(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Descrição Ajutes */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Posição da Descrição</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Vertical (Y)</label>
                        <span className="text-[10px] font-mono text-blue-600">{yOffsetDescription > 0 ? "+" : ""}{yOffsetDescription}</span>
                      </div>
                      <input 
                        type="range" min="-400" max="400" value={yOffsetDescription} 
                        onChange={(e) => setYOffsetDescription(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Horiz. (X)</label>
                        <span className="text-[10px] font-mono text-blue-600">{xOffsetDescription > 0 ? "+" : ""}{xOffsetDescription}</span>
                      </div>
                      <input 
                        type="range" min="-400" max="400" value={xOffsetDescription} 
                        onChange={(e) => setXOffsetDescription(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Rodapé Ajutes */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Posição do Rodapé</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Vertical (Y)</label>
                        <span className="text-[10px] font-mono text-blue-600">{yOffsetSignatures > 0 ? "+" : ""}{yOffsetSignatures}</span>
                      </div>
                      <input 
                        type="range" min="-400" max="400" value={yOffsetSignatures} 
                        onChange={(e) => setYOffsetSignatures(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Horiz. (X)</label>
                        <span className="text-[10px] font-mono text-blue-600">{xOffsetSignatures > 0 ? "+" : ""}{xOffsetSignatures}</span>
                      </div>
                      <input 
                        type="range" min="-400" max="400" value={xOffsetSignatures} 
                        onChange={(e) => setXOffsetSignatures(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Linhas/Símbolos Auto</span>
                  <button 
                    onClick={() => setShowSystemElements(!showSystemElements)}
                    className={cn(
                      "w-8 h-4 rounded-full transition-colors relative",
                      showSystemElements ? "bg-blue-600" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                      showSystemElements ? "left-4.5" : "left-0.5"
                    )} />
                  </button>
                </div>
              </div>
            </section>

            <section>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Mensagem do Certificado</label>
              <textarea
                value={additionalText}
                onChange={(e) => setAdditionalText(e.target.value)}
                rows={4}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none text-slate-700 leading-relaxed hover:border-slate-300"
              />
            </section>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handlePreview}
              disabled={isPreviewing || isDownloading || isRenderingCanvas}
              className="w-full bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2 group"
            >
              {isPreviewing || isRenderingCanvas ? <Loader2 className="animate-spin" size={14} /> : <Eye size={14} className="group-hover:scale-110 transition-transform" />}
              Visualizar Amostra
            </button>
            <button
              onClick={handleDownloadAll}
              disabled={isDownloading || isPreviewing}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isDownloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={14} />}
              Gerar Lote de PDFs
            </button>
          </div>
        </aside>

        {/* Workspace area */}
        <section className="flex-1 p-8 lg:p-12 flex flex-col overflow-hidden bg-slate-50/50">
          <div className="flex-1 bg-white rounded-[32px] border border-slate-200 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.05)] flex items-center justify-center relative overflow-hidden group">
            {/* Artistic dots pattern */}
            <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

            <AnimatePresence mode="wait">
              {previewPdfBytes ? (
                <motion.div
                  key="preview-active"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="w-full h-full flex flex-col items-center justify-center p-6 lg:p-12 z-10"
                >
                  <div className="relative group/canvas max-w-full max-h-full">
                    <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-lg blur-xl opacity-0 group-hover/canvas:opacity-100 transition-opacity" />
                    <canvas 
                      ref={canvasRef} 
                      className="max-w-full max-h-full rounded shadow-2xl border border-slate-200 bg-white" 
                    />
                  </div>
                  <div className="mt-8 flex items-center gap-8 bg-white/80 backdrop-blur px-6 py-3 rounded-full shadow-sm border border-slate-100 italic text-[11px] text-slate-400 font-medium tracking-wide">
                    <span>PRÉ-VISUALIZAÇÃO A4</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span>200 DPI QUALITY</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span>ESTILO: {template.toUpperCase()}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  className="flex flex-col items-center gap-8 text-center px-6 relative z-10"
                >
                  <div className="w-24 h-24 bg-white border border-slate-100 rounded-[32px] flex items-center justify-center text-slate-200 shadow-sm group-hover:rotate-6 transition-transform duration-500">
                    <FileText size={40} />
                  </div>
                  <div className="max-w-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Painel de Visualização</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Configure os nomes e escolha um estilo. Clique em <span className="font-bold text-slate-700">"Visualizar Amostra"</span> para renderizar o certificado.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-12 flex items-center justify-between px-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isDownloading || isPreviewing || isRenderingCanvas ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />
                Estado: {isDownloading ? "Gerando Lote..." : isPreviewing || isRenderingCanvas ? "Renderizando..." : "Sincronizado"}
              </span>
              <span className="hidden sm:block h-3 w-px bg-slate-200"></span>
              <span className="hidden sm:block text-slate-300">Ponta Grossa - PR // CCM Gregório Szeremeta</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={12} className="opacity-50" />
              <span>{studentCount} Alunos na Fila</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
