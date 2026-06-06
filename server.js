import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configuration de Socket.io avec CORS pour le développement
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:4173"],
    methods: ["GET", "POST"]
  }
});

// Servir les fichiers de production compilés (React/Vite build)
app.use(express.static(path.join(__dirname, 'dist')));

// Structure des salons : roomId (string) -> { roomCode, p1: { id, name, character, isReady }, p2: { id, name, character, isReady } }
const rooms = new Map();

// Helper pour générer un code à 4 chiffres unique
function generateRoomCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

io.on('connection', (socket) => {
  console.log(`[Réseau] Utilisateur connecté : ${socket.id}`);

  // 1. CRÉATION D'UN SALON
  socket.on('create_room', (data) => {
    const { playerName } = data;
    const roomCode = generateRoomCode();

    rooms.set(roomCode, {
      roomCode,
      p1: {
        id: socket.id,
        name: playerName || 'Hôte',
        character: null,
        isReady: false
      },
      p2: null
    });

    socket.join(`room_${roomCode}`);
    socket.roomCode = roomCode;

    console.log(`[Salons] Salon ${roomCode} créé par ${playerName} (${socket.id})`);
    socket.emit('room_created', {
      roomCode,
      playerName: playerName || 'Hôte'
    });
  });

  // 2. REJOINDRE UN SALON EXISTANT
  socket.on('join_room', (data) => {
    const { roomCode, playerName } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('join_error', { message: 'Salon introuvable.' });
      return;
    }

    if (room.p2) {
      socket.emit('join_error', { message: 'Salon déjà complet.' });
      return;
    }

    // Enregistrer le second joueur
    room.p2 = {
      id: socket.id,
      name: playerName || 'Invité',
      character: null,
      isReady: false
    };

    socket.join(`room_${roomCode}`);
    socket.roomCode = roomCode;

    console.log(`[Salons] ${playerName} (${socket.id}) a rejoint le salon ${roomCode}`);
    
    // Notifier les deux joueurs que le salon est prêt
    io.to(`room_${roomCode}`).emit('room_ready', {
      roomCode,
      p1Name: room.p1.name,
      p2Name: room.p2.name
    });
  });

  // 3. SÉLECTION DU PERSONNAGE & ÉTAT PRÊT
  socket.on('character_select', (data) => {
    const { roomCode, character, isReady } = data;
    const room = rooms.get(roomCode);
    if (!room) return;

    let isP1 = socket.id === room.p1.id;
    if (isP1) {
      room.p1.character = character;
      room.p1.isReady = isReady;
    } else if (room.p2 && socket.id === room.p2.id) {
      room.p2.character = character;
      room.p2.isReady = isReady;
    }

    // Transmettre la mise à jour à l'autre joueur
    socket.to(`room_${roomCode}`).emit('opponent_character_update', {
      character,
      isReady
    });

    // Si les deux joueurs sont prêts, on lance le match !
    if (room.p1.isReady && room.p2 && room.p2.isReady) {
      console.log(`[Match] Démarrage du match dans le salon ${roomCode}`);
      io.to(`room_${roomCode}`).emit('start_match', {
        p1Char: room.p1.character,
        p2Char: room.p2.character,
        p1Id: room.p1.id,
        p2Id: room.p2.id
      });
    }
  });

  // 4. TRANSMISSION DES ÉVÉNEMENTS DU COMBAT (Mouvements, coups, etc.)
  socket.on('sync_fighter', (data) => {
    const { roomCode, fighterData } = data;
    socket.to(`room_${roomCode}`).emit('opponent_fighter_sync', fighterData);
  });

  socket.on('player_hit', (data) => {
    const { roomCode, damage, angle, isHeavy, kbForce } = data;
    socket.to(`room_${roomCode}`).emit('opponent_hit', { damage, angle, isHeavy, kbForce });
  });

  socket.on('spawn_item', (data) => {
    const { roomCode, itemData } = data;
    socket.to(`room_${roomCode}`).emit('item_spawned', itemData);
  });

  socket.on('item_picked', (data) => {
    const { roomCode, itemIndex, pickerRole, itemType } = data;
    socket.to(`room_${roomCode}`).emit('opponent_item_picked', { itemIndex, pickerRole, itemType });
  });

  socket.on('time_sync', (data) => {
    const { roomCode, gameTime } = data;
    socket.to(`room_${roomCode}`).emit('game_time_sync', { gameTime });
  });

  socket.on('game_over', (data) => {
    const { roomCode, winnerRole } = data;
    socket.to(`room_${roomCode}`).emit('match_over', { winnerRole });
  });

  // Quitter explicitement le salon
  socket.on('leave_room', () => {
    handleLeaveRoom(socket);
  });

  // Déconnexion accidentelle ou fermeture de page
  socket.on('disconnect', () => {
    console.log(`[Réseau] Utilisateur déconnecté : ${socket.id}`);
    handleLeaveRoom(socket);
  });
});

// Gérer la sortie d'un joueur
function handleLeaveRoom(socket) {
  const roomCode = socket.roomCode;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (room) {
    console.log(`[Salons] Fermeture/Mise à jour du salon ${roomCode} suite au départ de ${socket.id}`);
    
    // Notifier le joueur restant
    socket.to(`room_${roomCode}`).emit('opponent_left', {
      message: 'Votre adversaire a quitté la partie.'
    });

    // Supprimer le salon de la mémoire
    rooms.delete(roomCode);
  }

  socket.leave(`room_${roomCode}`);
  delete socket.roomCode;
}

// Rediriger toutes les autres requêtes GET vers le frontend (Single Page Application fallback)
app.get('*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[Serveur] Serveur de combat en ligne actif sur le port ${PORT}`);
});
