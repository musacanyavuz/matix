import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  arrayUnion,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { AgeGroup } from '../constants/ageGroups';

// Tip tanımlamaları
export interface User {
  id?: string;
  nickname: string;
  avatar: string;
  ageGroup: AgeGroup;
  password?: string; // Basitlik için client-side auth
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
  userId: string | null;
  isAuthenticated: boolean;
  roomId: string | null;
  roomCode: string | null;
  players: Player[];
  currentQuestion: Question | null;
  questionNumber: number;
  gameStatus: 'waiting' | 'playing' | 'finished' | 'idle';
  winner: Player | null;
  isAnswering: boolean;
  ageGroup: AgeGroup | null;
  playerAnswers: Array<{ userId: string; answer: number }>;
  isHost: boolean;
}

interface GameContextType extends GameState {
  showGameStartCountdown: boolean;
  setShowGameStartCountdown: (show: boolean) => void;
  showQuestionCountdown: boolean;
  setShowQuestionCountdown: (show: boolean) => void;
  isLoadingUser: boolean;
  setUser: (user: User) => Promise<void>;
  login: (nickname: string, password: string) => Promise<void>;
  register: (password: string, nickname: string, avatar: string, ageGroup: AgeGroup) => Promise<void>;
  logout: () => Promise<void>;
  createRoom: (difficultyLevel?: number) => Promise<void>;
  joinRoom: (roomCode: string) => Promise<void>;
  startGame: () => Promise<void>;
  submitAnswer: (answer: number) => Promise<void>;
  resetGame: () => void;
  leaveRoom: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
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
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isHost, setIsHost] = useState(false);

  // Kullanıcıyı yükle
  useEffect(() => {
    loadUser();
  }, []);

  // Oda dinleyicisi
  useEffect(() => {
    if (!roomId) return;

    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();

        // Oyuncuları güncelle
        if (data.players) {
          setPlayers(data.players);
        }

        // Oyun durumu güncelle
        if (data.status && data.status !== gameStatus) {
          setGameStatus(data.status);
          if (data.status === 'playing' && gameStatus === 'waiting') {
            setShowGameStartCountdown(true);
          }
        }

        // Soru güncelle
        if (data.currentQuestion &&
          (!currentQuestion || data.currentQuestion.question !== currentQuestion.question)) {

          // Yeni soru geldi
          setShowGameStartCountdown(false);
          setShowQuestionCountdown(true);
          setPlayerAnswers([]);
          setIsAnswering(false);

          setTimeout(() => {
            setCurrentQuestion(data.currentQuestion);
            setQuestionNumber(data.questionNumber || 1);
            setShowQuestionCountdown(false);
          }, 2000);
        }

        // Cevapları güncelle
        if (data.playerAnswers) {
          setPlayerAnswers(data.playerAnswers);
        }

        // Kazananı güncelle
        if (data.winner) {
          setWinner(data.winner);
        }
      } else {
        // Oda silinmiş veya kapatılmış
        Alert.alert('Oda Kapatıldı', 'Oda kurucu tarafından kapatıldı veya silindi.');
        resetGame();
      }
    });

    return () => unsubscribe();
  }, [roomId, gameStatus, currentQuestion]);

  const loadUser = async () => {
    setIsLoadingUser(true);
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const userData = JSON.parse(userJson);
        setUserState(userData);
        setUserId(userData.id);
        setAgeGroup(userData.ageGroup);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Kullanıcı yüklenemedi:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const login = async (nickname: string, password: string) => {
    try {
      const q = query(collection(db, 'users'), where('nickname', '==', nickname));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Kullanıcı bulunamadı');
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as User;

      if (userData.password !== password) {
        throw new Error('Hatalı şifre');
      }

      const fullUser = { ...userData, id: userDoc.id };
      await AsyncStorage.setItem('user', JSON.stringify(fullUser));
      setUserState(fullUser);
      setUserId(userDoc.id);
      setAgeGroup(userData.ageGroup);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login hatası:', error);
      throw error;
    }
  };

  const register = async (password: string, nickname: string, avatar: string, ageGroupData: AgeGroup) => {
    try {
      // Nickname kontrolü
      const q = query(collection(db, 'users'), where('nickname', '==', nickname));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        throw new Error('Bu kullanıcı adı zaten alınmış');
      }

      const newUser: User = {
        nickname,
        password, // Not secure, but serverless requirement
        avatar,
        ageGroup: ageGroupData
      };

      const docRef = await addDoc(collection(db, 'users'), newUser);
      const fullUser = { ...newUser, id: docRef.id };

      await AsyncStorage.setItem('user', JSON.stringify(fullUser));
      setUserState(fullUser);
      setUserId(docRef.id);
      setAgeGroup(ageGroupData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Register hatası:', error);
      throw error;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('user');
    setUserState(null);
    setUserId(null);
    setIsAuthenticated(false);
    resetGame();
  };

  const createRoom = async (difficultyLevel: number = 0) => {
    if (!user || !userId) return;

    try {
      // 6 haneli rastgele kod
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const newRoom = {
        code,
        hostId: userId,
        status: 'waiting',
        ageGroup: user.ageGroup,
        difficultyLevel,
        createdAt: serverTimestamp(),
        players: [{
          id: userId,
          nickname: user.nickname,
          avatar: user.avatar,
          score: 0
        }]
      };

      const docRef = await addDoc(collection(db, 'rooms'), newRoom);

      setRoomId(docRef.id);
      setRoomCode(code);
      setIsHost(true);
      setGameStatus('waiting');
      setPlayers(newRoom.players);
    } catch (error) {
      console.error('Oda oluşturma hatası:', error);
      throw error;
    }
  };

  const joinRoom = async (code: string) => {
    if (!user || !userId) return;

    try {
      const q = query(collection(db, 'rooms'), where('code', '==', code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Oda bulunamadı');
      }

      const roomDoc = querySnapshot.docs[0];
      const roomData = roomDoc.data();

      if (roomData.status !== 'waiting') {
        throw new Error('Oyun zaten başlamış');
      }

      const newPlayer = {
        id: userId,
        nickname: user.nickname,
        avatar: user.avatar,
        score: 0
      };

      await updateDoc(doc(db, 'rooms', roomDoc.id), {
        players: arrayUnion(newPlayer)
      });

      setRoomId(roomDoc.id);
      setRoomCode(code);
      setIsHost(false);
      setGameStatus('waiting');
    } catch (error) {
      console.error('Odaya katılma hatası:', error);
      throw error;
    }
  };

  const startGame = async () => {
    if (!roomId || !isHost) return;

    try {
      // İlk soruyu oluştur (Basit bir örnek)
      const q1 = generateQuestion();

      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'playing',
        currentQuestion: q1,
        questionNumber: 1,
        playerAnswers: []
      });
    } catch (error) {
      console.error('Oyun başlatma hatası:', error);
    }
  };

  const generateQuestion = (): Question => {
    // Basit toplama işlemi (Geliştirilebilir)
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    const ans = n1 + n2;

    // Yanlış şıklar
    const options = [ans];
    while (options.length < 4) {
      const wrong = ans + Math.floor(Math.random() * 5) - 2;
      if (wrong > 0 && !options.includes(wrong)) {
        options.push(wrong);
      }
    }

    return {
      question: `${n1} + ${n2} = ?`,
      correctAnswer: ans,
      options: options.sort(() => Math.random() - 0.5)
    };
  };

  const submitAnswer = async (answer: number) => {
    if (!roomId || !userId || !currentQuestion) return;

    try {
      const isCorrect = answer === currentQuestion.correctAnswer;
      const points = isCorrect ? 10 : 0;

      // Cevabı kaydet
      await updateDoc(doc(db, 'rooms', roomId), {
        playerAnswers: arrayUnion({ userId, answer })
      });

      // Skoru güncelle (Bu kısım biraz karmaşık, tüm players array'ini güncellemek gerekebilir)
      // Firestore'da array içindeki objeyi güncellemek zordur.
      // Basitlik için: Tüm players listesini al, güncelle ve geri yaz.
      // Not: Race condition riski var ama basit oyun için kabul edilebilir.

      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const data = roomSnap.data();
        const updatedPlayers = data.players.map((p: Player) => {
          if (p.id === userId) {
            return { ...p, score: p.score + points };
          }
          return p;
        });

        await updateDoc(roomRef, { players: updatedPlayers });

        // Eğer herkes cevapladıysa veya süre bittiyse yeni soruya geç (Host kontrolünde)
        if (isHost) {
          checkNextQuestion(updatedPlayers, data.playerAnswers ? [...data.playerAnswers, { userId, answer }] : [{ userId, answer }]);
        }
      }

    } catch (error) {
      console.error('Cevap gönderme hatası:', error);
    }
  };

  const checkNextQuestion = async (currentPlayers: Player[], currentAnswers: any[]) => {
    if (!roomId) return;
    // Herkes cevapladı mı?
    if (currentAnswers.length >= currentPlayers.length) {
      // 2 saniye bekle sonra yeni soru
      setTimeout(async () => {
        const nextQ = generateQuestion();
        await updateDoc(doc(db, 'rooms', roomId), {
          currentQuestion: nextQ,
          questionNumber: increment(1),
          playerAnswers: []
        });
      }, 2000);
    }
  }

  const leaveRoom = async () => {
    if (!roomId || !userId) return;

    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        const updatedPlayers = roomData.players.filter((p: Player) => p.id !== userId);

        if (updatedPlayers.length === 0) {
          // Oda boşaldıysa sil
          await setDoc(roomRef, { status: 'closed' }, { merge: true }); // Soft delete
          // await deleteDoc(roomRef); // Hard delete
        } else {
          await updateDoc(roomRef, { players: updatedPlayers });
        }
      }
      resetGame();
    } catch (error) {
      console.error('Odadan ayrılma hatası:', error);
    }
  };

  const resetGame = () => {
    setRoomId(null);
    setRoomCode(null);
    setPlayers([]);
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setGameStatus('idle');
    setWinner(null);
    setIsAnswering(false);
    setShowGameStartCountdown(false);
    setShowQuestionCountdown(false);
    setPlayerAnswers([]);
    setIsHost(false);
  };

  const setUser = async (userData: User) => {
    setUserState(userData);
  }

  return (
    <GameContext.Provider
      value={{
        user,
        userId,
        isAuthenticated,
        roomId,
        roomCode,
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
        isHost,
        setUser,
        login,
        register,
        logout,
        createRoom,
        joinRoom,
        startGame,
        submitAnswer,
        resetGame,
        leaveRoom
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
