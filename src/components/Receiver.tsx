import React, { useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Headphones, Play, Square } from 'lucide-react';

export default function Receiver() {
  const [pin, setPin] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<string>('Ingresa el PIN para conectar');
  
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  
  const handleConnect = () => {
    if (!pin || pin.length !== 6) {
      setStatus('PIN inválido');
      return;
    }
    
    setStatus('Conectando...');
    const socket = io();
    socketRef.current = socket;
    
    socket.emit('join-room', pin);
    
    socket.on('connect', () => {
      setIsConnected(true);
      setStatus('Conectado. Esperando audio...');
      setupAudio();
    });

    socket.on('audio-chunk', (chunk: ArrayBuffer) => {
      setStatus('Recibiendo audio...');
      queueRef.current.push(chunk);
      processQueue();
    });

    socket.on('stop-audio', () => {
      setStatus('Transmisión detenida por el emisor');
    });
  };

  const setupAudio = () => {
    if (!audioRef.current) return;
    
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    audioRef.current.src = URL.createObjectURL(mediaSource);
    
    mediaSource.addEventListener('sourceopen', () => {
      try {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/webm;codecs=opus');
        sourceBufferRef.current = sourceBuffer;
        
        sourceBuffer.addEventListener('updateend', () => {
          processQueue();
        });
        
        // Start playing
        audioRef.current?.play().catch(e => console.log('Autoplay blocked:', e));
      } catch (e) {
        console.error('Error adding source buffer:', e);
        setStatus('Tu navegador no soporta el formato de audio');
      }
    });
  };

  const processQueue = () => {
    const sourceBuffer = sourceBufferRef.current;
    if (!sourceBuffer || sourceBuffer.updating || queueRef.current.length === 0) {
      return;
    }
    
    try {
      const chunk = queueRef.current.shift();
      if (chunk) {
        sourceBuffer.appendBuffer(chunk);
      }
    } catch (e) {
      console.error('Error appending buffer:', e);
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setIsConnected(false);
    setPin('');
    setStatus('Desconectado');
    queueRef.current = [];
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md mx-auto p-8 bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800">
      <div className="text-center">
        <Headphones className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-white">Recibir Audio</h2>
        <p className="text-zinc-400 mt-2 text-sm">
          Ingresa el PIN de 6 dígitos mostrado en el PC.
        </p>
      </div>

      <div className="w-full">
        <input
          type="text"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          disabled={isConnected}
          className="w-full text-center text-4xl font-mono tracking-widest text-white bg-zinc-950 px-8 py-4 rounded-xl border border-zinc-800 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-700"
        />
      </div>

      <div className="text-sm font-medium text-zinc-400">
        Estado: <span className="text-emerald-400">{status}</span>
      </div>

      {/* Hidden audio element for MSE */}
      <audio ref={audioRef} autoPlay />

      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={pin.length !== 6}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white px-6 py-3 rounded-xl transition-all font-medium w-full justify-center"
        >
          <Play className="w-5 h-5" />
          <span>Conectar y Escuchar</span>
        </button>
      ) : (
        <button
          onClick={disconnect}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl transition-all font-medium w-full justify-center"
        >
          <Square className="w-5 h-5" />
          <span>Desconectar</span>
        </button>
      )}
      
      <p className="text-xs text-zinc-500 text-center">
        El audio se reproducirá automáticamente. Si no escuchas nada tras conectar, interactúa con la pantalla (toca cualquier lugar) para permitir la reproducción.
      </p>
    </div>
  );
}
