'use client';

import { useEffect, useRef, useState } from 'react';

interface WhiteboardProps {
  initialData?: string;
  onChange?: (base64: string) => void;
  readOnly?: boolean;
}

export function Whiteboard({ initialData, onChange, readOnly = false }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInitialDrawn, setHasInitialDrawn] = useState(false);
  
  const [mode, setMode] = useState<'pencil' | 'eraser'>('pencil');
  const [eraserSize, setEraserSize] = useState<number>(30);
  
  const [canvasHeight, setCanvasHeight] = useState<number>(600);
  const [history, setHistory] = useState<{ url: string, height: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [cursorInfo, setCursorInfo] = useState<{ x: number; y: number; size: number } | null>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadState = (item: { url: string, height: number }) => {
    setCanvasHeight(item.height);
    
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = item.url;
    }, 50);
  };

  const saveStateToHistory = (canvas: HTMLCanvasElement, currentHeight: number = canvas.height) => {
    const dataUrl = canvas.toDataURL('image/webp', 0.8);
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ url: dataUrl, height: currentHeight });
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
    if (onChange) onChange(dataUrl);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!hasInitialDrawn) {
      if (initialData && initialData.startsWith('data:image')) {
        const img = new Image();
        img.onload = () => {
          const h = (1200 / img.width) * img.height;
          setCanvasHeight(h);
          
          setTimeout(() => {
            const c = canvasRef.current;
            if (c) {
               const context = c.getContext('2d');
               if(context) {
                   context.fillStyle = '#ffffff';
                   context.fillRect(0, 0, c.width, c.height);
                   context.drawImage(img, 0, 0, c.width, c.height);
                   const dataUrl = c.toDataURL('image/webp', 0.8);
                   setHistory([{ url: dataUrl, height: h }]);
                   setHistoryIndex(0);
               }
            }
          }, 50);
        };
        img.src = initialData;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        setHistory([{ url: dataUrl, height: 600 }]);
        setHistoryIndex(0);
      }
      setHasInitialDrawn(true);
    }
  }, [initialData, hasInitialDrawn]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      offsetX: (clientX - rect.left) * scaleX,
      offsetY: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.lineTo(offsetX, offsetY);
    
    if (mode === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = eraserSize;
    } else {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
    }
    
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode === 'eraser' && !readOnly) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / canvas.width;
        
        let clientX, clientY;
        if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
        }
        
        setCursorInfo({
          x: clientX - rect.left,
          y: clientY - rect.top,
          size: eraserSize * scaleX
        });
      }
    } else if (cursorInfo) {
      setCursorInfo(null);
    }
    draw(e);
  };

  const handleMouseLeave = () => {
    setCursorInfo(null);
    stopDrawing();
  };

  const stopDrawing = () => {
    if (readOnly || !isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      saveStateToHistory(canvas, canvasHeight);
    }
  };

  const clearCanvas = () => {
    if (readOnly) return;
    setCanvasHeight(600);
    
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveStateToHistory(canvas, 600);
      }
    }, 50);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      loadState(history[newIndex]);
      if (onChange) onChange(history[newIndex].url);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      loadState(history[newIndex]);
      if (onChange) onChange(history[newIndex].url);
    }
  };

  const processImageUpload = (img: HTMLImageElement) => {
    const newHeight = (1200 / img.width) * img.height;
    setCanvasHeight(newHeight);
    
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 1200, newHeight);
        saveStateToHistory(canvas, newHeight);
      }
    }, 50);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => processImageUpload(img);
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      alert('Não foi possível acessar a câmera do dispositivo. Verifique as permissões.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = video.videoWidth;
    tmpCanvas.height = video.videoHeight;
    const tmpCtx = tmpCanvas.getContext('2d');
    if (!tmpCtx) return;
    tmpCtx.drawImage(video, 0, 0);
    const dataUrl = tmpCanvas.toDataURL('image/png');

    stopCamera();

    const img = new Image();
    img.onload = () => processImageUpload(img);
    img.src = dataUrl;
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between bg-white/5 p-2 rounded-2xl border border-white/10 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('pencil')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${mode === 'pencil' ? 'bg-primary text-black' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
              title="Lápis"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('eraser')}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${mode === 'eraser' ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                title="Borracha"
              >
                <span className="material-symbols-outlined text-lg">ink_eraser</span>
              </button>
              {mode === 'eraser' && (
                <div className="px-2 flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase hidden sm:inline">Tamanho:</span>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={eraserSize} 
                    onChange={(e) => {
                      setEraserSize(Number(e.target.value));
                      if (cursorInfo && canvasRef.current) {
                        const scaleX = canvasRef.current.getBoundingClientRect().width / canvasRef.current.width;
                        setCursorInfo(prev => prev ? { ...prev, size: Number(e.target.value) * scaleX } : null);
                      }
                    }}
                    className="w-16 sm:w-20 accent-primary" 
                  />
                </div>
              )}
            </div>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-primary/20 hover:text-primary text-gray-300 transition-all"
              title="Carregar Imagem da Galeria"
            >
              <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
            </button>
            <button
              type="button"
              onClick={startCamera}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-primary/20 hover:text-primary text-gray-300 transition-all"
              title="Tirar Foto"
            >
              <span className="material-symbols-outlined text-lg">photo_camera</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload} 
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-30 text-gray-300 transition-all"
              title="Desfazer"
            >
              <span className="material-symbols-outlined text-lg">undo</span>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-30 text-gray-300 transition-all"
              title="Refazer"
            >
              <span className="material-symbols-outlined text-lg">redo</span>
            </button>
            <div className="hidden sm:block w-px h-6 bg-white/10 mx-1"></div>
            <button 
              type="button" 
              onClick={clearCanvas}
              className="px-4 py-2 text-xs font-bold bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-xl transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              LIMPAR
            </button>
          </div>
        </div>
      )}

      <div ref={containerRef} className="relative border border-outline rounded-[1.5rem] overflow-hidden bg-white touch-none">
        {cursorInfo && mode === 'eraser' && !readOnly && (
          <div 
            className="absolute rounded-full border border-black/30 pointer-events-none z-10 bg-black/5"
            style={{
              width: cursorInfo.size,
              height: cursorInfo.size,
              left: cursorInfo.x - cursorInfo.size / 2,
              top: cursorInfo.y - cursorInfo.size / 2,
            }}
          />
        )}
        <canvas
          ref={canvasRef}
          width={1200}
          height={canvasHeight}
          className={`w-full h-auto ${readOnly ? 'cursor-default' : mode === 'eraser' ? 'cursor-none' : 'cursor-crosshair'}`}
          onMouseDown={startDrawing}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={handleMouseLeave}
          onTouchStart={startDrawing}
          onTouchMove={handleMouseMove}
          onTouchEnd={stopDrawing}
        />
      </div>

      {isCameraOpen && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-contain"
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-8">
            <button 
              type="button" 
              onClick={takePhoto} 
              className="w-20 h-20 rounded-full bg-white text-black border-4 border-gray-400 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.5)] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-4xl">photo_camera</span>
            </button>
            <button 
              type="button" 
              onClick={stopCamera} 
              className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md hover:bg-white/30 transition-all"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
