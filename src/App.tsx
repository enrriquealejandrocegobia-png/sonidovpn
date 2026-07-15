/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Sender from './components/Sender';
import Receiver from './components/Receiver';
import { Radio, Headphones, ArrowLeft } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<'home' | 'sender' | 'receiver'>('home');

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-400 font-sans flex flex-col selection:bg-amber-500/30 border-4 border-[#1C1C21]">
      <header className="h-16 border-b border-[#1C1C21] bg-[#111114] flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-sm flex items-center justify-center font-bold text-black">
              <Radio className="w-5 h-5" />
            </div>
            <div className="flex items-baseline">
              <h1 className="text-zinc-100 font-semibold tracking-tight text-lg uppercase">Web Audio Streamer</h1>
              <span className="text-xs text-amber-500 font-mono ml-2 hidden sm:inline-block">v1.0-PRO</span>
            </div>
          </div>
          {mode !== 'home' && (
            <button
              onClick={() => setMode('home')}
              className="flex items-center space-x-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors bg-[#16161A] hover:bg-[#1C1C21] px-3 py-2 rounded-sm border border-[#27272A] uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto p-6 md:p-12 overflow-y-auto flex flex-col">
        {mode === 'home' && (
          <div className="flex flex-col items-center justify-center flex-1 space-y-12">
            <div className="text-center max-w-lg space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-zinc-100">
                Tu audio en <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">cualquier red</span>
              </h2>
              <p className="text-zinc-500 text-sm">
                Transmite el sonido de tu PC a tu dispositivo móvil a través de WebSockets. Ideal para conexiones mediante HTTP Custom, PdaNet o Proxies donde el WiFi local no está disponible.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
              <button
                onClick={() => setMode('sender')}
                className="group relative flex flex-col items-center justify-center p-8 bg-[#111114] hover:bg-[#16161A] rounded-lg border border-[#1C1C21] transition-all hover:border-amber-500/50"
              >
                <div className="w-12 h-12 bg-amber-500/10 rounded-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Radio className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-sm font-medium text-zinc-100 mb-2 uppercase tracking-wider">PC (Transmitir)</h3>
                <p className="text-zinc-500 text-[10px] uppercase tracking-tighter text-center">
                  Captura el audio de tu sistema y envíalo a la sala.
                </p>
              </button>

              <button
                onClick={() => setMode('receiver')}
                className="group relative flex flex-col items-center justify-center p-8 bg-[#111114] hover:bg-[#16161A] rounded-lg border border-[#1C1C21] transition-all hover:border-amber-500/50"
              >
                <div className="w-12 h-12 bg-amber-500/10 rounded-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Headphones className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-sm font-medium text-zinc-100 mb-2 uppercase tracking-wider">Celular (Recibir)</h3>
                <p className="text-zinc-500 text-[10px] uppercase tracking-tighter text-center">
                  Ingresa el PIN y escucha el audio en tu dispositivo.
                </p>
              </button>
            </div>
          </div>
        )}

        {mode === 'sender' && <Sender />}
        {mode === 'receiver' && <Receiver />}
      </main>
    </div>
  );
}
