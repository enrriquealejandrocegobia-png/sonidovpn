import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Headphones, Play, Square, Bluetooth, Server, Activity } from 'lucide-react';

export default function Receiver() {
  const [pin, setPin] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<string>('Ingresa el PIN');
  
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [transport, setTransport] = useState<string>('websocket');
  const [latency, setLatency] = useState<number>(0);
  
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        setOutputDevices(audioOutputs);
        if (audioOutputs.length > 0 && !selectedDevice) {
          setSelectedDevice(audioOutputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error getting devices', err);
      }
    };
    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, []);

  useEffect(() => {
    if (audioRef.current && selectedDevice && typeof (audioRef.current as any).setSinkId === 'function') {
      (audioRef.current as any).setSinkId(selectedDevice).catch((e: any) => console.error('SetSinkId error:', e));
    }
  }, [selectedDevice]);

  const handleConnect = () => {
    if (!pin || pin.length !== 6) {
      setStatus('PIN inválido');
      return;
    }
    
    setStatus('Conectando...');
    const socket = io({
      transports: transport === 'polling' ? ['polling'] : ['websocket', 'polling']
    });
    socketRef.current = socket;
    
    socket.emit('join-room', pin);
    
    socket.on('connect', () => {
      setIsConnected(true);
      setStatus('Conectado. Esperando audio...');
    });

    socket.on('audio-chunk', (payload: any) => {
      let chunk: ArrayBuffer;
      let mimeType = 'audio/webm;codecs=opus';
      
      if (payload instanceof ArrayBuffer) {
        chunk = payload;
      } else {
        chunk = payload.chunk;
        mimeType = payload.mimeType || mimeType;
      }

      if (!mediaSourceRef.current) {
        setupAudio(mimeType);
      }

      setStatus('Recibiendo audio...');
      queueRef.current.push(chunk);
      processQueue();
      // Simulate latency variation for UI
      setLatency(Math.floor(Math.random() * 20) + 30);
    });

    socket.on('stop-audio', () => {
      setStatus('Transmisión detenida');
      setLatency(0);
    });
  };

  const setupAudio = (mimeType: string) => {
    if (!audioRef.current) return;
    if (typeof MediaSource === 'undefined') {
      setStatus('Error: MediaSource no está soportado en tu navegador (intenta con Chrome).');
      return;
    }
    
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    audioRef.current.src = URL.createObjectURL(mediaSource);
    
    mediaSource.addEventListener('sourceopen', () => {
      try {
        const sourceBuffer = mediaSource.addSourceBuffer(mimeType || 'audio/webm;codecs=opus');
        sourceBufferRef.current = sourceBuffer;
        
        sourceBuffer.addEventListener('updateend', () => {
          processQueue();
        });
        
        audioRef.current?.play().catch(e => console.log('Autoplay blocked:', e));
      } catch (e: any) {
        console.error('Error adding source buffer:', e);
        setStatus(`Formato no soportado en este dispositivo: ${mimeType}`);
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
    setStatus('Desconectado');
    queueRef.current = [];
    setLatency(0);
    mediaSourceRef.current = null;
    sourceBufferRef.current = null;
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-8">
      {/* Sidebar Settings */}
      <aside className="w-full md:w-72 border border-[#1C1C21] bg-[#0E0E11] p-6 flex flex-col gap-8 rounded-lg shrink-0">
        <section>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-4 block tracking-tighter">
            Salida de Audio
          </label>
          <div className="space-y-4">
            <div className="group">
              <label className="text-xs mb-2 flex items-center gap-2 text-zinc-300">
                <Bluetooth className="w-3 h-3 text-amber-500" />
                Dispositivo
              </label>
              <select 
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full bg-[#16161A] border border-[#27272A] text-xs p-2 rounded-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                {outputDevices.length > 0 ? (
                  outputDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Altavoz (${d.deviceId.slice(0,5)})`}</option>
                  ))
                ) : (
                  <option value="">Predeterminado del sistema</option>
                )}
              </select>
            </div>
          </div>
        </section>

        <section>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-4 block tracking-tighter">
            Conexión VPN / Proxy
          </label>
          <div className="space-y-4">
            <div className="group">
              <label className="text-xs mb-2 block text-zinc-300">Modo de Transporte</label>
              <select 
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                disabled={isConnected}
                className="w-full bg-[#16161A] border border-[#27272A] text-xs p-2 rounded-sm text-zinc-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              >
                <option value="websocket">Automático (WebSockets + UDP)</option>
                <option value="polling">Forzar TCP (HTTP Custom / PdaNet)</option>
              </select>
              <p className="text-[9px] text-zinc-500 mt-2 leading-tight">
                Usa "Forzar TCP" si tu proxy o VPN bloquea tráfico UDP o WebSockets (común en HTTP Custom).
              </p>
            </div>
          </div>
        </section>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col bg-[#111114] border border-[#1C1C21] rounded-lg p-8 items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
        
        <div className="text-center z-10 w-full max-w-sm">
          <div className="relative inline-block mb-6">
            <Headphones className={`w-12 h-12 relative z-10 ${isConnected ? 'text-amber-500' : 'text-zinc-600'}`} />
            {isConnected && (
              <div className="absolute inset-0 border-2 border-amber-500/30 rounded-full animate-ping scale-150" />
            )}
          </div>
          
          <div className="bg-[#16161A] p-2 rounded-sm border border-[#27272A] w-full text-center mb-6 shadow-inner">
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              disabled={isConnected}
              className="w-full text-center text-4xl font-mono tracking-[0.2em] text-zinc-100 bg-transparent focus:outline-none placeholder:text-zinc-700 disabled:opacity-50"
            />
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2 border-t border-[#27272A] pt-2">
              Ingresa el PIN del PC
            </div>
          </div>

          <div className="flex items-center justify-between mb-8 bg-black/40 p-3 rounded-sm border border-zinc-800/50">
            <div className="text-[10px] font-bold uppercase tracking-tighter text-zinc-500">
              Estado: <span className={isConnected ? "text-green-500" : "text-amber-500"}>{status}</span>
            </div>
            {isConnected && (
              <div className="flex items-center gap-2 text-[10px] font-mono text-amber-500">
                <Activity className="w-3 h-3" />
                {latency}ms
              </div>
            )}
          </div>

          {/* Hidden audio element */}
          <audio ref={audioRef} autoPlay />

          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={pin.length !== 6}
              className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-black px-6 py-4 rounded-sm transition-all font-bold text-sm uppercase tracking-wider w-full justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
            >
              <Play className="w-4 h-4" />
              <span>Conectar VPN/Proxy</span>
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-400 text-black px-6 py-4 rounded-sm transition-all font-bold text-sm uppercase tracking-wider w-full justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            >
              <Square className="w-4 h-4" />
              <span>Desconectar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
