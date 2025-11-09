/**
 * Bot Service
 * Bot kullanıcıları ve davranışlarını yönetir
 */

const userService = require('./userService');
const roomService = require('./roomService');

// Bot isimleri ve avatarları
const BOT_NAMES = [
  'Süper Matematikçi',
  'Hızlı Çocuk',
  'Matematik Ustası',
  'Sayıların Efendisi',
  'Zeki Robot',
  'Matematik Şampiyonu',
  'Hesaplama Makinesi',
  'Akıllı Asistan',
];

const BOT_AVATARS = ['🤖', '🧮', '📊', '🎯', '⚡', '🌟', '💡', '🎓'];

// Bot zorluk seviyeleri (doğru cevap verme oranı)
const BOT_DIFFICULTY = {
  easy: 0.6,    // %60 doğru
  medium: 0.75, // %75 doğru
  hard: 0.9,    // %90 doğru
};

/**
 * Rastgele bot oluştur
 */
function createBot() {
  const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  const randomAvatar = BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)];
  const difficulty = ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)];
  
  return {
    nickname: randomName,
    avatar: randomAvatar,
    difficulty: difficulty,
    isBot: true,
  };
}

/**
 * Bot'un cevap verme süresini hesapla (doğal görünmesi için)
 * @param {string} difficulty - Bot zorluk seviyesi
 * @param {boolean} isCorrect - Doğru cevap mı verecek
 * @returns {number} Cevap süresi (ms)
 */
function getBotResponseTime(difficulty, isCorrect) {
  // Doğru cevaplar genelde daha hızlı verilir
  const baseTime = isCorrect ? 2000 : 4000; // 2-4 saniye
  const variance = Math.random() * 2000; // 0-2 saniye rastgelelik
  const difficultyBonus = difficulty === 'easy' ? 1000 : difficulty === 'medium' ? 500 : 0;
  
  return baseTime + variance + difficultyBonus;
}

/**
 * Bot'un cevap verme kararını ver
 * @param {string} difficulty - Bot zorluk seviyesi
 * @param {number} correctAnswer - Doğru cevap
 * @param {number[]} options - Tüm seçenekler
 * @returns {number} Bot'un seçeceği cevap
 */
function getBotAnswer(difficulty, correctAnswer, options) {
  const correctRate = BOT_DIFFICULTY[difficulty] || 0.75;
  const willAnswerCorrectly = Math.random() < correctRate;
  
  if (willAnswerCorrectly) {
    // Doğru cevabı ver
    return correctAnswer;
  } else {
    // Yanlış cevap ver (doğru cevap hariç rastgele bir seçenek)
    const wrongOptions = options.filter(opt => opt !== correctAnswer);
    return wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
  }
}

/**
 * Bot'u veritabanına ekle (misafir kullanıcı olarak)
 */
async function createBotUser(bot) {
  try {
    // Bot kullanıcısını oluştur (isGuest = true, bot olduğunu belirtmek için)
    // Unique nickname için timestamp ekle
    const uniqueNickname = `${bot.nickname} ${Date.now()}`;
    const user = await userService.createUser(uniqueNickname, bot.avatar, true);
    return user;
  } catch (error) {
    // Eğer hala hata varsa, UUID benzeri bir string ekle
    const randomId = Math.random().toString(36).substring(2, 9);
    const modifiedName = `${bot.nickname} ${Date.now()}-${randomId}`;
    const user = await userService.createUser(modifiedName, bot.avatar, true);
    return user;
  }
}

/**
 * Bot'u odaya ekle ve cevap vermeye başlat
 */
