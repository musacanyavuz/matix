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

            // Online durumunu güncelle
            await userService.setUserOnline(user.id);

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
        console.log('🚪 joinRoom event alındı:', data);
        const { roomCode, userId } = data;

        if (!roomCode || !userId) {
          console.error('❌ joinRoom: Oda kodu veya kullanıcı ID eksik');
          socket.emit('error', { message: 'Oda kodu ve kullanıcı ID gereklidir' });
          return;
        }

        console.log(`🚪 Odaya katılıyor: ${roomCode}, Kullanıcı: ${userId}`);
        // Odaya katıl
        const room = await roomService.joinRoom(roomCode, userId);
        console.log(`✅ Odaya katıldı: ${roomCode}, Oyuncu sayısı: ${room.participants.length}`);
        currentRoomCode = roomCode;
        currentUserId = userId;

        // Aktif oyun bilgisini güncelle
        await userService.setUserCurrentRoom(userId, room.id);

        // Socket room'a katıl
        socket.join(roomCode);

        // Oyun durumunu kontrol et
        const gameState = activeGames.get(roomCode);
        const isGameActive = gameState !== undefined;
        
        // Katılan oyuncuya roomJoined gönder
        const roomJoinedData = {
          roomCode: room.code,
          players: room.participants.map((p) => ({
            id: p.user.id,
            nickname: p.user.nickname,
            avatar: p.user.avatar,
            score: p.score,
          })),
        };
        console.log(`📤 roomJoined event gönderiliyor: ${roomCode}`, roomJoinedData);
        socket.emit('roomJoined', roomJoinedData);
        
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
              isBot: newParticipant.user.isGuest || false, // Bot kontrolü: isGuest = true olanlar bot'tur
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
        // Ancak bot ekleme işlemi botService tarafından yapılıyor, burada sadece gerçek oyuncular için kontrol yap
        // Bot kontrolü: isGuest = true olan kullanıcılar bot'tur
        const realPlayerCount = room.participants.filter(p => !p.user.isGuest).length;
        const botCount = room.participants.filter(p => p.user.isGuest).length;
        
        // Sadece gerçek oyuncular için oyun başlatma kontrolü yap (bot'lar botService tarafından işlenecek)
        if (room.participants.length >= 2 && realPlayerCount >= 1 && !activeGames.has(roomCode)) {
          // Bot varsa botService oyunu başlatacak, burada sadece log
          if (botCount > 0) {
            console.log(`${room.participants.length} oyuncu hazır (${realPlayerCount} gerçek, ${botCount} bot), botService oyunu başlatacak: ${roomCode}`);
          } else {
            // Bot yoksa burada oyunu başlat (normal multiplayer durumu)
            console.log(`${room.participants.length} oyuncu hazır (bot yok), oyun başlatılıyor: ${roomCode}`);
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
                    isBot: p.user.isGuest || false, // Bot kontrolü: isGuest = true olanlar bot'tur
                  })),
                  ageGroup: room.ageGroup || 'grade1',
                  difficultyLevel: room.difficultyLevel || 0,
                });

                // Skorları sıfırla
                for (const participant of room.participants) {
                  await roomService.updateParticipantScore(room.id, participant.userId, -participant.score);
                }

                // Oyun başladı bildir
                io.to(roomCode).emit('gameStarted', { isMidGame: false });

                // İlk soruyu gönder
                setTimeout(() => {
                  sendQuestion(io, roomCode);
                }, 1000);
              } catch (error) {
                console.error('Oyun başlatma hatası:', error);
                io.to(roomCode).emit('error', { message: 'Oyun başlatılamadı' });
              }
            }, 2000);
          }
        } else if (activeGames.has(roomCode)) {
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
                isBot: newParticipant.user.isGuest || false, // Bot kontrolü: isGuest = true olanlar bot'tur
              });
              console.log(`Yeni oyuncu eklendi: ${newParticipant.userId} (Toplam: ${gameState.participants.length})`);
            }
          }
        } else if (room.participants.length === 1 && !botTimers.has(roomCode)) {
          // Macera modunda veya normal modda tek oyuncu varsa bot ekle
          const botDelay = room.adventureMode ? 2000 : 15000; // Macera modunda 2 saniye, normal modda 15 saniye
          console.log(`⏰ ${room.adventureMode ? 'Macera modu' : 'Tek oyuncu'} - ${botDelay / 1000} saniye sonra bot eklenecek: ${roomCode}`);
          console.log(`⏰ Bot timer başlatıldı: ${roomCode}, Delay: ${botDelay}ms`);
          const timer = setTimeout(async () => {
            console.log(`⏰ Bot timer tetiklendi: ${roomCode}`);
            try {
              // Oda hala tek oyuncu mu kontrol et ve bot sayısını kontrol et
              const currentRoom = await roomService.getRoomByCode(roomCode);
              console.log(`🔍 Bot ekleme kontrolü: Oda ${roomCode}, Oyuncu sayısı: ${currentRoom?.participants.length || 0}`);
              if (currentRoom && currentRoom.participants.length === 1) {
                // Mevcut bot sayısını kontrol et
                // Bot kontrolü: isGuest = true olan kullanıcılar bot'tur
                const existingBotCount = currentRoom.participants.filter(p => p.user.isGuest).length;
                const targetBotCount = currentRoom.adventureMode ? 3 : 1;
                const botsToAdd = targetBotCount - existingBotCount;
                
                console.log(`🤖 Bot sayısı kontrolü: Hedef: ${targetBotCount}, Mevcut: ${existingBotCount}, Eklenecek: ${botsToAdd}`);
                if (botsToAdd > 0) {
                  console.log(`🤖 ${botsToAdd} bot eklenecek (Hedef: ${targetBotCount}, Mevcut: ${existingBotCount})`);
                  for (let i = 0; i < botsToAdd; i++) {
                    const bot = botService.createBot();
                    console.log(`🤖 Bot oluşturuldu: ${bot.nickname} (${bot.difficulty}) - Oda: ${roomCode}`);
                    console.log(`🤖 Bot odaya ekleniyor: ${roomCode}`);
                    await botService.addBotToRoom(io, roomCode, bot, activeGames);
                    console.log(`✅ Bot odaya eklendi: ${bot.nickname} - Oda: ${roomCode}`);
                    // Botlar arasında kısa gecikme
                    if (i < botsToAdd - 1) {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }
                  }
                } else {
                  console.log(`🤖 Yeterli bot var, ek bot eklenmeyecek (Hedef: ${targetBotCount}, Mevcut: ${existingBotCount})`);
                }
              } else {
                console.log(`⚠️ Oda durumu değişti: ${roomCode}, Oyuncu sayısı: ${currentRoom?.participants.length || 0}`);
              }
              botTimers.delete(roomCode);
              console.log(`✅ Bot timer temizlendi: ${roomCode}`);
            } catch (error) {
              console.error('❌ Bot ekleme hatası:', error);
              console.error('❌ Hata detayı:', error.stack);
              botTimers.delete(roomCode);
            }
          }, botDelay);

          botTimers.set(roomCode, timer);
          console.log(`✅ Bot timer kaydedildi: ${roomCode}`);
        } else {
          if (room.participants.length !== 1) {
            console.log(`ℹ️ Bot timer başlatılmadı: Oda ${roomCode}, Oyuncu sayısı: ${room.participants.length} (1 olmalı)`);
          }
          if (botTimers.has(roomCode)) {
            console.log(`ℹ️ Bot timer zaten var: ${roomCode}`);
          }
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
            isBot: p.user.isGuest || false, // Bot kontrolü: isGuest = true olanlar bot'tur
          })),
          ageGroup: room.ageGroup || 'grade1',
          difficultyLevel: room.difficultyLevel || 0,
        });
        
        // Bot varsa bot bilgilerini ekle
        // Bot kontrolü: isGuest = true olan kullanıcılar bot'tur
        const botParticipant = room.participants.find((p) => p.user.isGuest);
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
      if (!gameState) {
        console.error(`❌ sendQuestion: Oyun durumu bulunamadı: ${roomCode}`);
        return;
      }

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
      const botParticipants = gameState.participants.filter(p => p.isBot);
      if (botParticipants.length > 0) {
        console.log(`🤖 ${botParticipants.length} bot var, cevap vermeleri başlatılıyor: ${roomCode}`);
        botParticipants.forEach((botParticipant, index) => {
          const botDifficulty = gameState.botDifficulty || 'medium';
          // Botlar arasında kısa gecikme ile cevap vermelerini başlat (daha doğal görünsün)
          setTimeout(() => {
            console.log(`🤖 Bot cevap vermesi başlatılıyor: ${botParticipant.userId} (${botDifficulty})`);
            botService.startBotAnswer(io, roomCode, botParticipant.userId, botDifficulty, activeGames);
          }, 500 + (index * 200)); // Her bot için 200ms gecikme
        });
      }

      // 15 saniyelik timeout timer'ı başlat
      // Önceki timer varsa iptal et
      if (questionTimers.has(roomCode)) {
        clearTimeout(questionTimers.get(roomCode));
        questionTimers.delete(roomCode);
      }
      
      const timeoutTimer = setTimeout(async () => {
        console.log(`⏰ Soru timeout (15 saniye): ${roomCode}`);
        await handleQuestionTimeout(io, roomCode);
      }, 15000); // 15 saniye

      questionTimers.set(roomCode, timeoutTimer);
      console.log(`⏰ Timeout timer başlatıldı: ${roomCode} (15 saniye)`);
    }

    /**
     * Soru timeout handler - 15 saniye sonra cevap vermeyen oyuncular için otomatik yanlış cevap
     */
    async function handleQuestionTimeout(io, roomCode) {
      console.log(`⏰ handleQuestionTimeout çağrıldı: ${roomCode}`);
      const gameState = activeGames.get(roomCode);
      if (!gameState || !gameState.currentQuestion) {
        console.log(`⏰ Timeout iptal: Oyun durumu veya soru yok: ${roomCode}`);
        if (questionTimers.has(roomCode)) {
          questionTimers.delete(roomCode);
        }
        return;
      }

      // Timer'ı hemen temizle (tekrar tetiklenmesini önle)
      if (questionTimers.has(roomCode)) {
        clearTimeout(questionTimers.get(roomCode));
        questionTimers.delete(roomCode);
      }

      const question = gameState.currentQuestion;
      const correctAnswer = parseInt(question.correctAnswer);
      const options = question.options.map(opt => parseInt(opt));
      const participants = gameState.participants;

      // Yanlış bir cevap seç (doğru cevap dışında bir seçenek)
      const wrongAnswer = options.find(opt => opt !== correctAnswer) || options[0];

      console.log(`⏰ Timeout: ${participants.length} oyuncu var, ${Object.keys(gameState.answers).length} cevap verdi`);

      // Cevap vermeyen oyuncular için otomatik yanlış cevap kaydet
      for (const participant of participants) {
        if (!gameState.answers[participant.userId]) {
          console.log(`⏰ Timeout: ${participant.userId} (Bot: ${participant.isBot}) cevap vermedi, otomatik yanlış kaydediliyor (${wrongAnswer})`);
          
          gameState.answers[participant.userId] = {
            answer: wrongAnswer.toString(),
            correct: false,
            timestamp: Date.now(),
          };

          // Bot değilse playerAnswer event'i gönder
          if (!participant.isBot) {
            io.to(roomCode).emit('playerAnswer', {
              userId: participant.userId,
              answer: wrongAnswer,
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
          console.log(`⏰ Timeout: Sonraki soruya geçiliyor (3 saniye sonra): ${roomCode}, Soru #${gameState.questionNumber}`);
          setTimeout(() => {
            sendQuestion(io, roomCode);
          }, 3000);
        } else {
          // Oyun bitti
          console.log(`⏰ Timeout: Oyun bitti: ${roomCode}`);
          await finishGame(io, roomCode);
        }
      } else {
        console.log(`⏰ Timeout: Hala tüm oyuncular cevap vermedi: ${Object.keys(gameState.answers).length}/${participants.length}`);
      }
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

      // Macera modunda bölüm ilerletme kontrolü
      let chapterProgressed = false;
      let newChapter = null;
      if (room.adventureMode && leaderboard.length > 0) {
        // En yüksek skora sahip oyuncu (kazanan)
        const winner = leaderboard[0];
        // Kazanan gerçek kullanıcı mı kontrol et (bot değilse)
        const winnerParticipant = room.participants.find((rp) => rp.userId === winner.userId);
        // Bot kontrolü: isGuest = true olan kullanıcılar bot'tur
        if (winnerParticipant && !winnerParticipant.user.isGuest) {
          // Kullanıcı kazandı, bölümü ilerlet
          const currentChapter = room.currentChapter || 1;
          newChapter = currentChapter + 1;
          await roomService.updateRoomChapter(roomCode, newChapter);
          
          // Kullanıcının adventureChapter'ını güncelle
          const userService = require('../services/userService');
          await userService.updateAdventureChapter(winner.userId, newChapter);
          
          chapterProgressed = true;
          console.log(`🎉 Macera modu: Bölüm ${currentChapter} tamamlandı! Yeni bölüm: ${newChapter}`);
        }
      }

      // Oyun bitti bildir
      io.to(roomCode).emit('endGame', {
        leaderboard,
        adventureMode: room.adventureMode || false,
        chapterProgressed,
        newChapter,
      });

      // Oyun durumunu temizle (ama odayı deaktif etme - yeniden oynanabilir)
      activeGames.delete(roomCode);
      
      // Timer'ları temizle
      if (questionTimers.has(roomCode)) {
        clearTimeout(questionTimers.get(roomCode));
        questionTimers.delete(roomCode);
      }
      
      // Tüm gerçek oyuncuların aktif oyun bilgisini temizle
      for (const participant of gameState.participants) {
        if (!participant.isBot) {
          await userService.setUserCurrentRoom(participant.userId, null);
        }
      }

      // Oyun bittikten sonra odayı kontrol et - sadece botlar kaldıysa temizle
      const updatedRoom = await roomService.getRoomByCode(roomCode);
      if (updatedRoom) {
        // Bot kontrolü: isGuest = true olan kullanıcılar bot'tur
        const realPlayers = updatedRoom.participants.filter((p) => !p.user.isGuest);
        
        if (realPlayers.length === 0) {
          // Sadece botlar kaldı - botları da kaldır ve odayı deaktif et
          console.log(`Oyun bitti, sadece botlar kaldı - oda temizleniyor: ${roomCode}`);
          
          // Botları veritabanından kaldır
          // Bot kontrolü: isGuest = true olan kullanıcılar bot'tur
          const botParticipants = updatedRoom.participants.filter((p) => p.user.isGuest);
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
          // Aktif oyun bilgisini temizle
          await userService.setUserCurrentRoom(currentUserId, null);
          
          // Oda katılımcısını kaldır
          await roomService.removeParticipant(currentRoomCode, currentUserId);
          
          // Odayı kontrol et - boşsa inactive yap
          const room = await roomService.getRoomByCode(currentRoomCode);
          if (room) {
            // Sadece gerçek oyuncuları say (botlar hariç)
            // Bot kontrolü: isGuest = true olan kullanıcılar bot'tur
            const realPlayers = room.participants.filter((p) => !p.user.isGuest);
            
            if (realPlayers.length === 0) {
              // Sadece botlar kaldı veya oda tamamen boş - botları da kaldır ve deaktif et
              console.log(`Oda boş (sadece botlar), temizleniyor: ${currentRoomCode}`);
              
              // Botları veritabanından kaldır
              // Bot kontrolü: isGuest = true olan kullanıcılar bot'tur
              const botParticipants = room.participants.filter((p) => p.user.isGuest);
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
          
          // Aktif oyun bilgisini temizle
          await userService.setUserCurrentRoom(currentUserId, null);
          
          socket.leave(currentRoomCode);
          console.log(`${currentUserId} odadan ayrıldı: ${currentRoomCode}`);
        } catch (error) {
          console.error('LeaveRoom hatası:', error);
        }
      }
    });

    /**
     * Arkadaşı oyuna davet et (socket event)
     */
    socket.on('inviteFriendToRoom', async (data) => {
      try {
        const { friendId, roomId } = data;
        
        if (!friendId || !roomId || !currentUserId) {
          socket.emit('error', { message: 'Arkadaş ID ve oda ID gereklidir' });
          return;
        }

        const invitation = await roomService.inviteFriendToRoom(currentUserId, friendId, roomId);
        
        // Davet edilen kullanıcıya bildir (eğer online ise)
        io.emit('roomInvitation', {
          invitationId: invitation.id,
          roomCode: invitation.roomCode,
          inviter: {
            id: currentUserId,
            nickname: socket.nickname,
          },
        });

        socket.emit('invitationSent', { success: true, invitation });
      } catch (error) {
        console.error('Arkadaş davet hatası:', error);
        socket.emit('error', { message: error.message || 'Davet gönderilemedi' });
      }
    });

    /**
     * Oda davetini kabul et (socket event)
     */
    socket.on('acceptRoomInvitation', async (data) => {
      try {
        const { invitationId } = data;
        
        if (!invitationId || !currentUserId) {
          socket.emit('error', { message: 'Davet ID gereklidir' });
          return;
        }

        const room = await roomService.acceptRoomInvitation(invitationId, currentUserId);
        
        // Odaya katıl
        currentRoomCode = room.code;
        socket.join(room.code);
        
        // Aktif oyun bilgisini güncelle
        await userService.setUserCurrentRoom(currentUserId, room.id);

        socket.emit('roomJoined', {
          roomCode: room.code,
          players: room.participants.map((p) => ({
            id: p.user.id,
            nickname: p.user.nickname,
            avatar: p.user.avatar,
            score: p.score,
          })),
        });
      } catch (error) {
        console.error('Davet kabul hatası:', error);
        socket.emit('error', { message: error.message || 'Davet kabul edilemedi' });
      }
    });

    /**
     * Oda davetini reddet (socket event)
     */
    socket.on('rejectRoomInvitation', async (data) => {
      try {
        const { invitationId } = data;
        
        if (!invitationId || !currentUserId) {
          socket.emit('error', { message: 'Davet ID gereklidir' });
          return;
        }

        await roomService.rejectRoomInvitation(invitationId, currentUserId);
        socket.emit('invitationRejected', { success: true });
      } catch (error) {
        console.error('Davet reddet hatası:', error);
        socket.emit('error', { message: error.message || 'Davet reddedilemedi' });
      }
    });

    /**
     * Bağlantı kesildi
     */
    socket.on('disconnect', async () => {
      console.log(`Kullanıcı ayrıldı: ${socket.id}`);
      
      // Offline durumunu güncelle (sadece kayıtlı kullanıcılar için)
      if (currentUserId && isAuthenticated) {
        await userService.setUserOffline(currentUserId);
      }
      
      if (currentRoomCode && currentUserId) {
        try {
          // Oda katılımcısını kaldır
          await roomService.removeParticipant(currentRoomCode, currentUserId);
          
          // Odayı kontrol et - boşsa inactive yap
          const room = await roomService.getRoomByCode(currentRoomCode);
          if (room) {
            // Sadece gerçek oyuncuları say (botlar hariç)
            // Bot kontrolü: isGuest = true olan kullanıcılar bot'tur
            const realPlayers = room.participants.filter((p) => !p.user.isGuest);
            
            if (realPlayers.length === 0) {
              // Sadece botlar kaldı veya oda tamamen boş - botları da kaldır ve deaktif et
              console.log(`Oda boş (sadece botlar), temizleniyor: ${currentRoomCode}`);
              
              // Botları veritabanından kaldır
              // Bot kontrolü: isGuest = true olan kullanıcılar bot'tur
              const botParticipants = room.participants.filter((p) => p.user.isGuest);
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
    
    // sendQuestion fonksiyonunu export et (botService'den çağrılabilmesi için)
    // Bu, setupSocketHandlers içinde tanımlandığı için burada atanmalı
    exportedSendQuestion = sendQuestion;
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
  if (!exportedSendQuestion) {
    console.warn('⚠️ getSendQuestion: exportedSendQuestion henüz set edilmemiş');
  }
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

