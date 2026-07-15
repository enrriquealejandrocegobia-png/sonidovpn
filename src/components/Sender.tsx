import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mic, Square, Radio } from 'lucide-react';

export default function Sender() {
  const [pin, setPin] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>('Esperando...');
  
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Generate a random 6-digit PIN
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(generatedPin);
    
    // Connect to server
    const socket = io();
    socketRef.current = socket;
    
    socket.emit('join-room', generatedPin);
    
    socket.on('peer-joined', () => {
      setStatus('Dispositivo receptor conectado');
    });

    return () => {
      socket.disconnect();
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      // Capture system audio. Display media is required to capture system audio on desktop.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        setStatus('Error: No se seleccionó audio al compartir la pantalla.');
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      // Create a stream with only the audio track to avoid sending video
      const audioStream = new MediaStream([audioTracks[0]]);
      streamRef.current = audioStream;

      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && socketRef.current && pin) {
          socketRef.current.emit('audio-chunk', { pin, chunk: e.data });
        }
      };

      // Handle user stopping the stream via browser UI
      audioTracks[0].onended = () => {
        stopRecording();
      };

      mediaRecorder.start(100); // 100ms chunks for low latency
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setStatus('Transmitiendo audio...');

    } catch (err) {
      console.error(err);
      setStatus('Error al capturar audio. Asegúrate de compartir pestaña/pantalla con audio.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (socketRef.current && pin) {
      socketRef.current.emit('stop-audio', pin);
    }
    setIsRecording(false);
    setStatus('Transmisión detenida');
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md mx-auto p-8 bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800">
      <div className="text-center">
        <Radio className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-white">Transmitir Audio</h2>
        <p className="text-zinc-400 mt-2 text-sm">
          Comparte este PIN con tu dispositivo móvil para recibir el audio.
        </p>
      </div>

      <div className="bg-zinc-950 px-8 py-4 rounded-xl border border-zinc-800">
        <span className="text-4xl font-mono tracking-widest text-white">{pin || '------'}</span>
      </div>

      <div className="text-sm font-medium text-zinc-400">
        Estado: <span className="text-blue-400">{status}</span>
      </div>

      {!isRecording ? (
        <button
          onClick={startRecording}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl transition-all font-medium w-full justify-center"
        >
          <Mic className="w-5 h-5" />
          <span>Iniciar Transmisión</span>
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl transition-all font-medium w-full justify-center"
        >
          <Square className="w-5 h-5" />
          <span>Detener Transmisión</span>
        </button>
      )}
      
      <p className="text-xs text-zinc-500 text-center">
        Nota: Al iniciar, selecciona "Pestaña de Chrome" o "Toda la pantalla" y asegúrate de marcar la casilla <strong>"Compartir audio"</strong>.
      </p>
    </div>
  );
}
