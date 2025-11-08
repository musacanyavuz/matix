/**
 * Socket.io Sunucu - Matix Oyunu
 * 
 * Bu dosya, multiplayer matematik yarışması için Socket.io sunucusunu içerir.
 * 
 * Kurulum:
 * 1. npm install socket.io express cors
 * 2. node server.js
 * 
 * Sunucu varsayılan olarak 3001 portunda çalışır.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Oda yönetimi
const rooms = new Map(); // roomId -> { players: [], gameState: {}, currentQuestion: null, ageGroup: null }

// Yaş grubuna göre soru zorluk seviyesi
function getDifficultyConfig(ageGroup) {
  const configs = {
    'age4': {
      operations: ['+'],
      additionRange: { min: 1, max: 5 },
      subtractionRange: { min: 1, max: 5 },
      wrongAnswerRange: { min: -3, max: 3 },
    },
    'age5': {
      operations: ['+', '-'],
      additionRange: { min: 1, max: 10 },
      subtractionRange: { min: 1, max: 10 },
      wrongAnswerRange: { min: -5, max: 5 },
    },
    'age6': {
      operations: ['+', '-'],
      additionRange: { min: 1, max: 15 },
      subtractionRange: { min: 1, max: 15 },
      wrongAnswerRange: { min: -8, max: 8 },
    },
    'grade1': {
      operations: ['+', '-'],
      additionRange: { min: 1, max: 20 },
      subtractionRange: { min: 1, max: 20 },
      wrongAnswerRange: { min: -10, max: 10 },
    },
    'grade2': {
      operations: ['+', '-', '*'],
      additionRange: { min: 1, max: 50 },
      subtractionRange: { min: 1, max: 50 },
      multiplicationRange: { min: 1, max: 10 },
      wrongAnswerRange: { min: -15, max: 15 },
    },
    'grade3': {
      operations: ['+', '-', '*'],
      additionRange: { min: 1, max: 100 },
      subtractionRange: { min: 1, max: 100 },
      multiplicationRange: { min: 1, max: 10 },
      wrongAnswerRange: { min: -20, max: 20 },
    },
    'grade4': {
      operations: ['+', '-', '*', '/'],
      additionRange: { min: 1, max: 100 },
      subtractionRange: { min: 1, max: 100 },
      multiplicationRange: { min: 1, max: 12 },
      divisionRange: { min: 2, max: 12 },
      wrongAnswerRange: { min: -25, max: 25 },
    },
  };
  
  return configs[ageGroup] || configs['grade1'];
}

// Oyun mantığı - yaş grubuna göre soru üret
function generateQuestion(ageGroup = 'grade1') {
  const config = getDifficultyConfig(ageGroup);
  const operations = config.operations;
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let num1, num2, correctAnswer;
  
  switch (operation) {
    case '+':
      num1 = Math.floor(Math.random() * (config.additionRange.max - config.additionRange.min + 1)) + config.additionRange.min;
      num2 = Math.floor(Math.random() * (config.additionRange.max - config.additionRange.min + 1)) + config.additionRange.min;
      correctAnswer = num1 + num2;
      break;
    
    case '-':
      num1 = Math.floor(Math.random() * (config.subtractionRange.max - config.subtractionRange.min + 1)) + config.subtractionRange.min;
      num2 = Math.floor(Math.random() * num1) + 1;
      correctAnswer = num1 - num2;
      break;
    
    case '*':
      num1 = Math.floor(Math.random() * (config.multiplicationRange.max - config.multiplicationRange.min + 1)) + config.multiplicationRange.min;
      num2 = Math.floor(Math.random() * (config.multiplicationRange.max - config.multiplicationRange.min + 1)) + config.multiplicationRange.min;
      correctAnswer = num1 * num2;
      break;
    
    case '/':
      num2 = Math.floor(Math.random() * (config.divisionRange.max - config.divisionRange.min + 1)) + config.divisionRange.min;
      correctAnswer = Math.floor(Math.random() * Math.floor(config.divisionRange.max / 2)) + 1;
      num1 = num2 * correctAnswer;
      break;
    
    default:
      num1 = Math.floor(Math.random() * (config.additionRange.max - config.additionRange.min + 1)) + config.additionRange.min;
      num2 = Math.floor(Math.random() * (config.additionRange.max - config.additionRange.min + 1)) + config.additionRange.min;
      correctAnswer = num1 + num2;
  }
  
  const question = `${num1} ${operation} ${num2} = ?`;
  
  // 5 yanlış cevap oluştur
  const wrongAnswers = new Set();
  while (wrongAnswers.size < 5) {
    const wrong = correctAnswer + Math.floor(Math.random() * (config.wrongAnswerRange.max - config.wrongAnswerRange.min + 1)) + config.wrongAnswerRange.min;
    if (wrong !== correctAnswer && wrong > 0) {
      wrongAnswers.add(wrong);
    }
  }
  
  // 6 seçenek oluştur (1 doğru + 5 yanlış)
  const options = [correctAnswer, ...Array.from(wrongAnswers)];
  
  // Seçenekleri karıştır
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  
  return {
    question,
    correctAnswer,
    options,
  };
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Yeni kullanıcı bağlandı:', socket.id);

  // Kullanıcı kaydı
  let currentUser = null;
  let currentRoomId = null;

  socket.on('register', (data) => {
    currentUser = {
      id: socket.id,
      nickname: data.nickname,
      avatar: data.avatar,
      score: 0,
    };
    console.log('Kullanıcı kaydedildi:', currentUser.nickname);
  });

  // Oda oluştur
  socket.on('createRoom', ({ ageGroup }) => {
    if (!currentUser) {
      socket.emit('error', 'Önce kayıt olmalısınız');
      return;
    }

    if (!ageGroup) {
      socket.emit('error', 'Yaş grubu seçilmedi');
      return;
    }

    const roomId = generateRoomId();
    currentRoomId = roomId;
    
    rooms.set(roomId, {
      players: [currentUser],
      ageGroup: ageGroup,
      gameState: {
        status: 'waiting',
        questionNumber: 0,
        currentQuestion: null,
        answers: {},
      },
    });

    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
    
    // Oyuncu listesini güncelle
    io.to(roomId).emit('playerJoined', {
      players: rooms.get(roomId).players,
    });

    console.log(`Oda oluşturuldu: ${roomId} - ${currentUser.nickname} (${ageGroup})`);
  });

  // Odaya katıl
  socket.on('joinRoom', ({ roomId }) => {
    if (!currentUser) {
      socket.emit('error', 'Önce kayıt olmalısınız');
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Oda bulunamadı');
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('error', 'Oda dolu');
      return;
    }

    currentRoomId = roomId;
    room.players.push(currentUser);
    socket.join(roomId);

    socket.emit('roomJoined', {
      roomId,
      players: room.players,
    });

    // Diğer oyuncuya bildir
    io.to(roomId).emit('playerJoined', {
      players: room.players,
    });

    console.log(`${currentUser.nickname} odaya katıldı: ${roomId}`);

    // İki oyuncu varsa oyunu başlat
    if (room.players.length === 2) {
      setTimeout(() => {
        startGame(roomId);
      }, 2000);
    }
  });

  // Oyunu başlat
  function startGame(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.players.length !== 2) return;

    // Skorları sıfırla
    room.players.forEach(player => {
      player.score = 0;
    });

    room.gameState.status = 'playing';
    room.gameState.questionNumber = 1;
    room.gameState.answers = {};

    io.to(roomId).emit('gameStarted');

    // İlk soruyu gönder
    setTimeout(() => {
      sendQuestion(roomId);
    }, 1000);
  }

  // Soru gönder
  function sendQuestion(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    const question = generateQuestion(room.ageGroup || 'grade1');
    room.gameState.currentQuestion = question;
    room.gameState.answers = {};

    io.to(roomId).emit('newQuestion', question);
  }

  // Cevap gönder
  socket.on('submitAnswer', ({ answer, questionNumber }) => {
    if (!currentRoomId) return;

    const room = rooms.get(currentRoomId);
    if (!room) return;

    // Aynı soru numarası için cevap kontrolü
    if (room.gameState.questionNumber !== questionNumber) {
      return;
    }

    // Zaten cevap verildi mi kontrol et
    if (room.gameState.answers[socket.id]) {
      return;
    }

    const question = room.gameState.currentQuestion;
    const isCorrect = answer === question.correctAnswer;
    const isFirst = Object.keys(room.gameState.answers).length === 0;

    // Cevabı kaydet
    room.gameState.answers[socket.id] = {
      answer,
      correct: isCorrect,
      timestamp: Date.now(),
    };

    // İlk doğru cevap veren skor alır
    if (isCorrect && isFirst) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.score++;
      }
    }

    // Her iki oyuncu da cevap verdi mi?
    if (Object.keys(room.gameState.answers).length === room.players.length) {
      // Sonuçları gönder
      io.to(currentRoomId).emit('answerResult', {
        correct: isCorrect,
        players: room.players,
        nextQuestionNumber: room.gameState.questionNumber + 1,
      });

      // Sonraki soru veya oyun bitişi
      if (room.gameState.questionNumber < 10) {
        room.gameState.questionNumber++;
        setTimeout(() => {
          sendQuestion(currentRoomId);
        }, 3000);
      } else {
        // Oyun bitti
        room.gameState.status = 'finished';
      }
    } else {
      // Sadece bu oyuncuya cevap sonucunu gönder
      socket.emit('answerResult', {
        correct: isCorrect,
        players: room.players,
        nextQuestionNumber: room.gameState.questionNumber,
      });
    }
  });

  // Odadan ayrıl
  socket.on('leaveRoom', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        
        // Oda boşsa sil
        if (room.players.length === 0) {
          rooms.delete(currentRoomId);
        } else {
          // Diğer oyuncuya bildir
          io.to(currentRoomId).emit('playerJoined', {
            players: room.players,
          });
        }
      }
      socket.leave(currentRoomId);
      currentRoomId = null;
    }
  });

  // Bağlantı kesildi
  socket.on('disconnect', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        
        if (room.players.length === 0) {
          rooms.delete(currentRoomId);
        } else {
          io.to(currentRoomId).emit('playerJoined', {
            players: room.players,
          });
        }
      }
    }
    console.log('Kullanıcı ayrıldı:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Matix sunucusu ${PORT} portunda çalışıyor`);
  console.log(`📱 Mobil uygulamanızı bu sunucuya bağlayın: http://localhost:${PORT}`);
});

