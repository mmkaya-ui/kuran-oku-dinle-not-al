# 🧪 PWA Test Rehberi

## Otomatik Test

URL'ye `#test` ekleyerek test panelini açın:
```
https://your-domain.com/#test
```

## Manuel Test Checklist

### iOS Safari (PWA Modu)

#### 📱 Scroll & Freeze
- [ ] Kuran moduna gir, scroll yap
- [ ] Lockscreen'e git (power button)
- [ ] 30 saniye bekle, geri dön
- [ ] Scroll çalışıyor mu? Freeze var mı?
- [ ] Pull-to-refresh çalışıyor mu?

#### 🎵 Background Audio
- [ ] Ayet oynat
- [ ] Home button'a bas (app background'a gitsin)
- [ ] Ses çalmaya devam ediyor mu?
- [ ] Lockscreen'de media kontroller görünüyor mu?
- [ ] Next/Prev butonları çalışıyor mu?

#### 🔒 Screen Lock
- [ ] Ayet oynatırken ekran kapanmasını bekle (2dk)
- [ ] Ekran açık kalıyor mu? (iOS native audio wake)

### Android Chrome (PWA Modu)

#### 🎵 Background Audio
- [ ] Ayet oynat
- [ ] Başka app'e geç
- [ ] Ses çalmaya devam ediyor mu?
- [ ] Notification bar'da media kontroller var mı?

#### 🔒 Screen Lock (Wake Lock)
- [ ] Ayet oynat
- [ ] 5 dakika bekle
- [ ] Ekran açık kalıyor mu? (Wake Lock API)

### Cache & Offline

#### 💾 Service Worker Cache
- [ ] Online modda birkaç sure yükle
- [ ] Network'i kapat (Airplane mode)
- [ ] Önceden yüklenen sureler çalışıyor mu?
- [ ] Audio cache'ten çalıyor mu?

#### 💾 localStorage Quota
- [ ] 20+ playlist oluştur
- [ ] Her playlist'e 50+ ayet ekle
- [ ] Quota exceeded hatası var mı?
- [ ] Otomatik temizlik çalışıyor mu?

### Audio Error Recovery

#### 🔄 Network Drop Simülasyonu
1. Ayet oynat
2. Network'i kapat (WiFi/Cellular)
3. Bekle → Retry mekanizması çalışmalı (3 deneme)
4. Toast mesajı gösterilmeli

### UI Tutarlılığı

#### 🎨 Dark Mode
- [ ] Tüm border renkleri tutarlı mı? (neutral-800/700)
- [ ] Card'lar doğru render ediliyor mu?
- [ ] Text contrast yeterli mi?

#### 📐 Responsive
- [ ] iPhone SE (375px) - layout bozukluğu var mı?
- [ ] iPad (768px) - tablet optimizasyonu çalışıyor mu?
- [ ] Desktop (1024px+) - desktop layout doğru mu?

### Edge Cases

#### 🔴 Stres Test
1. Çok hızlı next/prev basma (10x saniyede)
2. Son surenin son ayetine git
3. "All" repeat mode'da loop test
4. Playlist boşken play butonu

#### 🔴 Data Edge Cases
- [ ] Boş search query
- [ ] 1 harf search ("a")
- [ ] Olmayan sure numarası (999)
- [ ] Geçersiz ayet numarası

## Edge Case Simülasyon Script

Browser console'a yapıştırın:

```javascript
// 1. Rapid click test
(function rapidClickTest() {
    let count = 0;
    const interval = setInterval(() => {
        document.querySelector('[aria-label="Sonraki ayet"]')?.click();
        if (++count > 20) clearInterval(interval);
    }, 100);
})();

// 2. Memory pressure simülasyonu
(function memoryPressure() {
    const bigArrays = [];
    for (let i = 0; i < 100; i++) {
        bigArrays.push(new Array(100000).fill('x'));
    }
    console.log('Memory pressure applied:', bigArrays.length);
    setTimeout(() => console.log('Arrays kept for 5s'), 5000);
})();

// 3. Network throttling simülasyonu
(function slowNetwork() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        return new Promise(resolve => {
            setTimeout(() => resolve(originalFetch.apply(this, args)), 2000);
        });
    };
    console.log('Network throttled to 2s delay');
})();

// 4. localStorage quota test
(function quotaTest() {
    let size = 0;
    const key = '__quota_test_';
    try {
        while (true) {
            localStorage.setItem(key + size, 'x'.repeat(10000));
            size += 10000;
        }
    } catch (e) {
        console.log('Quota exceeded at:', (size / 1024 / 1024).toFixed(2), 'MB');
        // Cleanup
        for (let i = 0; i < size; i += 10000) {
            localStorage.removeItem(key + i);
        }
    }
})();
```

## Performans Testleri

### FPS & Scroll
```javascript
// FPS ölçümü
let lastTime = performance.now();
let frames = 0;
function measureFPS() {
    frames++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
        console.log('FPS:', frames);
        frames = 0;
        lastTime = now;
    }
    requestAnimationFrame(measureFPS);
}
measureFPS();

// Scroll jank detection
let lastScrollY = window.scrollY;
let jankCount = 0;
window.addEventListener('scroll', () => {
    const now = performance.now();
    const delta = now - (window.lastScrollTime || now);
    if (delta > 32) { // > 30fps threshold
        jankCount++;
        console.log('Scroll jank detected:', jankCount);
    }
    window.lastScrollTime = now;
}, { passive: true });
```

## Bug Report Template

```
**Platform:** iOS 17.x / Android 14 / Chrome Desktop
**Browser:** Safari / Chrome / Firefox
**Test Senaryosu:** [Test adı]
**Beklenen:** [Ne olmalı]
**Gerçekleşen:** [Ne oldu]
**Konsol Hatası:** [Varsa]
**Ekran Kaydı:** [Varsa link]
```
