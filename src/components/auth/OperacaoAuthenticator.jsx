import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertCircle, X, User, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function OperacaoAuthenticator({ isOpen, onClose, onSuccess, operationName = "Nova Operação" }) {
    const [step, setStep] = useState('camera'); // camera, preview, pin, processing
    const [stream, setStream] = useState(null);
    const [photoData, setPhotoData] = useState(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [operationCode, setOperationCode] = useState('');
    const [loading, setLoading] = useState(false);
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Generate operation code on mount
    useEffect(() => {
        if (isOpen) {
            const code = `OP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            setOperationCode(code);
            setStep('camera');
            setPhotoData(null);
            setPin('');
            setError('');
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' }, 
                audio: false 
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Não foi possível acessar a câmera. Verifique as permissões.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const takePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get current user info for overlay
        let userName = "Usuário Desconhecido";
        try {
            const user = await base44.auth.me();
            if (user) userName = user.full_name;
        } catch (e) {
            console.log("User not logged in or error fetching user");
        }

        // Add Overlay Data
        const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
        
        // Gradient background for text
        const gradient = context.createLinearGradient(0, canvas.height - 100, 0, canvas.height);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(1, "rgba(0,0,0,0.8)");
        context.fillStyle = gradient;
        context.fillRect(0, canvas.height - 100, canvas.width, 100);

        // Text settings
        context.font = "bold 16px Inter, sans-serif";
        context.fillStyle = "#ffffff";
        context.textAlign = "left";
        context.shadowColor = "rgba(0,0,0,0.5)";
        context.shadowBlur = 4;

        // Draw text
        const padding = 20;
        context.fillText(`Op: ${operationCode}`, padding, canvas.height - 50);
        context.fillText(`User: ${userName}`, padding, canvas.height - 30);
        context.fillText(`Data: ${timestamp}`, padding, canvas.height - 10);

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoData(dataUrl);
        setStep('pin');
        stopCamera();
    };

    const handlePinSubmit = async () => {
        if (!pin || pin.length < 4) {
            setError("PIN inválido. Digite pelo menos 4 dígitos.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Validate PIN against Interveniente entity
            // Note: In a real prod app, we should use a backend function to verify PIN securely.
            // For this implementation, we fetch active intervenientes and check client-side (or filter).
            const intervenientes = await base44.entities.Interveniente.filter({ 
                pin: pin,
                active: true 
            });

            if (intervenientes.length === 0) {
                throw new Error("PIN incorreto ou interveniente inativo.");
            }

            const interveniente = intervenientes[0];

            // Upload the photo evidence
            // Convert dataURL to Blob
            const res = await fetch(photoData);
            const blob = await res.blob();
            // Create a File object
            const file = new File([blob], `auth_${operationCode}.jpg`, { type: "image/jpeg" });

            // Upload using integration
            const uploadResult = await base44.integrations.Core.UploadFile({ file: file });

            if (!uploadResult || !uploadResult.file_url) {
                throw new Error("Erro ao salvar evidência fotográfica.");
            }

            // Success! Return all data
            onSuccess({
                operationCode,
                intervenienteId: interveniente.id,
                intervenienteName: interveniente.full_name,
                evidenceUrl: uploadResult.file_url,
                timestamp: new Date().toISOString()
            });
            
            onClose();

        } catch (err) {
            console.error("Auth error:", err);
            setError(err.message || "Erro na autenticação. Tente novamente.");
            setPin(''); // Clear PIN on error
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep('camera');
        setPhotoData(null);
        setPin('');
        setError('');
        startCamera();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-none shadow-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-glacial text-gray-800 dark:text-white">
                        <KeyRound className="w-5 h-5 text-indigo-600" />
                        Autenticação de Operação
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                        {operationName} - Código: <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{operationCode}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    {/* Camera View */}
                    {step === 'camera' && (
                        <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden shadow-inner">
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                <Button 
                                    onClick={takePhoto}
                                    className="rounded-full w-14 h-14 bg-white/20 hover:bg-white/40 border-2 border-white backdrop-blur-sm p-0 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                                >
                                    <div className="w-10 h-10 bg-white rounded-full"></div>
                                </Button>
                            </div>
                            {error && (
                                <div className="absolute top-4 left-4 right-4">
                                    <Alert variant="destructive" className="bg-red-500/90 border-none text-white">
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PIN Entry View (shows captured photo bg) */}
                    {step === 'pin' && (
                        <div className="w-full space-y-4">
                            <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden shadow-md group">
                                <img src={photoData} alt="Evidence" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                                    <User className="w-12 h-12 text-white mb-2 opacity-80" />
                                    <h3 className="text-white text-lg font-medium mb-4 text-center">Interveniente Responsável</h3>
                                    
                                    <div className="w-full max-w-[200px]">
                                        <Input
                                            type="password"
                                            placeholder="Digite seu PIN"
                                            value={pin}
                                            onChange={(e) => setPin(e.target.value)}
                                            className="bg-white/90 border-none text-center text-2xl tracking-widest h-12 text-gray-900 placeholder:text-gray-400 placeholder:text-sm placeholder:tracking-normal focus-visible:ring-indigo-500"
                                            maxLength={6}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handlePinSubmit();
                                            }}
                                        />
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={reset}
                                        className="mt-4 text-white/70 hover:text-white hover:bg-white/10"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Tirar nova foto
                                    </Button>
                                </div>
                            </div>
                            {error && (
                                <Alert variant="destructive" className="animate-shake">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={loading} className="text-gray-500">
                        Cancelar
                    </Button>
                    {step === 'pin' && (
                        <Button 
                            onClick={handlePinSubmit} 
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Validando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Confirmar
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>

                {/* Hidden canvas for processing */}
                <canvas ref={canvasRef} className="hidden" />
            </DialogContent>
        </Dialog>
    );
}