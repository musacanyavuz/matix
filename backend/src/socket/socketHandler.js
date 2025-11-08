/**
 * Socket.io Handler
 * Gerçek zamanlı oyun iletişimini yönetir
 */

const roomService = require('../services/roomService');
const userService = require('../services/userService');
const authService = require('../services/authService');
const botService = require('../services/botService');
const { generateQuestion } = require('../utils/gameLogic');

// Aktif oyun durumları (memory'de tutulur)
const activeGames = new Map(); // roomCode -> { questionNumber, currentQuestion, answers, participants }
// Bot timer'ları (oda oluşturulduğunda 15 saniye sonra bot eklemek için)
const botTimers = new Map(); // roomCode -> timer
// Soru timeout timer'ları (her soru için 15 saniye)
const questionTimers = new Map(); // roomCode -> timer

/**
 * Socket.io event handler'larını yapılandır
 */
function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Kullanıcı bağlandı: ${socket.id}`);

    let currentRoomCode = null;
    let currentUserId = null;
    let isAuthenticated = false;

    /**
     * Kullanıcı kaydı (token ile veya misafir olarak)
     */
    socket.on('register', async (data) => {
      try {
        const { nickname, avatar, ageGroup, token } = data;

        // Token varsa doğrula
        if (token) {
          try {
            const { userId } = authService.verifyToken(token);
            const user = await userService.getUserById(userId);
            
            if (!user) {
              throw new Error('Kullanıcı bulunamadı');
            }

            currentUserId = user.id;
            socket.userId = user.id;
            socket.nickname = user.nickname;
            isAuthenticated = true;

            // Client'a userId'yi gönder
            socket.emit('registered', { userId: user.id });

            console.log(`Kayıtlı kullanıcı bağlandı: ${user.nickname} (${user.id})`);
            return;
          } catch (error) {
            console.error('Token doğrulama hatası:', error);
            // Token geçersizse misafir olarak devam et
          }
        }

        // Token yoksa veya geçersizse misafir kullanıcı olarak kaydet
        let user = await userService.getUserByNickname(nickname);
        if (!user) {
          // Misafir kullanıcı oluştur (isGuest = true)
          user = await userService.createUser(nickname, avatar, true);
        }

        currentUserId = user.id;
        socket.userId = user.id;
        socket.nickname = user.nickname;
        isAuthenticated = false;

        // Client'a userId'yi gönder
        socket.emit('registered', { userId: user.id });

        console.log(`Misafir kullanıcı kaydedildi: ${user.nickname} (${user.id})`);
      } catch (error) {
        console.error('Register hatası:', error);
        socket.emit('error', { message: 'Kayıt başarısız' });
      }
    });

    /**
     * Odaya bağlan
     */
    socket.on('joinRoom', async (data) => {
      try {
        const { roomCode, userId } = data;

        if (!roomCode || !userId) {
          socket.emit('error', { message: 'Oda kodu ve kullanıcı ID gereklidir' });
          return;
        }

        // Odaya katıl
        const room = await roomService.joinRoom(roomCode, userId);
        currentRoomCode = roomCode;
        currentUserId = userId;

        // Socket room'a katıl
        socket.join(roomCode);

        // Oyun durumunu kontrol et
        const gameState = activeGames.get(roomCode);
        const isGameActive = gameState !== undefined;
        
        // Katılan oyuncuya roomJoined gönder
        socket.emit('roomJoined', {
          roomCode: room.code,
          players: room.participants.map((p) => ({
            id: p.user.id,
            nickname: p.user.nickname,
            avatar: p.user.avatar,
            score: p.score,
          })),
        });
        
        // Eğer oyun zaten başlamışsa, yeni katılan oyuncuya mevcut oyun durumunu gönder
        if (isGameActive && gameState) {
          console.log(`🎮 Yeni oyuncu katıldı, oyun devam ediyor - mevcut durum gönderiliyor: ${roomCode}`);
          
          // Yeni oyuncuyu participants listesine ekle (eğer yoksa)
          const newParticipant = room.participants.find(p => 
            !gameState.participants.some(gp => gp.userId === p.userId)
          );
          if (newParticipant) {
            gameState.participants.push({
              userId: newParticipant.userId,
              score: 0,
              isBot: newParticipant.user.nickname.includes('Bot'),
            });
            console.log(`Yeni oyuncu oyuna eklendi: ${newParticipant.userId} (Toplam: ${gameState.participants.length})`);
          }
          
          // Oyun durumunu gönder (oyun zaten devam ediyor, geri sayım yok)
          socket.emit('gameStarted', { isMidGame: true });
          
          // Eğer mevcut bir soru varsa, onu da gönder
          if (gameState.currentQuestion) {
            setTimeout(() => {
              const question = gameState.currentQuestion;
              socket.emit('newQuestion', {
                question: question.question,
                options: question.options.map(opt => opt.toString()),
                correctAnswer: question.correctAnswer.toString(),
                questionNumber: gameState.questionNumber,
              });
              
              // Mevcut oyuncu skorlarını gönder
              const currentPlayers = room.participants.map((p) => {
                const participant = gameState.participants.find(gp => gp.userId === p.userId);
                return {
                  id: p.user.id,
                  nickname: p.user.nickname,
                  avatar: p.user.avatar,
                  score: participant ? participant.score : p.score,
                };
              });
              
              socket.emit('playerJoined', {
                players: currentPlayers,
              });
            }, 500);
          } else {
            // Soru yoksa sadece oyuncu listesini gönder
            const currentPlayers = room.participants.map((p) => {
              const participant = gameState.participants.find(gp => gp.userId === p.userId);
              return {
                id: p.user.id,
                nickname: p.user.nickname,
                avatar: p.user.avatar,
                score: participant ? participant.score : p.score,
              };
            });
            
            socket.emit('playerJoined', {
              players: currentPlayers,
            });
          }
        }

        // Diğer oyunculara bildir
        socket.to(roomCode).emit('playerJoined', {
          players: room.participants.map((p) => ({
            id: p.user.id,
            nickname: p.user.nickname,
            avatar: p.user.avatar,
            score: p.score,
          })),
        });

        console.log(`${userId} odaya katıldı: ${roomCode}`);

        // Eğer gerçek oyuncu katıldıysa bot timer'ını iptal et
        if (botTimers.has(roomCode)) {
          clearTimeout(botTimers.get(roomCode));
          botTimers.delete(roomCode);
          console.log(`Bot timer iptal edildi: ${roomCode} (gerçek oyuncu katıldı)`);
        }

        // En az 2 oyuncu varsa (bot dahil) otomatik oyunu başlat
        if (room.participants.length >= 2) {
          // Oyun zaten başlamış mı kontrol et
          if (!activeGames.has(roomCode)) {
            console.log(`${room.participants.length} oyuncu hazır, oyun başlatılıyor: ${roomCode}`);
            setTimeout(async () => {
              try {
                // Oyun durumunu başlat
                activeGames.set(roomCode, {
                  questionNumber: 1,
                  currentQuestion: null,
                  answers: {},
                  participants: room.participants.map((p) => ({
                    userId: p.userId,
                    score: 0,
                    isBot: false,
                  })),
                  ageGroup: room.ageGroup || 'grade1',
                  difficultyLevel: room.difficultyLevel || 0,
                });

                // Skorları sıfırla
                for (const participant of room.participants) {
                  await roomService.updateParticipantScore(room.id, participant.userId, -participant.score);
                }

                // Oyun başladı bildir
                io.to(roomCode).emit('gameStarted');

                // İlk soruyu gönder
                setTimeout(() => {
                  sendQuestion(io, roomCode);
                }, 1000);
              } catch (error) {
                console.error('Oyun başlatma hatası:', error);
                io.to(roomCode).emit('error', { message: 'Oyun başlatılamadı' });
              }
            }, 2000);
          } else {
            // Oyun zaten başlamış, sadece yeni oyuncuyu ekle
            const gameState = activeGames.get(roomCode);
            if (gameState) {
              // Yeni oyuncuyu participants listesine ekle (eğer yoksa)
              const newParticipant = room.participants.find(p => 
                !gameState.participants.some(gp => gp.userId === p.userId)
              );
              if (newParticipant) {
                gameState.participants.push({
                  userId: newParticipant.userId,
                  score: 0,
                  isBot: false,
                });
                console.log(`Yeni oyuncu eklendi: ${newParticipant.userId} (Toplam: ${gameState.participants.length})`);
              }
            }
          }
        } else if (room.participants.length === 1 && !botTimers.has(roomCode)) {
          // Tek oyuncu varsa ve timer yoksa 15 saniye sonra bot ekle
          console.log(`Tek oyuncu var, 15 saniye sonra bot eklenecek: ${roomCode}`);
          const timer = setTimeout(async () => {
            try {
              // Oda hala tek oyuncu mu kontrol et
              const currentRoom = await roomService.getRoomByCode(roomCode);
              if (currentRoom && currentRoom.participants.length === 1) {
                // Bot oluştur ve ekle
                const bot = botService.createBot();
                console.log(`🤖 Bot eklendi: ${bot.nickname} (${bot.difficulty}) - Oda: ${roomCode}`);
                await botService.addBotToRoom(io, roomCode, bot, activeGames);
              }
              botTimers.delete(roomCode);
            } catch (error) {
              console.error('Bot ekleme hatası:', error);
              botTimers.delete(roomCode);
            }
          }, 15000); // 15 saniye

          botTimers.set(roomCode, timer);
        }
      } catch (error) {
        console.error('JoinRoom hatası:', error);
        socket.emit('error', { message: error.message || 'Odaya katılamadı' });
      }
    });

    /**
     * Oyunu başlat
     */
    socket.on('startGame', async (data) => {
      try {
        const { roomCode } = data;

        if (!roomCode) {
          socket.emit('error', { message: 'Oda kodu gereklidir' });
          return;
        }

        const room = await roomService.getRoomByCode(roomCode);
        if (!room) {
          socket.emit('error', { message: 'Oda bulunamadı' });
          return;
        }

        // Oyun durumunu başlat
        activeGames.set(roomCode, {
          questionNumber: 1,
          currentQuestion: null,
          answers: {},
          participants: room.participants.map((p) => ({
            userId: p.userId,
            score: 0,
            isBot: p.user.nickname.includes('Bot'), // Bot kontrolü
          })),
          ageGroup: room.ageGroup || 'grade1',
          difficultyLevel: room.difficultyLevel || 0,
        });
        
        // Bot varsa bot bilgilerini ekle
        const botParticipant = room.participants.find((p) => p.user.nickname.includes('Bot'));
        if (botParticipant) {
          const botDifficulty = ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)];
          activeGames.get(roomCode).botDifficulty = botDifficulty;
          activeGames.get(roomCode).botUserId = botParticipant.userId;
        }

        // Skorları sıfırla
        for (const participant of room.participants) {
          await roomService.updateParticipantScore(room.id, participant.userId, -participant.score);
        }

        // Oyun başladı bildir
        io.to(roomCode).emit('gameStarted');

        // İlk soruyu gönder (bot desteği sendQuestion içinde)
        setTimeout(() => {
          sendQuestion(io, roomCode);
        }, 1000);
      } catch (error) {
        console.error('StartGame hatası:', error);
        socket.emit('error', { message: error.message || 'Oyun başlatılamadı' });
      }
    });

    /**
     * Soru gönder
     */
    async function sendQuestion(io, roomCode) {
      const gameState = activeGames.get(roomCode);
      if (!gameState) return;

      // Export için kaydet (botService'den çağrılabilmesi için)
      exportedSendQuestion = sendQuestion;

      // Önceki soru timer'ını temizle
      if (questionTimers.has(roomCode)) {
        clearTimeout(questionTimers.get(roomCode));
        questionTimers.delete(roomCode);
      }

      const difficultyLevel = gameState.difficultyLevel || 0;
      const question = generateQuestion(gameState.ageGroup, difficultyLevel);
      gameState.currentQuestion = question;
      gameState.answers = {};

      // Veritabanına kaydet
      const room = await roomService.getRoomByCode(roomCode);
      await roomService.createGameSession(room.id, question.question, question.correctAnswer);

      // Soruyu gönder (correctAnswer'ı da gönder)
      console.log(`Soru gönderiliyor (${gameState.questionNumber}): ${question.question}`);
      io.to(roomCode).emit('newQuestion', {
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        questionNumber: gameState.questionNumber,
      });

      // Bot varsa bot'un cevap vermesini başlat
      const botParticipant = gameState.participants.find(p => p.isBot);
      if (botParticipant) {
        const botDifficulty = gameState.botDifficulty || 'medium';
        // Biraz gecikme ile bot cevabını başlat (daha doğal görünsün)
        setTimeout(() => {
          botService.startBotAnswer(io, roomCode, botParticipant.userId, botDifficulty, activeGames);
        }, 500);
      }

      // 15 saniyelik timeout timer'ı başlat
      const timeoutTimer = setTimeout(async () => {
        console.log(`⏰ Soru timeout (15 saniye): ${roomCode}`);
        await handleQuestionTimeout(io, roomCode);
      }, 15000); // 15 saniye

      questionTimers.set(roomCode, timeoutTimer);
    }

    /**
     * Soru timeout handler - 15 saniye sonra cevap vermeyen oyuncular için otomatik yanlış cevap
     */
    async function handleQuestionTimeout(io, roomCode) {
      const gameState = activeGames.get(roomCode);
      if (!gameState || !gameState.currentQuestion) {
        questionTimers.delete(roomCode);
        return;
      }

      const correctAnswer = gameState.currentQuestion.correctAnswer;
      const participants = gameState.participants;

      // Cevap vermeyen oyuncular için otomatik yanlış cevap kaydet
      for (const participant of participants) {
        if (!gameState.answers[participant.userId]) {
          console.log(`⏰ Timeout: ${participant.userId} cevap vermedi, otomatik yanlış kaydediliyor`);
          
          gameState.answers[participant.userId] = {
            answer: '-1', // Yanlış cevap
            correct: false,
            timestamp: Date.now(),
          };

          // Bot değilse playerAnswer event'i gönder
          if (!participant.isBot) {
            io.to(roomCode).emit('playerAnswer', {
              userId: participant.userId,
              answer: -1,
            });
          }
        }
      }

      // Tüm oyuncular cevap verdi (timeout ile)
      const allAnswered = Object.keys(gameState.answers).length === participants.length;

      if (allAnswered) {
        console.log(`⏰ Timeout ile tüm oyuncular cevap verdi, sonuçlar gönderiliyor: ${roomCode}`);
        
        // Sonuçları gönder
        io.to(roomCode).emit('answerResult', {
          correct: false, // Timeout olduğu için genel olarak false
          players: participants.map((p) => ({
            userId: p.userId,
            score: p.score,
          })),
          nextQuestionNumber: gameState.questionNumber + 1,
          timeout: true, // Timeout olduğunu belirt
        });

        // Sonraki soru veya oyun bitişi
        if (gameState.questionNumber < 10) {
          gameState.questionNumber++;
          setTimeout(() => {
            sendQuestion(io, roomCode);
          }, 3000);
        } else {
          // Oyun bitti
          await finishGame(io, roomCode);
        }
      }

      // Timer'ı temizle
      questionTimers.delete(roomCode);
    }

    /**
     * Cevap gönder
     */
    socket.on('sendAnswer', async (data) => {
      try {
        const { roomCode, userId, answer } = data;

        if (!roomCode || !userId || answer === undefined) {
          socket.emit('error', { message: 'Eksik bilgi' });
          return;
        }

        const gameState = activeGames.get(roomCode);
        if (!gameState || !gameState.currentQuestion) {
          return;
        }

        // Zaten cevap verildi mi kontrol et
        const existingAnswer = gameState.answers[userId];
        if (existingAnswer) {
          // Zaten cevap verilmiş, diğer oyunculara bildir (görsel feedback için)
          io.to(roomCode).emit('playerAnswer', {
            userId,
            answer: parseInt(existingAnswer.answer),
          });
          return;
        }

        // Cevabı hemen kaydet (çift tıklamayı önlemek için)
        gameState.answers[userId] = {
          answer: answer.toString(),
          correct: false, // Henüz kontrol edilmedi
          timestamp: Date.now(),
        };

        // Diğer oyunculara cevap seçimini bildir (görsel feedback için)
        io.to(roomCode).emit('playerAnswer', {
          userId,
          answer: parseInt(answer),
        });

        const isCorrect = answer === gameState.currentQuestion.correctAnswer;
        
        // Cevabı güncelle (zaten kaydedilmişti, şimdi doğruluk kontrolü yapıyoruz)
        gameState.answers[userId].correct = isCorrect;
        
        // İlk doğru cevap veren skor alır (bot dahil)
        const answeredCount = Object.keys(gameState.answers).length;
        const firstCorrectAnswer = answeredCount === 1 || 
          !Object.values(gameState.answers).some(ans => {
            const ansValue = typeof ans === 'object' ? ans.answer : ans;
            return ansValue === gameState.currentQuestion.correctAnswer && ans.correct;
          });
        const isFirst = isCorrect && firstCorrectAnswer;

        // İlk doğru cevap veren skor alır
        if (isCorrect && isFirst) {
          const room = await roomService.getRoomByCode(roomCode);
          const updatedParticipant = await roomService.updateParticipantScore(
            room.id,
            userId,
            1
          );

          // Skoru güncelle
          const participant = gameState.participants.find((p) => p.userId === userId);
          if (participant) {
            participant.score++;
          }

          // Skor güncellemesi gönder
          io.to(roomCode).emit('scoreUpdate', {
            userId,
            newScore: updatedParticipant.score,
          });
        }

        // Tüm oyuncular (bot dahil) cevap verdi mi?
        const participantsCount = gameState.participants.length;
        const allAnswered = answeredCount === participantsCount;
        
        console.log(`📊 Cevap durumu: ${answeredCount}/${participantsCount} oyuncu cevap verdi (Oda: ${roomCode})`);
        console.log(`📊 Cevap verenler:`, Object.keys(gameState.answers));
        console.log(`📊 Tüm oyuncular:`, gameState.participants.map(p => ({ userId: p.userId, isBot: p.isBot })));
        
        if (allAnswered) {
          console.log(`✅ Tüm oyuncular cevap verdi, sonuçlar gönderiliyor ve sonraki soruya geçiliyor: ${roomCode}`);
          
          // Timeout timer'ını iptal et (tüm oyuncular cevap verdi)
          if (questionTimers.has(roomCode)) {
            clearTimeout(questionTimers.get(roomCode));
            questionTimers.delete(roomCode);
            console.log(`✅ Timeout timer iptal edildi: ${roomCode}`);
          }

          // Sonuçları gönder
          io.to(roomCode).emit('answerResult', {
            correct: isCorrect,
            players: gameState.participants.map((p) => ({
              userId: p.userId,
              score: p.score,
            })),
            nextQuestionNumber: gameState.questionNumber + 1,
          });
          console.log(`📤 answerResult event'i gönderildi: ${roomCode}, Soru #${gameState.questionNumber + 1}`);

          // Sonraki soru veya oyun bitişi
          if (gameState.questionNumber < 10) {
            gameState.questionNumber++;
            console.log(`⏭️ Sonraki soruya geçiliyor: ${roomCode}, Soru #${gameState.questionNumber} (3 saniye sonra)`);
            setTimeout(() => {
              sendQuestion(io, roomCode);
              // Bot varsa yeni soru için bot cevabını başlat (sendQuestion içinde zaten yapılıyor)
            }, 3000);
          } else {
            // Oyun bitti
            console.log(`🏁 Oyun bitti: ${roomCode}`);
            await finishGame(io, roomCode);
          }
        } else {
          console.log(`⏳ Henüz tüm oyuncular cevap vermedi, bekleniyor: ${roomCode}`);
          // Sadece bu oyuncuya cevap sonucunu gönder
          socket.emit('answerResult', {
            correct: isCorrect,
            players: gameState.participants,
            nextQuestionNumber: gameState.questionNumber,
          });
        }
      } catch (error) {
        console.error('SendAnswer hatası:', error);
        socket.emit('error', { message: error.message || 'Cevap gönderilemedi' });
      }
    });

    /**
     * Oyunu bitir
     */
    async function finishGame(io, roomCode) {
      // Export için kaydet (botService'den çağrılabilmesi için)
      exportedFinishGame = finishGame;
      const gameState = activeGames.get(roomCode);
      if (!gameState) return;

      const room = await roomService.getRoomByCode(roomCode);

      // Toplam skorları güncelle (sadece gerçek kullanıcılar için, botlar için değil)
      for (const participant of gameState.participants) {
        if (!participant.isBot) {
          await userService.updateTotalScore(participant.userId, participant.score);
        }
      }

      // Liderlik tablosu oluştur (tüm oyuncular, botlar dahil)
      const leaderboard = gameState.participants
        .map((p) => {
          const user = room.participants.find((rp) => rp.userId === p.userId)?.user;
          return {
            userId: p.userId,
            nickname: user?.nickname || 'Unknown',
            avatar: user?.avatar || '🐱',
            score: p.score,
            isBot: p.isBot || false,
          };
        })
        .sort((a, b) => b.score - a.score);

      // Oyun bitti bildir
      io.to(roomCode).emit('endGame', {
        leaderboard,
      });

      // Oyun durumunu temizle (ama odayı deaktif etme - yeniden oynanabilir)
      activeGames.delete(roomCode);
      
      // Timer'ları temizle
      if (questionTimers.has(roomCode)) {
        clearTimeout(questionTimers.get(roomCode));
        questionTimers.delete(roomCode);
      }
      
      // Oyun bittikten sonra odayı kontrol et - sadece botlar kaldıysa temizle
      const updatedRoom = await roomService.getRoomByCode(roomCode);
      if (updatedRoom) {
        const realPlayers = updatedRoom.participants.filter((p) => !p.user.nickname.includes('Bot'));
        
        if (realPlayers.length === 0) {
          // Sadece botlar kaldı - botları da kaldır ve odayı deaktif et
          console.log(`Oyun bitti, sadece botlar kaldı - oda temizleniyor: ${roomCode}`);
          
          // Botları veritabanından kaldır
          const botParticipants = updatedRoom.participants.filter((p) => p.user.nickname.includes('Bot'));
          for (const botParticipant of botParticipants) {
            await roomService.removeParticipant(roomCode, botParticipant.userId);
          }
          
          // Odayı deaktif et
          await roomService.deactivateRoom(roomCode);
          botTimers.delete(roomCode);
        }
        // Eğer gerçek oyuncular varsa odayı aktif tut (yeniden oynanabilir)
      }
    }

    /**
     * Odadan ayrıl
     */
    socket.on('leaveRoom', async () => {
      if (currentRoomCode && currentUserId) {
        try {
          // Oda katılımcısını kaldır
          await roomService.removeParticipant(currentRoomCode, currentUserId);
          
          // Odayı kontrol et - boşsa inactive yap
          const room = await roomService.getRoomByCode(currentRoomCode);
          if (room) {
            // Sadece gerçek oyuncuları say (botlar hariç)
            const realPlayers = room.participants.filter((p) => !p.user.nickname.includes('Bot'));
            
            if (realPlayers.length === 0) {
              // Sadece botlar kaldı veya oda tamamen boş - botları da kaldır ve deaktif et
              console.log(`Oda boş (sadece botlar), temizleniyor: ${currentRoomCode}`);
              
              // Botları veritabanından kaldır
              const botParticipants = room.participants.filter((p) => p.user.nickname.includes('Bot'));
              for (const botParticipant of botParticipants) {
                await roomService.removeParticipant(currentRoomCode, botParticipant.userId);
              }
              
              // Odayı deaktif et
              await roomService.deactivateRoom(currentRoomCode);
              console.log(`Oda deaktif edildi: ${currentRoomCode}`);
              
              // Oyun durumunu temizle
              activeGames.delete(currentRoomCode);
              botTimers.delete(currentRoomCode);
            } else {
              // Oyun devam ediyor mu kontrol et
              const gameState = activeGames.get(currentRoomCode);
              const isGameActive = gameState !== undefined;
              
              // Eğer oyun devam ediyorsa ve sadece 1 gerçek oyuncu kaldıysa bot ekle
              if (isGameActive && realPlayers.length === 1) {
                console.log(`🤖 Oyuncu ayrıldı (leaveRoom), 1 oyuncu kaldı - bot ekleniyor: ${currentRoomCode}`);
                
                // Bot oluştur ve ekle
                const bot = botService.createBot();
                try {
                  await botService.addBotToRoom(io, currentRoomCode, bot, activeGames);
                  
                  // Bot eklendikten sonra güncel oyuncu listesini gönder
                  const updatedRoom = await roomService.getRoomByCode(currentRoomCode);
                  if (updatedRoom) {
                    io.to(currentRoomCode).emit('playerLeft', {
                      userId: currentUserId,
                      players: updatedRoom.participants.map((p) => ({
                        id: p.user.id,
                        nickname: p.user.nickname,
                        avatar: p.user.avatar,
                        score: p.score,
                      })),
                    });
                  }
                } catch (error) {
                  console.error('Bot ekleme hatası (oyun devam ederken):', error);
                  // Bot eklenemese bile oyuncuya bildir
                  io.to(currentRoomCode).emit('playerLeft', {
                    userId: currentUserId,
                    players: room.participants.map((p) => ({
                      id: p.user.id,
                      nickname: p.user.nickname,
                      avatar: p.user.avatar,
                      score: p.score,
                    })),
                  });
                }
              } else {
                // Diğer oyunculara bildir
                io.to(currentRoomCode).emit('playerLeft', {
                  userId: currentUserId,
                  players: room.participants.map((p) => ({
                    id: p.user.id,
                    nickname: p.user.nickname,
                    avatar: p.user.avatar,
                    score: p.score,
                  })),
                });
              }
            }
          }
          
          socket.leave(currentRoomCode);
          console.log(`${currentUserId} odadan ayrıldı: ${currentRoomCode}`);
        } catch (error) {
          console.error('LeaveRoom hatası:', error);
        }
      }
    });

    /**
     * Bağlantı kesildi
     */
    socket.on('disconnect', async () => {
      console.log(`Kullanıcı ayrıldı: ${socket.id}`);
      if (currentRoomCode && currentUserId) {
        try {
          // Oda katılımcısını kaldır
          await roomService.removeParticipant(currentRoomCode, currentUserId);
          
          // Odayı kontrol et - boşsa inactive yap
          const room = await roomService.getRoomByCode(currentRoomCode);
          if (room) {
            // Sadece gerçek oyuncuları say (botlar hariç)
            const realPlayers = room.participants.filter((p) => !p.user.nickname.includes('Bot'));
            
            if (realPlayers.length === 0) {
              // Sadece botlar kaldı veya oda tamamen boş - botları da kaldır ve deaktif et
              console.log(`Oda boş (sadece botlar), temizleniyor: ${currentRoomCode}`);
              
              // Botları veritabanından kaldır
              const botParticipants = room.participants.filter((p) => p.user.nickname.includes('Bot'));
              for (const botParticipant of botParticipants) {
                await roomService.removeParticipant(currentRoomCode, botParticipant.userId);
              }
              
              // Odayı deaktif et
              await roomService.deactivateRoom(currentRoomCode);
              console.log(`Oda deaktif edildi: ${currentRoomCode}`);
              
              // Oyun durumunu temizle
              activeGames.delete(currentRoomCode);
              botTimers.delete(currentRoomCode);
            } else {
              // Oyun devam ediyor mu kontrol et
              const gameState = activeGames.get(currentRoomCode);
              const isGameActive = gameState !== undefined;
              
              // Eğer oyun devam ediyorsa ve sadece 1 gerçek oyuncu kaldıysa bot ekle
              if (isGameActive && realPlayers.length === 1) {
                console.log(`🤖 Oyuncu ayrıldı (disconnect), 1 oyuncu kaldı - bot ekleniyor: ${currentRoomCode}`);
                
                // Bot oluştur ve ekle
                const bot = botService.createBot();
                try {
                  await botService.addBotToRoom(io, currentRoomCode, bot, activeGames);
                  
                  // Bot eklendikten sonra güncel oyuncu listesini gönder
                  const updatedRoom = await roomService.getRoomByCode(currentRoomCode);
                  if (updatedRoom) {
                    io.to(currentRoomCode).emit('playerLeft', {
                      userId: currentUserId,
                      players: updatedRoom.participants.map((p) => ({
                        id: p.user.id,
                        nickname: p.user.nickname,
                        avatar: p.user.avatar,
                        score: p.score,
                      })),
                    });
                  }
                } catch (error) {
                  console.error('Bot ekleme hatası (oyun devam ederken):', error);
                  // Bot eklenemese bile oyuncuya bildir
                  io.to(currentRoomCode).emit('playerLeft', {
                    userId: currentUserId,
                    players: room.participants.map((p) => ({
                      id: p.user.id,
                      nickname: p.user.nickname,
                      avatar: p.user.avatar,
                      score: p.score,
                    })),
                  });
                }
              } else {
                // Diğer oyunculara bildir
                io.to(currentRoomCode).emit('playerLeft', {
                  userId: currentUserId,
                  players: room.participants.map((p) => ({
                    id: p.user.id,
                    nickname: p.user.nickname,
                    avatar: p.user.avatar,
                    score: p.score,
                  })),
                });
              }
            }
          }
          
          socket.leave(currentRoomCode);
        } catch (error) {
          console.error('Disconnect hatası:', error);
        }
      }
    });
  });
}

// activeGames'i export et (botService için)
function getActiveGames() {
  return activeGames;
}

// sendQuestion fonksiyonunu export et (botService için)
let exportedSendQuestion = null;
let exportedFinishGame = null;

function setSendQuestion(sendQuestionFn) {
  exportedSendQuestion = sendQuestionFn;
}

function getSendQuestion() {
  return exportedSendQuestion;
}

function setFinishGame(finishGameFn) {
  exportedFinishGame = finishGameFn;
}

function getFinishGame() {
  return exportedFinishGame;
}

module.exports = setupSocketHandlers;
module.exports.getActiveGames = getActiveGames;
module.exports.setSendQuestion = setSendQuestion;
module.exports.getSendQuestion = getSendQuestion;
module.exports.setFinishGame = setFinishGame;
module.exports.getFinishGame = getFinishGame;
module.exports.questionTimers = questionTimers;

