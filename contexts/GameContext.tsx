import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { AgeGroup } from '../constants/ageGroups';
import { API_BASE_URL } from '../constants/config';

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
  adventureMode: boolean; // Macera modu mu?
  chapterProgressed: boolean; // Bölüm ilerledi mi?
  nextChapter: number | null; // Sonraki bölüm numarası
}

interface GameContextType extends GameState {
  showGameStartCountdown: boolean;
  setShowGameStartCountdown: (show: boolean) => void;
  showQuestionCountdown: boolean;
  setShowQuestionCountdown: (show: boolean) => void;
  isLoadingUser: boolean;
  setUser: (user: User, guestUserId?: string | null) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (password: string, nickname: string, avatar: string, ageGroup: AgeGroup) => Promise<void>;
  convertGuestToUser: (password: string, nickname: string, avatar: string, ageGroup: AgeGroup) => Promise<void>;
  logout: () => Promise<void>;
  createRoom: (difficultyLevel?: number, adventureMode?: boolean, chapter?: number) => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  submitAnswer: (answer: number) => void;
  resetGame: () => void;
  restartGame: () => void;
  disconnect: () => void;
  // Friend functions
  sendFriendRequest: (receiverNickname: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  rejectFriendRequest: (friendshipId: string) => Promise<void>;
  getFriends: () => Promise<Array<{ id: string; nickname: string; avatar: string; totalScore: number; isOnline: boolean; currentGame: { roomCode: string; roomId: string } | null }>>;
  getPendingRequests: () => Promise<Array<{ id: string; requester: { id: string; nickname: string; avatar: string } | null; createdAt: any }>>;
  searchUsers: (query: string) => Promise<Array<{ id: string; nickname: string; avatar: string }>>;
  removeFriend: (friendId: string) => Promise<void>;
  // Room invitation functions
  inviteFriendToRoom: (friendId: string, roomId: string) => Promise<void>;
  getPendingRoomInvitations: () => Promise<Array<{ id: string; roomCode: string; inviter: { id: string; nickname: string; avatar: string } }>>;
  acceptRoomInvitation: (invitationId: string) => Promise<void>;
  rejectRoomInvitation: (invitationId: string) => Promise<void>;
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
  const [adventureMode, setAdventureMode] = useState(false); // Macera modu mu?
  const [chapterProgressed, setChapterProgressed] = useState(false); // Bölüm ilerledi mi?
  const [nextChapter, setNextChapter] = useState<number | null>(null); // Sonraki bölüm numarası

  /**
   * Auth state'ini temizle
   */
  const clearAuthState = async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
    setUserId(null);
  };

