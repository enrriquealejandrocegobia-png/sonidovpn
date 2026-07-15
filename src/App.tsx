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
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-blue-500/30">
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <Radio className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Web Audio Streamer</h1>
              <p className="text-xs text-zinc-400 font-medium">Bypass VPN / Proxy</p>
            </div>
          </div>
          {mode !== 'home' && (
            <button
              onClick={() => setMode('home')}
              className="flex items-center space-x-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 px-3 py-2 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 md:p-12">
        {mode === 'home' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12">
            <div className="text-center max-w-lg space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white">
                Tu audio en <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">cualquier red</span>
              </h2>
              <p className="text-zinc-400 text-lg">
                Transmite el sonido de tu PC a tu dispositivo móvil a través de WebSockets. Ideal para conexiones mediante HTTP Custom, PdaNet o Proxies donde el WiFi local no está disponible.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
              <button
                onClick={() => setMode('sender')}
                className="group relative flex flex-col items-center justify-center p-8 bg-zinc-900 hover:bg-zinc-800 rounded-3xl border border-zinc-800 transition-all hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10"
              >
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Radio className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">PC (Transmitir)</h3>
                <p className="text-zinc-500 text-sm text-center">
                  Captura el audio de tu sistema y envíalo a la sala.
                </p>
              </button>

              <button
                onClick={() => setMode('receiver')}
                className="group relative flex flex-col items-center justify-center p-8 bg-zinc-900 hover:bg-zinc-800 rounded-3xl border border-zinc-800 transition-all hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10"
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Headphones className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Celular (Recibir)</h3>
                <p className="text-zinc-500 text-sm text-center">
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
