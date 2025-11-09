import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { AgeGroup } from '../constants/ageGroups';

// Socket.io sunucu URL'i - gerçek uygulamada kendi sunucunuzun URL'ini kullanın
const SOCKET_URL = 'http://192.168.1.107:3001';

// Tip tanımlamaları
export interface User {
  nickname: string;
  avatar: string;
  ageGroup: AgeGroup;
}

export interface Player {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
}

export interface Question {
  question: string;
  correctAnswer: number;
  options: number[];
}

interface GameState {
  user: User | null;
  userId: string | null; // Backend'den gelen user ID
  token: string | null; // JWT token
  isAuthenticated: boolean; // Kayıtlı kullanıcı mı?
  socket: Socket | null;
  roomId: string | null;
  players: Player[];
  currentQuestion: Question | null;
  questionNumber: number;
  gameStatus: 'waiting' | 'playing' | 'finished' | 'idle';
  winner: Player | null;
  isAnswering: boolean;
  ageGroup: AgeGroup | null;
  playerAnswers: Array<{ userId: string; answer: number }>;
}

interface GameContextType extends GameState {
  showGameStartCountdown: boolean;
  setShowGameStartCountdown: (show: boolean) => void;
  showQuestionCountdown: boolean;
  setShowQuestionCountdown: (show: boolean) => void;
  isLoadingUser: boolean;
  setUser: (user: User, guestUserId?: string | null) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string, avatar: string, ageGroup: AgeGroup) => Promise<void>;
  convertGuestToUser: (email: string, password: string, nickname: string, avatar: string, ageGroup: AgeGroup) => Promise<void>;
  logout: () => Promise<void>;
  createRoom: () => void;
  joinRoom: (roomId: string) => Promise<void>;
  submitAnswer: (answer: number) => void;
  resetGame: () => void;
  restartGame: () => void;
  disconnect: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // Backend user ID
  const [token, setToken] = useState<string | null>(null); // JWT token
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Kayıtlı kullanıcı mı?
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished' | 'idle'>('idle');
  const [winner, setWinner] = useState<Player | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [showGameStartCountdown, setShowGameStartCountdown] = useState(false);
  const [showQuestionCountdown, setShowQuestionCountdown] = useState(false);
  const [playerAnswers, setPlayerAnswers] = useState<Array<{ userId: string; answer: number }>>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(true); // Kullanıcı yükleniyor mu?

  const loadUser = async () => {
    setIsLoadingUser(true);
    try {
      // Token'ı yükle
      const savedToken = await AsyncStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
        setIsAuthenticated(true);
        
        // Token ile kullanıcı bilgisini al
        try {
          const response = await fetch(`${SOCKET_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.data?.user) {
              const backendUser = data.data.user;
              setUserId(backendUser.id);
              
              // Backend'den gelen kullanıcı bilgilerini kullan
              // Local storage'dan ageGroup bilgisini al (backend'de yoksa)
              const userJson = await AsyncStorage.getItem('user');
              if (userJson) {
                const localUserData = JSON.parse(userJson);
                const userData: User = {
                  nickname: backendUser.nickname || localUserData.nickname,
                  avatar: backendUser.avatar || localUserData.avatar,
                  ageGroup: localUserData.ageGroup || 'grade1',
                };
                setUserState(userData);
                setAgeGroup(userData.ageGroup);
              } else {
                // Local storage'da yoksa backend'den gelen bilgileri kullan
                const userData: User = {
                  nickname: backendUser.nickname,
                  avatar: backendUser.avatar,
                  ageGroup: 'grade1', // Varsayılan
                };
                setUserState(userData);
                setAgeGroup(userData.ageGroup);
              }
            }
          } else {
            // Token geçersizse sil
            await AsyncStorage.removeItem('token');
            setToken(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Token doğrulama hatası:', error);
        }
      } else {
        // Token yoksa misafir kullanıcı bilgilerini yükle
        const userJson = await AsyncStorage.getItem('user');
        const guestUserId = await AsyncStorage.getItem('guestUserId');
        
        if (userJson) {
          const userData = JSON.parse(userJson);
          setUserState(userData);
          setAgeGroup(userData.ageGroup);
          
          // Misafir kullanıcı ID'si varsa yükle
          if (guestUserId) {
            setUserId(guestUserId);
          }
          
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Kullanıcı bilgisi yüklenemedi:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  // Uygulama başladığında kullanıcı bilgisini yükle
  useEffect(() => {
    loadUser();
  }, []);

  // Socket bağlantısını kur
  useEffect(() => {
    if (user) {
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket bağlandı:', newSocket.id);
        // Kullanıcı bilgisini sunucuya gönder (token varsa ekle)
        newSocket.emit('register', {
          nickname: user.nickname,
          avatar: user.avatar,
          ageGroup: user.ageGroup,
          token: token || undefined, // Token varsa gönder
        });
      });

      // Socket bağlantı durumunu logla
      newSocket.on('connect', () => {
        console.log('🔌 Socket bağlantı durumu: Bağlı');
      });

      newSocket.on('disconnecting', () => {
        console.log('⚠️ Socket bağlantısı kesiliyor...');
      });

      // Register sonrası userId'yi al
      newSocket.on('registered', (data: { userId: string }) => {
        setUserId(data.userId);
        console.log('Kullanıcı ID alındı:', data.userId);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket bağlantısı kesildi');
      });

      // Socket hata event'leri
      newSocket.on('error', (error: { message: string }) => {
        console.error('❌ Socket hatası:', error);
        alert(error.message || 'Bağlantı hatası');
      });

      // Socket bağlantı durumu
      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket bağlantı hatası:', error);
        alert('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
      });

      newSocket.on('roomCreated', (data: { roomId: string }) => {
        setRoomId(data.roomId);
        setGameStatus('waiting');
      });

      newSocket.on('roomJoined', (data: { roomCode: string; players: Player[] }) => {
        console.log('✅ roomJoined event alındı:', data);
        setRoomId(data.roomCode);
        setPlayers(data.players);
        setGameStatus('waiting');
      });

      newSocket.on('playerJoined', (data: { players: Player[] }) => {
        setPlayers(data.players);
        // Backend otomatik oyun başlatacak, burada sadece players'ı güncelle
      });

      newSocket.on('playerLeft', (data: { userId: string; players: Player[] }) => {
        console.log('👋 Oyuncu odadan ayrıldı:', data.userId);
        setPlayers(data.players);
        // Eğer oda boşaldıysa oyunu bitir
        if (data.players.length === 0) {
          resetGame();
        }
      });

      newSocket.on('gameStarted', (data?: { isMidGame?: boolean }) => {
        console.log('🎮 Oyun başladı!', data);
        setGameStatus('playing');
        setIsAnswering(false);
        
        // Eğer oyun ortasında katıldıysa geri sayım yok
        if (data?.isMidGame) {
          console.log('🎮 Oyun ortasında katıldı, geri sayım atlanıyor');
          setShowGameStartCountdown(false);
          // Mid-game join'de soru zaten gönderilecek, sadece bekle
        } else {
          // Normal oyun başlangıcı - 5 saniyelik geri sayım
          setQuestionNumber(1);
          setShowGameStartCountdown(true);
          // Geri sayım bittiğinde soru gelene kadar loading gösterilecek
        }
      });

      newSocket.on('newQuestion', (data: { question: string; options: string[]; correctAnswer: string; questionNumber: number }) => {
        console.log('📝 Yeni soru alındı:', data.question, 'Soru #' + data.questionNumber);
        // Oyun başlangıç geri sayımını kapat (eğer hala açıksa)
        setShowGameStartCountdown(false);
        // Oyuncu cevaplarını temizle
        setPlayerAnswers([]);
        // 2 saniyelik geri sayım başlat (soru gösteriliyor, sadece overlay)
        setShowQuestionCountdown(true);
        setIsAnswering(false);
        
        // 2 saniye sonra soruyu göster
        setTimeout(() => {
          // Options'ı number array'e çevir
          const options = data.options.map(opt => parseInt(opt));
          setCurrentQuestion({
            question: data.question,
            correctAnswer: parseInt(data.correctAnswer),
            options: options,
          });
          setQuestionNumber(data.questionNumber);
          setShowQuestionCountdown(false);
          // Yeni soru geldiğinde answering state'ini sıfırla
          setIsAnswering(false);
        }, 2000);
      });

      // Diğer oyuncuların cevap seçimlerini dinle
      newSocket.on('playerAnswer', (data: { userId: string; answer: number }) => {
        console.log('👤 Oyuncu cevap seçti:', data);
        setPlayerAnswers(prev => {
          // Eğer bu oyuncu zaten bir cevap seçtiyse güncelle, yoksa ekle
          const existing = prev.find(pa => pa.userId === data.userId);
          if (existing) {
            return prev.map(pa => pa.userId === data.userId ? data : pa);
          }
          return [...prev, data];
        });
      });

      newSocket.on('answerResult', (data: { 
        correct: boolean; 
        players: Array<{ userId: string; score: number }>;
        nextQuestionNumber: number;
      }) => {
        setIsAnswering(true);
        // Players'ı güncelle (userId ile eşleştir)
        setPlayers(prev => prev.map(p => {
          const updated = data.players.find(d => d.userId === p.id);
          return updated ? { ...p, score: updated.score } : p;
        }));
        
        if (data.nextQuestionNumber > 10) {
          // Oyun bitti
          setTimeout(() => {
            setGameStatus('finished');
            const winnerPlayer = data.players.reduce((prev, current) => 
              prev.score > current.score ? prev : current
            );
            // Winner'ı players array'inden bul
            const winnerFromPlayers = players.find(p => p.id === winnerPlayer.userId);
            if (winnerFromPlayers) {
              setWinner(winnerFromPlayers);
            }
          }, 2000);
        } else {
          setQuestionNumber(data.nextQuestionNumber);
        }
      });

      // Skor güncellemesi
      newSocket.on('scoreUpdate', (data: { userId: string; newScore: number }) => {
        setPlayers(prev => prev.map(p => 
          p.id === data.userId ? { ...p, score: data.newScore } : p
        ));
      });

      // Oyun bitti
      newSocket.on('endGame', (data: { leaderboard: Array<{ userId: string; nickname: string; avatar: string; score: number }> }) => {
        setGameStatus('finished');
        const winnerFromLeaderboard = data.leaderboard[0];
        if (winnerFromLeaderboard) {
          setWinner({
            id: winnerFromLeaderboard.userId,
            nickname: winnerFromLeaderboard.nickname,
            avatar: winnerFromLeaderboard.avatar,
            score: winnerFromLeaderboard.score,
          });
        }
      });

      newSocket.on('error', (error: { message?: string } | string) => {
        console.error('Socket hatası:', error);
        const errorMessage = typeof error === 'string' ? error : error.message || 'Bir hata oluştu';
        alert(errorMessage);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);


  const setUser = async (userData: User, guestUserId?: string | null) => {
    try {
      // Kullanıcı bilgilerini kaydet
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUserState(userData);
      setAgeGroup(userData.ageGroup);
      
      // Eğer misafir kullanıcı ID'si verildiyse kaydet (sadece misafir kullanıcılar için)
      if (guestUserId && !isAuthenticated) {
        await AsyncStorage.setItem('guestUserId', guestUserId);
        setUserId(guestUserId);
      }
    } catch (error) {
      console.error('Kullanıcı bilgisi kaydedilemedi:', error);
      throw error;
    }
  };

  // Login fonksiyonu
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Giriş başarısız');
      }

      // Token ve kullanıcı bilgilerini kaydet
      const { token: authToken, user: backendUser } = data.data;
      
      await AsyncStorage.setItem('token', authToken);
      setToken(authToken);
      setIsAuthenticated(true);
      setUserId(backendUser.id);

      // Local user bilgisini de kaydet (nickname, avatar, ageGroup için)
      const userData: User = {
        nickname: backendUser.nickname,
        avatar: backendUser.avatar,
        ageGroup: backendUser.ageGroup || 'grade1', // Backend'den gelmiyorsa varsayılan
      };
      await setUser(userData);
    } catch (error) {
      console.error('Login hatası:', error);
      throw error;
    }
  };

  // Register fonksiyonu
  const register = async (email: string, password: string, nickname: string, avatar: string, ageGroupData: AgeGroup) => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          nickname,
          avatar,
          ageGroup: ageGroupData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Kayıt başarısız');
      }

      // Token ve kullanıcı bilgilerini kaydet
      const { token: authToken, user: backendUser } = data.data;
      
      await AsyncStorage.setItem('token', authToken);
      setToken(authToken);
      setIsAuthenticated(true);
      setUserId(backendUser.id);

      // Local user bilgisini kaydet
      const userData: User = {
        nickname: backendUser.nickname,
        avatar: backendUser.avatar,
        ageGroup: ageGroupData,
      };
      await setUser(userData);
    } catch (error) {
      console.error('Register hatası:', error);
      throw error;
    }
  };

  // Misafir kullanıcıyı kayıtlı kullanıcıya dönüştür
  const convertGuestToUser = async (email: string, password: string, nickname: string, avatar: string, ageGroupData: AgeGroup) => {
    let guestUserId = userId;

    // Eğer userId yoksa, önce backend'de bir misafir kullanıcı oluştur
    if (!guestUserId && user) {
      try {
        console.log('Misafir kullanıcı için backend kullanıcısı oluşturuluyor...');
        const createResponse = await fetch(`${SOCKET_URL}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nickname: user.nickname,
            avatar: user.avatar,
          }),
        });

        // Response tipini kontrol et
        const contentType = createResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await createResponse.text();
          console.error('Beklenmeyen response formatı:', text.substring(0, 200));
          throw new Error(`Sunucu hatası: ${createResponse.status} ${createResponse.statusText}`);
        }

        const createData = await createResponse.json();
        
        if (!createResponse.ok) {
          throw new Error(createData.message || `Misafir kullanıcı oluşturulamadı: ${createResponse.status}`);
        }

        if (!createData.data || !createData.data.id) {
          throw new Error('Kullanıcı oluşturuldu ancak ID alınamadı');
        }

        guestUserId = createData.data.id;
        setUserId(guestUserId);
        console.log('Misafir kullanıcı oluşturuldu:', guestUserId);
      } catch (error) {
        console.error('Misafir kullanıcı oluşturma hatası:', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Misafir kullanıcı oluşturulamadı. Lütfen tekrar deneyin.');
      }
    }

    if (!guestUserId) {
      throw new Error('Misafir kullanıcı ID bulunamadı. Lütfen uygulamayı yeniden başlatın.');
    }

    try {
      const response = await fetch(`${SOCKET_URL}/api/auth/convert-guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guestUserId: guestUserId,
          email,
          password,
          nickname,
          avatar,
          ageGroup: ageGroupData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Kayıt başarısız');
      }

      // Token ve kullanıcı bilgilerini kaydet
      const { token: authToken, user: backendUser } = data.data;
      
      await AsyncStorage.setItem('token', authToken);
      setToken(authToken);
      setIsAuthenticated(true);
      setUserId(backendUser.id);

      // Local user bilgisini kaydet
      const userData: User = {
        nickname: backendUser.nickname,
        avatar: backendUser.avatar,
        ageGroup: ageGroupData,
      };
      await setUser(userData);
    } catch (error) {
      console.error('Misafir kayıt hatası:', error);
      throw error;
    }
  };

  // Logout fonksiyonu
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('guestUserId'); // Misafir kullanıcı ID'sini de temizle
      setToken(null);
      setIsAuthenticated(false);
      setUserId(null);
      setUserState(null);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      resetGame();
    } catch (error) {
      console.error('Logout hatası:', error);
      throw error;
    }
  };

  const createRoom = async (difficultyLevel: number = 0) => {
    if (!socket || !user || !ageGroup || !userId) return;

    try {
      // API ile oda oluştur (token varsa header'a ekle)
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Zorluk seviyesi validasyonu (-1, 0, 1)
      const validDifficultyLevel = [-1, 0, 1].includes(difficultyLevel) ? difficultyLevel : 0;

      const response = await fetch(`${SOCKET_URL}/api/rooms`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          hostId: userId,
          ageGroup,
          difficultyLevel: validDifficultyLevel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Oda oluşturulamadı');
      }

      const data = await response.json();
      const roomCode = data.data.code;

      // Socket ile odaya bağlan
      socket.emit('joinRoom', {
        roomCode,
        userId: userId,
      });
    } catch (error) {
      console.error('Oda oluşturma hatası:', error);
      alert(error instanceof Error ? error.message : 'Oda oluşturulamadı');
    }
  };

  const joinRoom = async (roomCodeToJoin: string) => {
    console.log('🚪 joinRoom çağrıldı:', { roomCodeToJoin, socket: !!socket, userId, connected: socket?.connected });
    
    // Socket yoksa veya bağlı değilse yeniden bağlan
    if (!socket || !socket.connected) {
      console.log('⚠️ Socket bağlantısı yok, yeniden bağlanılıyor...');
      
      if (!user) {
        alert('Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }

      // Socket'i yeniden oluştur ve tüm event listener'ları kur
      // Bu işlem useEffect'teki socket kurulumunu tekrarlar
      // Socket bağlantısı useEffect'te otomatik kurulacak, burada sadece bekle
      alert('Socket bağlantısı kesildi. Lütfen sayfayı yenileyin.');
      return;
    }

    if (!userId) {
      console.error('❌ Kullanıcı ID bulunamadı');
      alert('Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    try {
      console.log('🚪 Odaya katılmaya çalışılıyor:', roomCodeToJoin, 'UserID:', userId);
      
      // Önce API ile odaya katılmayı dene (oda var mı kontrol et)
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('📡 API çağrısı yapılıyor:', `${SOCKET_URL}/api/rooms/join`);
      const response = await fetch(`${SOCKET_URL}/api/rooms/join`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          roomCode: roomCodeToJoin,
          userId: userId,
        }),
      });

      console.log('📡 API yanıtı:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Odaya katılamadı' }));
        console.error('❌ API hatası:', errorData);
        throw new Error(errorData.message || 'Odaya katılamadı');
      }

      const apiData = await response.json();
      console.log('✅ API başarılı:', apiData);

      // API başarılı, şimdi socket ile bağlan
      console.log('📡 Socket joinRoom event gönderiliyor...');
      socket.emit('joinRoom', {
        roomCode: roomCodeToJoin,
        userId: userId,
      });
      
      console.log('✅ Socket joinRoom event gönderildi');
    } catch (error) {
      console.error('❌ Odaya katılma hatası:', error);
      alert(error instanceof Error ? error.message : 'Odaya katılamadı');
      throw error;
    }
  };

  const submitAnswer = (answer: number) => {
    if (socket && currentQuestion && !isAnswering && roomId && userId) {
      setIsAnswering(true);
      
      // Önce diğer oyunculara cevap seçimini bildir (görsel feedback için)
      socket.emit('playerAnswer', {
        roomCode: roomId,
        userId: userId,
        answer: answer,
      });
      
      // Sonra gerçek cevabı gönder
      socket.emit('sendAnswer', {
        roomCode: roomId,
        userId: userId,
        answer: answer.toString(),
      });
    }
  };

  const resetGame = () => {
    setRoomId(null);
    setPlayers([]);
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setGameStatus('idle');
    setWinner(null);
    setIsAnswering(false);
    setShowGameStartCountdown(false);
    setShowQuestionCountdown(false);
    setPlayerAnswers([]);
    if (socket) {
      socket.emit('leaveRoom');
    }
  };

  // Aynı odada oyunu yeniden başlat
  const restartGame = () => {
    if (!socket || !roomId) {
      console.warn('⚠️ Oyun yeniden başlatılamadı: socket veya roomId yok');
      return;
    }

    // Oyun durumunu sıfırla (ama odadan ayrılma)
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setGameStatus('waiting');
    setWinner(null);
    setIsAnswering(false);
    setShowGameStartCountdown(false);
    setShowQuestionCountdown(false);
    setPlayerAnswers([]);
    
    // Skorları sıfırla (sadece local state)
    setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));

    // Backend'e oyunu yeniden başlat komutu gönder
    console.log('🔄 Oyun yeniden başlatılıyor:', roomId);
    socket.emit('startGame', { roomCode: roomId });
  };

  // Tüm storage'ı temizle ve uygulamayı sıfırla
  const clearAllData = async () => {
    try {
      await AsyncStorage.clear();
      setUserState(null);
      setUserId(null);
      setToken(null);
      setIsAuthenticated(false);
      setRoomId(null);
      setPlayers([]);
      setCurrentQuestion(null);
      setQuestionNumber(0);
      setGameStatus('idle');
      setWinner(null);
      setIsAnswering(false);
      setAgeGroup(null);
      setShowGameStartCountdown(false);
      setShowQuestionCountdown(false);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      console.log('✅ Tüm veriler temizlendi');
    } catch (error) {
      console.error('❌ Veri temizleme hatası:', error);
      throw error;
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    resetGame();
  };

  return (
    <GameContext.Provider
      value={{
        user,
        userId,
        token,
        isAuthenticated,
        socket,
        roomId,
        players,
        currentQuestion,
        questionNumber,
        gameStatus,
        winner,
        isAnswering,
        ageGroup,
        showGameStartCountdown,
        setShowGameStartCountdown,
        showQuestionCountdown,
        setShowQuestionCountdown,
        playerAnswers,
        isLoadingUser,
        setUser,
        login,
        register,
        convertGuestToUser,
        logout,
        createRoom,
        joinRoom,
        submitAnswer,
        resetGame,
        restartGame,
        disconnect,
        clearAllData,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