  /**
   * Token'ı doğrula ve kullanıcı bilgisini yükle
   */
  const verifyAndLoadUser = async (tokenToVerify: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.user) {
          const backendUser = data.data.user;
          
          // State'leri güncelle
          setToken(tokenToVerify);
          setIsAuthenticated(true);
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
          
          return true;
        }
      }
      
      // Token geçersiz
      return false;
    } catch (error) {
      console.error('Token doğrulama hatası:', error);
      return false;
    }
  };

  const loadUser = async () => {
    setIsLoadingUser(true);
    try {
      // Önce token'ı kontrol et
      const savedToken = await AsyncStorage.getItem('token');
      
      if (savedToken) {
        // Token varsa doğrula
        const isValid = await verifyAndLoadUser(savedToken);
        
        if (!isValid) {
          // Token geçersizse temizle
          await clearAuthState();
          
          // Misafir kullanıcı bilgilerini yükle
          await loadGuestUser();
        }
      } else {
        // Token yoksa misafir kullanıcı bilgilerini yükle
        await loadGuestUser();
      }
    } catch (error) {
      console.error('Kullanıcı bilgisi yüklenemedi:', error);
      // Hata durumunda auth state'ini temizle
      await clearAuthState();
      await loadGuestUser();
    } finally {
      setIsLoadingUser(false);
    }
  };

  /**
   * Misafir kullanıcı bilgilerini yükle
   */
  const loadGuestUser = async () => {
    try {
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
      }
      
      setIsAuthenticated(false);
      setToken(null);
    } catch (error) {
      console.error('Misafir kullanıcı bilgisi yüklenemedi:', error);
    }
  };

  // Uygulama başladığında kullanıcı bilgisini yükle
  useEffect(() => {
    loadUser();
  }, []);

  // Socket bağlantısını kur (user veya token değiştiğinde yeniden bağlan)
  useEffect(() => {
    if (user) {
      const newSocket = io(API_BASE_URL, {
        transports: ['websocket', 'polling'], // WebSocket başarısız olursa polling'e geç
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity, // Sonsuz yeniden bağlanma denemesi
        timeout: 60000, // Bağlantı timeout'u (60 saniye)
        forceNew: false, // Mevcut bağlantıyı yeniden kullan
        upgrade: true, // Polling'den WebSocket'e otomatik yükseltme
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket bağlandı:', newSocket.id);
        // Kullanıcı bilgisini sunucuya gönder (token varsa ekle)
        // Token'ı closure'dan al, state'ten değil (güncel değeri almak için)
        const currentToken = token;
        newSocket.emit('register', {
          nickname: user.nickname,
          avatar: user.avatar,
          ageGroup: user.ageGroup,
          token: currentToken || undefined, // Token varsa gönder
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

      newSocket.on('disconnect', (reason) => {
        console.log('Socket bağlantısı kesildi, sebep:', reason);
        // Otomatik yeniden bağlanma zaten aktif (reconnection: true)
      });

      // Socket hata event'leri
      newSocket.on('error', (error: { message: string }) => {
        console.error('❌ Socket hatası:', error);
        alert(error.message || 'Bağlantı hatası');
      });

      // Socket bağlantı durumu
      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket bağlantı hatası:', error);
        console.error('❌ Bağlantı hatası, API URL:', API_BASE_URL);
        // Alert'i kaldırdık, sadece log
        // alert('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
      });

      newSocket.on('roomCreated', (data: { roomId: string }) => {
        setRoomId(data.roomId);
        setGameStatus('waiting');
      });

      newSocket.on('roomJoined', (data: { roomCode: string; players: Player[] }) => {
        console.log('✅ roomJoined event alındı:', data);
        console.log('📝 roomId güncelleniyor:', data.roomCode);
        setRoomId(data.roomCode);
        setPlayers(data.players);
        setGameStatus('waiting');
        console.log('✅ roomId ve players güncellendi, gameStatus: waiting');
        // Oyun başlamak üzere - Game ekranına yönlendirilecek (App.tsx'teki NavigationHandler)
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

      // Oyun daveti
      newSocket.on('roomInvitation', (data: { 
        invitationId: string;
        roomCode: string;
        inviter: { id: string; nickname: string };
      }) => {
        console.log('📬 Oda daveti alındı:', data);
        // Frontend'de bildirim gösterilebilir
        Alert.alert(
          'Oyun Daveti',
          `${data.inviter.nickname} sizi oyuna davet ediyor!`,
          [
            { text: 'Reddet', style: 'cancel', onPress: () => {
              if (newSocket) {
                newSocket.emit('rejectRoomInvitation', { invitationId: data.invitationId });
              }
            }},
            { text: 'Kabul Et', onPress: () => {
              if (newSocket) {
                // Socket event ile davet kabul et
                newSocket.emit('acceptRoomInvitation', { invitationId: data.invitationId });
              }
            }},
          ]
        );
      });

      newSocket.on('endGame', (data: { 
        leaderboard: Array<{ userId: string; nickname: string; avatar: string; score: number }>;
        adventureMode?: boolean;
        chapterProgressed?: boolean;
        newChapter?: number;
      }) => {
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
        
        // Macera modu bölüm ilerlemesi
        if (data.adventureMode && data.chapterProgressed && data.newChapter) {
          console.log(`🎉 Macera modu: Bölüm ${data.newChapter - 1} tamamlandı! Yeni bölüm: ${data.newChapter}`);
          setChapterProgressed(true);
          setNextChapter(data.newChapter);
          // AdventureMapScreen'e focus olduğunda ilerleme otomatik yenilenecek
        } else {
          setChapterProgressed(false);
          setNextChapter(null);
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
  }, [user, token]); // user veya token değiştiğinde socket'i yeniden bağla


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
  const login = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
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
  const register = async (password: string, nickname: string, avatar: string, ageGroupData: AgeGroup) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
  const convertGuestToUser = async (password: string, nickname: string, avatar: string, ageGroupData: AgeGroup) => {
    let guestUserId = userId;

    // Eğer userId yoksa, önce backend'de bir misafir kullanıcı oluştur
    if (!guestUserId && user) {
      try {
        console.log('Misafir kullanıcı için backend kullanıcısı oluşturuluyor...');
        const createResponse = await fetch(`${API_BASE_URL}/api/users`, {
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
      const response = await fetch(`${API_BASE_URL}/api/auth/convert-guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guestUserId: guestUserId,
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
      // Auth state'ini temizle
      await clearAuthState();
      
      // User state'ini temizle
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('guestUserId');
      setUserState(null);
      setAgeGroup(null);
      
      // Socket'i kapat
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      
      // Oyun state'ini sıfırla
      resetGame();
    } catch (error) {
      console.error('Logout hatası:', error);
      throw error;
    }
  };

  const createRoom = async (difficultyLevel: number = 0, adventureMode: boolean = false, chapter: number = 1) => {
    if (!socket || !user || !ageGroup || !userId) return;

    try {
      // Adventure mode'u set et
      setAdventureMode(adventureMode);
      
      // API ile oda oluştur (token varsa header'a ekle)
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Zorluk seviyesi validasyonu (-1, 0, 1)
      const validDifficultyLevel = [-1, 0, 1].includes(difficultyLevel) ? difficultyLevel : 0;

      const response = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          hostId: userId,
          ageGroup,
          difficultyLevel: validDifficultyLevel,
          adventureMode: adventureMode,
          chapter: adventureMode ? chapter : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Oda oluşturulamadı');
      }

      const data = await response.json();
      const roomCode = data.data.code;

      console.log('✅ Oda oluşturuldu, roomCode:', roomCode);
      console.log('🔌 Socket durumu:', socket.connected ? 'Bağlı' : 'Bağlı değil');

      // Socket bağlı değilse bekle
      if (!socket.connected) {
        console.log('⚠️ Socket bağlı değil, bağlantı bekleniyor...');
        socket.once('connect', () => {
          console.log('✅ Socket bağlandı, joinRoom gönderiliyor');
          socket.emit('joinRoom', {
            roomCode,
            userId: userId,
          });
        });
      } else {
        // Socket ile odaya bağlan
        console.log('📤 joinRoom event gönderiliyor:', { roomCode, userId });
        socket.emit('joinRoom', {
          roomCode,
          userId: userId,
        });
      }
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

      console.log('📡 API çağrısı yapılıyor:', `${API_BASE_URL}/api/rooms/join`);
      const response = await fetch(`${API_BASE_URL}/api/rooms/join`, {
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
    setAdventureMode(false);
    setChapterProgressed(false);
    setNextChapter(null);
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

  /**
   * API isteği yap ve 401 hatası durumunda token'ı temizle
   */
  const makeAuthenticatedRequest = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    if (!isAuthenticated || !token || !userId) {
      throw new Error('Giriş yapmanız gerekiyor');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    // 401 Unauthorized - Token geçersiz
    if (response.status === 401) {
      console.warn('Token geçersiz, auth state temizleniyor');
      await clearAuthState();
      throw new Error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
    }

    return response;
  };

  // Friend API functions
  const sendFriendRequest = async (receiverNickname: string) => {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/friends/request`, {
      method: 'POST',
      body: JSON.stringify({ receiverNickname }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Arkadaşlık isteği gönderilemedi');
    }

    return await response.json();
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/friends/accept`, {
      method: 'POST',
      body: JSON.stringify({ friendshipId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Arkadaşlık isteği kabul edilemedi');
    }

    return await response.json();
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/friends/reject`, {
      method: 'POST',
      body: JSON.stringify({ friendshipId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Arkadaşlık isteği reddedilemedi');
    }

    return await response.json();
  };

  const getFriends = async () => {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/friends`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Arkadaş listesi alınamadı');
    }

    const data = await response.json();
    return data.data || [];
  };

  const getPendingRequests = async () => {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/friends/pending`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Bekleyen istekler alınamadı');
    }

    const data = await response.json();
    return data.data || [];
  };

  const searchUsers = async (query: string) => {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/friends/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Kullanıcılar aranamadı');
    }

    const data = await response.json();
    return data.data || [];
  };

  const removeFriend = async (friendId: string) => {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/friends/${friendId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Arkadaş kaldırılamadı');
    }

    return await response.json();
  };

  // Room invitation API functions
  const inviteFriendToRoom = async (friendId: string, roomId: string) => {
    if (!isAuthenticated || !token || !userId) {
      throw new Error('Giriş yapmanız gerekiyor');
    }

    if (!socket) {
      throw new Error('Socket bağlantısı yok');
    }

    // Socket event ile davet gönder
    return new Promise((resolve, reject) => {
      socket.emit('inviteFriendToRoom', { friendId, roomId });
      
      socket.once('invitationSent', (data) => {
        resolve(data);
      });
      
      socket.once('error', (error) => {
        reject(new Error(error.message || 'Davet gönderilemedi'));
      });
    });
  };

  const getPendingRoomInvitations = async () => {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/rooms/pending-invitations`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Bekleyen davetler alınamadı');
    }

    const data = await response.json();
    return data.data || [];
  };

  const acceptRoomInvitation = async (invitationId: string) => {
    if (!isAuthenticated || !token || !userId) {
      throw new Error('Giriş yapmanız gerekiyor');
    }

    if (!socket) {
      throw new Error('Socket bağlantısı yok');
    }

    // Socket event ile davet kabul et
    return new Promise((resolve, reject) => {
      socket.emit('acceptRoomInvitation', { invitationId });
      
      socket.once('roomJoined', (data) => {
        resolve(data);
      });
      
      socket.once('error', (error) => {
        reject(new Error(error.message || 'Davet kabul edilemedi'));
      });
    });
  };

  const rejectRoomInvitation = async (invitationId: string) => {
    if (!isAuthenticated || !token || !userId) {
      throw new Error('Giriş yapmanız gerekiyor');
    }

    if (!socket) {
      throw new Error('Socket bağlantısı yok');
    }

    // Socket event ile davet reddet
    return new Promise((resolve, reject) => {
      socket.emit('rejectRoomInvitation', { invitationId });
      
      socket.once('invitationRejected', (data) => {
        resolve(data);
      });
      
      socket.once('error', (error) => {
        reject(new Error(error.message || 'Davet reddedilemedi'));
      });
    });
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
        adventureMode,
        chapterProgressed,
        nextChapter,
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
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        getFriends,
        getPendingRequests,
        searchUsers,
        removeFriend,
        inviteFriendToRoom,
        getPendingRoomInvitations,
        acceptRoomInvitation,
        rejectRoomInvitation,
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

