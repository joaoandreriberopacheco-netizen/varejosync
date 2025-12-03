import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, AlertCircle } from 'lucide-react';

export default function BarcodeScanner({ open, onClose, onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    setError('');
    setScanning(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startScanning();
        };
      }
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      if (err.name === 'NotAllowedError') {
        setError('Permissão negada. Habilite o acesso à câmera nas configurações.');
      } else if (err.name === 'NotFoundError') {
        setError('Nenhuma câmera encontrada no dispositivo.');
      } else {
        setError('Não foi possível acessar a câmera.');
      }
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setScanning(false);
    setLastScannedCode('');
  };

  const startScanning = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    
    const scan = () => {
      if (!video.videoWidth || !video.videoHeight) {
        animationRef.current = requestAnimationFrame(scan);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Tentar detectar código de barras usando BarcodeDetector API (se disponível)
      if ('BarcodeDetector' in window) {
        detectWithBarcodeAPI(canvas);
      }

      animationRef.current = requestAnimationFrame(scan);
    };

    animationRef.current = requestAnimationFrame(scan);
  };

  const detectWithBarcodeAPI = async (canvas) => {
    try {
      const barcodeDetector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'qr_code']
      });

      const barcodes = await barcodeDetector.detect(canvas);
      
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;
        
        // Evitar leitura duplicada do mesmo código
        if (code !== lastScannedCode) {
          setLastScannedCode(code);
          handleCodeDetected(code);
        }
      }
    } catch (err) {
      // BarcodeDetector pode falhar silenciosamente se não houver código
    }
  };

  const handleCodeDetected = (code) => {
    // Vibrar se disponível
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    onScan(code);
    onClose();
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-black">
        <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
          <DialogTitle className="text-white flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Leitor de Código de Barras
          </DialogTitle>
        </DialogHeader>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 text-white hover:bg-white/20"
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="relative w-full aspect-[4/3] bg-gray-900">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
              <AlertCircle className="w-12 h-12 mb-4 text-red-400" />
              <p className="text-sm">{error}</p>
              <Button
                onClick={startCamera}
                variant="outline"
                className="mt-4 border-white/30 text-white hover:bg-white/10"
              >
                Tentar Novamente
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              
              {/* Overlay com área de scan */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-4/5 h-24 border-2 border-white/70 rounded-lg relative">
                  {/* Linha de scan animada */}
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-pulse" />
                  
                  {/* Cantos destacados */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
                </div>
              </div>

              {/* Canvas oculto para processamento */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Indicador de scanning */}
              {scanning && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full text-white text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posicione o código de barras na área
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Dica de compatibilidade */}
        {!('BarcodeDetector' in window) && !error && (
          <div className="p-3 bg-amber-900/50 text-amber-200 text-xs text-center">
            Seu navegador pode ter suporte limitado. Para melhor experiência, use Chrome no Android.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}