async function addBotToRoom(io, roomCode, bot, activeGames) {
  try {
    // Bot kullanıcısını oluştur
    const botUser = await createBotUser(bot);
    
    // Bot'u odaya katıl
    const room = await roomService.joinRoom(roomCode, botUser.id);
    
    console.log(`🤖 Bot odaya katıldı: ${roomCode}, Bot: ${botUser.nickname}, Oda adventureMode: ${room.adventureMode}`);
    
    // Odaya katıldığını bildir
    io.to(roomCode).emit('playerJoined', {
      players: room.participants.map((p) => ({
        id: p.user.id,
        nickname: p.user.nickname,
        avatar: p.user.avatar,
        score: p.score,
      })),
    });
    
    // En az 2 oyuncu varsa (bot dahil) oyun başlat
    // Sadece ilk bot eklendiğinde oyunu başlat (diğer botlar için oyun zaten başlamış olmalı)
    console.log(`🔍 addBotToRoom: Oda ${roomCode}, Oyuncu sayısı: ${room.participants.length}, Oyun başlamış mı: ${activeGames.has(roomCode)}`);
    console.log(`🔍 addBotToRoom: Oda adventureMode: ${room.adventureMode}, difficultyLevel: ${room.difficultyLevel}`);
    
    // Debug: Her participant'ın isGuest değerini kontrol et
    console.log(`🔍 DEBUG: Participants isGuest değerleri:`, room.participants.map(p => ({
      userId: p.userId,
      nickname: p.user.nickname,
      isGuest: p.user.isGuest,
      isGuestType: typeof p.user.isGuest,
    })));
    
    if (room.participants.length >= 2) {
      // Oyun zaten başlamış mı kontrol et
      if (!activeGames.has(roomCode)) {
        // Sadece ilk bot eklendiğinde oyunu başlat
        // Bot kontrolü: isGuest = true olan kullanıcılar bot'tur (bot'lar misafir olarak oluşturulur)
        const realPlayerCount = room.participants.filter(p => !p.user.isGuest).length;
        const botCount = room.participants.filter(p => p.user.isGuest).length;
        
        // Normal modda: 1 bot + 1 gerçek oyuncu = 2 oyuncu
        // Macera modda: 3 bot + 1 gerçek oyuncu = 4 oyuncu
        const targetBotCount = room.adventureMode ? 3 : 1;
        console.log(`🔍 addBotToRoom: targetBotCount: ${targetBotCount}, botCount: ${botCount}, realPlayerCount: ${realPlayerCount}`);
        
        // Hedef bot sayısına ulaşıldıysa oyunu başlat
        console.log(`🔍 Bot kontrolü: Hedef: ${targetBotCount}, Mevcut: ${botCount}, Gerçek: ${realPlayerCount}, Oyun başlamış mı: ${activeGames.has(roomCode)}`);
        console.log(`🔍 Bot kontrolü: Koşul kontrolü - botCount >= targetBotCount: ${botCount >= targetBotCount}, realPlayerCount >= 1: ${realPlayerCount >= 1}`);
        if (botCount >= targetBotCount && realPlayerCount >= 1) {
          console.log(`✅ Bot eklendi, ${room.participants.length} oyuncu hazır (${realPlayerCount} gerçek, ${botCount} bot), oyun başlatılıyor: ${roomCode}`);
          console.log(`⏰ 2 saniye sonra oyun başlatılacak: ${roomCode}`);
          setTimeout(async () => {
            console.log(`🚀 Oyun başlatma zamanı geldi: ${roomCode}`);
            try {
              // Oyun durumunu başlat
              const gameState = {
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
                botDifficulty: bot.difficulty,
                botUserId: botUser.id,
              };
              activeGames.set(roomCode, gameState);
              console.log(`🎮 Oyun durumu oluşturuldu: ${roomCode}`, {
                participants: gameState.participants.length,
                bots: gameState.participants.filter(p => p.isBot).length,
                realPlayers: gameState.participants.filter(p => !p.isBot).length,
              });

              // Skorları sıfırla
              for (const participant of room.participants) {
                await roomService.updateParticipantScore(room.id, participant.userId, -participant.score);
              }

              // Oyun başladı bildir
              console.log(`🎮 gameStarted event gönderiliyor: ${roomCode}`);
              io.to(roomCode).emit('gameStarted', { isMidGame: false });
              console.log(`✅ gameStarted event gönderildi: ${roomCode}`);

              // İlk soruyu gönder (sendQuestion fonksiyonu bot cevaplarını da başlatacak)
              setTimeout(async () => {
                try {
                  console.log(`🤖 BotService: sendQuestion çağrılmadan önce kontrol: ${roomCode}`);
                  const gameStateCheck = activeGames.get(roomCode);
                  if (!gameStateCheck) {
                    console.error(`❌ BotService: Oyun durumu bulunamadı: ${roomCode}`);
                    return;
                  }
                  console.log(`✅ BotService: Oyun durumu mevcut: ${roomCode}, Participants: ${gameStateCheck.participants.length}`);
                  
                  const socketHandler = require('../socket/socketHandler');
                  const sendQuestionFn = socketHandler.getSendQuestion();
                  if (sendQuestionFn) {
                    console.log(`🤖 BotService: sendQuestion çağrılıyor: ${roomCode}`);
                    await sendQuestionFn(io, roomCode);
                    console.log(`✅ BotService: sendQuestion tamamlandı: ${roomCode}`);
                  } else {
                    console.error('❌ BotService: sendQuestion fonksiyonu bulunamadı');
                  }
                } catch (error) {
                  console.error('❌ BotService: sendQuestion hatası:', error);
                }
              }, 1000);
            } catch (error) {
              console.error('Bot ile oyun başlatma hatası:', error);
              io.to(roomCode).emit('error', { message: 'Oyun başlatılamadı' });
            }
          }, 2000);
        } else {
          console.log(`❌ Oyun başlatılmıyor: Henüz yeterli bot yok (Hedef: ${targetBotCount}, Mevcut: ${botCount}, Gerçek oyuncu: ${realPlayerCount})`);
          console.log(`❌ Koşul kontrolü: botCount >= targetBotCount: ${botCount >= targetBotCount}, realPlayerCount >= 1: ${realPlayerCount >= 1}`);
        }
      } else {
        console.log(`ℹ️ Oyun zaten başlamış: ${roomCode}, sadece bot ekleniyor`);
        // Oyun zaten başlamış, sadece bot'u ekle
        const gameState = activeGames.get(roomCode);
        if (gameState) {
          // Bot'u participants listesine ekle (eğer yoksa)
          const botExists = gameState.participants.some(p => p.userId === botUser.id);
          if (!botExists) {
            gameState.participants.push({
              userId: botUser.id,
              score: 0,
              isBot: true,
            });
            gameState.botDifficulty = bot.difficulty;
            gameState.botUserId = botUser.id;
            console.log(`Bot oyuna eklendi: ${botUser.id} (Toplam: ${gameState.participants.length})`);
            
            // Eğer oyun devam ediyorsa (soru varsa), bot'un mevcut soruya cevap vermesini başlat
            if (gameState.currentQuestion) {
              console.log(`🤖 Bot mevcut soruya cevap verecek: ${roomCode}`);
              setTimeout(() => {
                startBotAnswer(io, roomCode, botUser.id, bot.difficulty, activeGames);
              }, 1000); // 1 saniye gecikme ile doğal görünsün
            }
          }
        }
      }
    } else {
      console.log(`ℹ️ addBotToRoom: Oyuncu sayısı yetersiz: ${room.participants.length} (en az 2 olmalı)`);
    }
    
    return botUser;
  } catch (error) {
    console.error('Bot ekleme hatası:', error);
    throw error;
  }
}

