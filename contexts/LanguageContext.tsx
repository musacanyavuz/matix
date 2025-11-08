import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tr from '../locales/tr.json';
import en from '../locales/en.json';

type Language = 'tr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, any> = {
  tr,
  en,
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('tr');
  const [isLoading, setIsLoading] = useState(true);
  const [updateKey, setUpdateKey] = useState(0); // Dil değişikliğinde component'leri yenilemek için

  // AsyncStorage'den dil tercihini yükle
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('app_language');
        if (savedLanguage && (savedLanguage === 'tr' || savedLanguage === 'en')) {
          setLanguageState(savedLanguage as Language);
        }
      } catch (error) {
        console.error('Dil yükleme hatası:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  // Dil değiştirme fonksiyonu
  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('app_language', lang);
      setLanguageState(lang);
      // Dil değiştiğinde tüm component'leri yenilemek için key'i güncelle
      setUpdateKey(prev => prev + 1);
    } catch (error) {
      console.error('Dil kaydetme hatası:', error);
    }
  };

  // Çeviri fonksiyonu (nested key desteği: "welcome.title" -> translations[language].welcome.title)
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Eğer çeviri bulunamazsa, key'i döndür
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  };

  if (isLoading) {
    return null; // veya bir loading spinner göster
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }} key={updateKey}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

