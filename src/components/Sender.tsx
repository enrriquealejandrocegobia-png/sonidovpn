import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mic, Square, Radio, Settings2, MonitorUp } from 'lucide-react';

export default function Sender() {
  const [pin, setPin] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>('Esperando...');
  
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('screen');
  const [bitrate, setBitrate] = useState<number>(128000); // Kept for UI consistency, not used for PCM
  
  const socketRef = useRef<Socket | null>(null);
  const mediaContextRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(generatedPin);
    
    const socket = io();
    socketRef.current = socket;
    
    socket.on('peer-joined', () => {
      setStatus('Dispositivo receptor conectado');
    });

    const getDevices = async () => {
      try {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          console.warn("Could not get initial audio permission, labels might be hidden", e);
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setInputDevices(audioInputs);
      } catch (err) {
        console.error('Error getting devices', err);
      }
    };
    getDevices();

    return () => {
      socket.disconnect();
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      let stream: MediaStream;
      if (selectedDevice === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: selectedDevice } }
        });
      }
      
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        setStatus('Error: No se seleccionó audio.');
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      const audioStream = new MediaStream([audioTracks[0]]);
      streamRef.current = audioStream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(audioStream);
      
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // Mute locally

      source.connect(processor);
      processor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      isRecordingRef.current = true;

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Data[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
        }
        if (socketRef.current && pin) {
          socketRef.current.emit('audio-chunk', { 
            pin, 
            chunk: int16Data.buffer, 
            sampleRate: audioContext.sampleRate, 
            type: 'pcm' 
          });
        }
      };

      audioTracks[0].onended = () => {
        stopRecording();
      };

      mediaContextRef.current = {
        stop: () => {
          processor.disconnect();
          source.disconnect();
          gainNode.disconnect();
          audioContext.close();
        }
      };

      setIsRecording(true);
      setStatus('Transmitiendo audio (PCM)...');

    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || (err.message && err.message.includes('Permission denied'))) {
        setStatus('Error: Permiso denegado. Debes permitir el acceso a la pantalla o micrófono.');
      } else if (err.message && err.message.includes('display-capture')) {
        setStatus('Error: Permiso denegado. Para compartir pantalla, abre la app en una nueva pestaña (Open in New Tab).');
      } else {
        setStatus(`Error al capturar audio: ${err.message || 'Desconocido'}`);
      }
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (mediaContextRef.current) {
      try { mediaContextRef.current.stop(); } catch (e) {}
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
    <div className="w-full flex flex-col md:flex-row gap-8">
      {/* Sidebar Settings */}
      <aside className="w-full md:w-72 border border-[#1C1C21] bg-[#0E0E11] p-6 flex flex-col gap-8 rounded-lg shrink-0">
        <section>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-4 block tracking-tighter">
            Configuración de Audio
          </label>
          <div className="space-y-4">
            <div className="group">
              <label className="text-xs mb-2 block text-zinc-300">Dispositivo de Entrada</label>
              <select 
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                disabled={isRecording}
                className="w-full bg-[#16161A] border border-[#27272A] text-xs p-2 rounded-sm text-zinc-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              >
                <option value="screen">Mezcla Estéreo (Capturar Pantalla)</option>
                {inputDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Micrófono (${d.deviceId.slice(0,5)})`}</option>
                ))}
              </select>
            </div>
            
            <div className="group">
              <label className="text-xs mb-2 block text-zinc-300">Calidad (Bitrate)</label>
              <input 
                type="range" 
                min="32000" max="320000" step="32000"
                value={bitrate}
                onChange={(e) => setBitrate(Number(e.target.value))}
                disabled={isRecording}
                className="w-full accent-amber-500 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] mt-1">
                <span className="text-zinc-500">Baja</span>
                <span className="text-amber-500 font-mono">{bitrate / 1000} kbps</span>
                <span className="text-zinc-500">Alta</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-4 block tracking-tighter">
            Estado de Red Local
          </label>
          <div className="bg-[#111114] p-3 border border-[#27272A] rounded-sm">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-zinc-400">WebSocket</span>
              <span className="text-green-500 font-mono">Conectado</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Latencia Est.</span>
              <span className="text-amber-500 font-mono">~40ms</span>
            </div>
          </div>
        </section>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col bg-[#111114] border border-[#1C1C21] rounded-lg p-8 items-center justify-center relative overflow-hidden">
        {/* Background decorative gradient */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
        
        <div className="text-center z-10 w-full max-w-sm">
          <Radio className={`w-12 h-12 mx-auto mb-6 ${isRecording ? 'text-amber-500 animate-pulse' : 'text-zinc-600'}`} />
          
          <div className="bg-[#16161A] px-8 py-4 rounded-sm border border-[#27272A] w-full text-center mb-6 shadow-inner">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">ID de Sesión (PIN)</div>
            <span className="text-5xl font-mono tracking-[0.2em] text-zinc-100">{pin || '------'}</span>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-tighter text-zinc-500 mb-8 bg-black/40 py-2 px-4 rounded-sm border border-zinc-800/50 inline-block">
            Estado: <span className={isRecording ? "text-green-500" : "text-amber-500"}>{status}</span>
          </div>

          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-black px-6 py-4 rounded-sm transition-all font-bold text-sm uppercase tracking-wider w-full justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
            >
              <Mic className="w-4 h-4" />
              <span>Iniciar Transmisión</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-400 text-black px-6 py-4 rounded-sm transition-all font-bold text-sm uppercase tracking-wider w-full justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            >
              <Square className="w-4 h-4" />
              <span>Detener Transmisión</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