/**
 * Bot'un cevap vermesini başlat (soru zaten gönderilmiş olmalı)
 */
async function startBotAnswer(io, roomCode, botUserId, botDifficulty, activeGames) {
  const gameState = activeGames.get(roomCode);
  
  if (!gameState || !gameState.currentQuestion) {
    console.log('Bot cevap veremiyor: oyun durumu veya soru yok');
    return;
  }
  
  // Mevcut sorudan bilgileri al
  const question = gameState.currentQuestion;
  const correctAnswerNum = parseInt(question.correctAnswer);
  const options = question.options.map(opt => parseInt(opt));
  
  // Bot'un cevabını hesapla
  const botAnswer = getBotAnswer(botDifficulty, correctAnswerNum, options);
  const botWillAnswerCorrectly = botAnswer === correctAnswerNum;
  const responseTime = getBotResponseTime(botDifficulty, botWillAnswerCorrectly);
  
  console.log(`🤖 Bot cevap verecek: ${botAnswer} (Doğru: ${correctAnswerNum}, Süre: ${responseTime}ms)`);
  
  // Bot'un cevabını bekle ve gönder
  setTimeout(async () => {
    await handleBotAnswer(io, roomCode, botUserId, botAnswer, correctAnswerNum, gameState, activeGames);
  }, responseTime);
}

/**
 * Bot'un cevabını işle
 */
