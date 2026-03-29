# Uygulama Görselleri

Store'a (App Store / Play Store) gönderirken özel ikon ve splash eklemek için:

- **icon.png**: 1024x1024 px - Uygulama ikonu
- **adaptive-icon.png**: 1024x1024 px - Android adaptive icon (foreground)
- **splash.png**: Örn. 1284x2778 px - Açılış ekranı görseli

Bu dosyaları ekledikten sonra `app.json`'da ilgili path'leri tanımlayın:

```json
"icon": "./assets/icon.png",
"splash": {
  "image": "./assets/splash.png",
  "backgroundColor": "#4CAF50",
  "resizeMode": "contain"
},
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#4CAF50"
  }
}
```
