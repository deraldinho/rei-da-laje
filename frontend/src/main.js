import { io } from 'socket.io-client';
import { GameApp } from './engine/App.js';

// Conexão WebSocket com o Backend
const socket = io();

// Inicializa a Aplicação do Jogo PixiJS
window.addEventListener('DOMContentLoaded', () => {
  const game = new GameApp(socket);
  window.__PIPA_GAME__ = game; // para debug fácil no console
  console.log('🪁 Jogo de Disputa de Relinho TikTok Live inicializado!');
});