async function handleBotAnswer(io, roomCode, botUserId, botAnswer, correctAnswer, gameState, activeGames) {
  const isCorrect = botAnswer === correctAnswer;
  
  // Eğer bot zaten cevap vermişse tekrar işleme
  if (gameState.answers[botUserId]) {
    console.log(`🤖 Bot zaten cevap vermiş: ${botUserId}`);
    return;
  }
  
  // Cevabı kaydet (diğer oyuncuların formatıyla uyumlu)
  gameState.answers[botUserId] = {
    answer: botAnswer.toString(),
    correct: isCorrect,
    timestamp: Date.now(),
  };
  
  console.log(`🤖 Bot cevap verdi: ${botAnswer} (Doğru: ${isCorrect})`);
  
  // Bot'un cevabını diğer oyunculara bildir
  io.to(roomCode).emit('playerAnswer', {
    userId: botUserId,
    answer: botAnswer,
  });
  
  // İlk doğru cevap veren skor alır
  const answeredCount = Object.keys(gameState.answers).length;
  const firstCorrectAnswer = answeredCount === 1 || 
    !Object.values(gameState.answers).some(ans => {
      const ansValue = typeof ans === 'object' ? ans.answer : ans;
      return ansValue === correctAnswer.toString() && ans.correct;
    });
  const isFirst = isCorrect && firstCorrectAnswer;
  
  if (isCorrect && isFirst) {
    // Skoru güncelle
    const room = await roomService.getRoomByCode(roomCode);
    const updatedParticipant = await roomService.updateParticipantScore(room.id, botUserId, 1);
    
    // Skor güncellemesi gönder
    io.to(roomCode).emit('scoreUpdate', {
      userId: botUserId,
      newScore: updatedParticipant.score,
    });
    
    // Oyun durumunu güncelle
    const participant = gameState.participants.find((p) => p.userId === botUserId);
    if (participant) {
      participant.score++;
    }
  }
  
  // Tüm oyuncular cevap verdi mi kontrol et
  const participantsCount = gameState.participants.length;
  const allAnswered = answeredCount === participantsCount;
  
  console.log(`🤖 Bot cevap durumu: ${answeredCount}/${participantsCount} oyuncu cevap verdi (Oda: ${roomCode})`);
  console.log(`🤖 Bot cevap verenler:`, Object.keys(gameState.answers));
  console.log(`🤖 Bot tüm oyuncular:`, gameState.participants.map(p => ({ userId: p.userId, isBot: p.isBot })));
  
  if (allAnswered) {
    console.log(`✅ Tüm oyuncular cevap verdi (bot dahil), sonuçlar gönderiliyor: ${roomCode}`);
    
    // Timeout timer'ını iptal et (tüm oyuncular cevap verdi)
    const socketHandler = require('../socket/socketHandler');
    const questionTimers = socketHandler.questionTimers;
    if (questionTimers && questionTimers.has(roomCode)) {
      clearTimeout(questionTimers.get(roomCode));
      questionTimers.delete(roomCode);
      console.log(`✅ Timeout timer iptal edildi (bot): ${roomCode}`);
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
    console.log(`📤 Bot: answerResult event'i gönderildi: ${roomCode}, Soru #${gameState.questionNumber + 1}`);
    
    // Sonraki soru veya oyun bitişi
    if (gameState.questionNumber < 10) {
      gameState.questionNumber++;
      console.log(`⏭️ Bot: Sonraki soruya geçiliyor: ${roomCode}, Soru #${gameState.questionNumber} (3 saniye sonra)`);
      setTimeout(async () => {
        // sendQuestion fonksiyonunu socket handler'dan al
        const sendQuestionFn = socketHandler.getSendQuestion();
        if (sendQuestionFn) {
          console.log(`🤖 Bot: sendQuestion çağrılıyor: ${roomCode}`);
          await sendQuestionFn(io, roomCode);
        } else {
          console.error('❌ sendQuestion fonksiyonu bulunamadı');
        }
      }, 3000);
    } else {
      // Oyun bitti
      console.log(`🏁 Bot: Oyun bitti: ${roomCode}`);
      // finishGame fonksiyonunu socketHandler'dan al
      const socketHandler = require('../socket/socketHandler');
      const finishGameFn = socketHandler.getFinishGame();
      if (finishGameFn) {
        await finishGameFn(io, roomCode);
      } else {
        console.error('❌ finishGame fonksiyonu bulunamadı');
      }
    }
  } else {
    console.log(`⏳ Bot: Henüz tüm oyuncular cevap vermedi, bekleniyor: ${roomCode}`);
  }
  // Eğer tüm oyuncular cevap vermediyse, socket handler'daki sendAnswer event'i veya timeout sonuçları işleyecek
}

/**
 * Oyun bitişini işle
 */
async function finishGame(io, roomCode, activeGames) {
  const gameState = activeGames.get(roomCode);
  if (!gameState) return;
  
  const room = await roomService.getRoomByCode(roomCode);
  
  // Toplam skorları güncelle (sadece gerçek kullanıcılar için, botlar için değil)
  for (const participant of gameState.participants) {
    if (!participant.isBot) {
      const roomParticipant = room.participants.find(p => p.userId === participant.userId);
      if (roomParticipant && participant.score > 0) {
        await userService.updateTotalScore(participant.userId, participant.score);
      }
    }
  }
  
  // Liderlik tablosu oluştur
  const leaderboard = gameState.participants
    .map((p) => {
      const user = room.participants.find(rp => rp.userId === p.userId)?.user;
      return {
        userId: p.userId,
        nickname: user?.nickname || 'Bilinmeyen',
        avatar: user?.avatar || '🤖',
        score: p.score,
      };
    })
    .sort((a, b) => b.score - a.score);
  
  // Oyun bitti bildir
  io.to(roomCode).emit('endGame', { leaderboard });
  
  // Oyun durumunu temizle
  activeGames.delete(roomCode);
}

module.exports = {
  createBot,
  addBotToRoom,
  startBotAnswer,
  handleBotAnswer,
};

