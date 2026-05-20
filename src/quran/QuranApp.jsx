/* eslint-disable */
// Quran App — extracted from inline <script type="text/babel">
// Phase 1: Vite build (Babel removed). Refactors (ErrorBoundary, storage) layered in subsequent files.
import React, { useState, useEffect, useRef, useContext, createContext, useMemo, useCallback } from "react";
import ReactDOM from "react-dom/client";
import DOMPurify from "dompurify";
import { bigCache, playlists as dbPlaylists, notes as dbNotes, migrateFromLocalStorage } from "../lib/storage.js";

        // Debounce hook for dynamic search
        const useDebounce = (value, delay) => {
            const [debounced, setDebounced] = useState(value);
            useEffect(() => {
                const timer = setTimeout(() => setDebounced(value), delay);
                return () => clearTimeout(timer);
            }, [value, delay]);
            return debounced;
        };

        // Safe localStorage with quota protection and full error isolation
        const safeStorage = {
            setItem: (key, value) => {
                try {
                    localStorage.setItem(key, value);
                    return true;
                } catch (e) {
                    if (e.name === 'QuotaExceededError' || e.code === 22) {
                        console.warn(`[Storage] Quota exceeded for ${key}`);
                        window.dispatchEvent(new Event('quran_storage_full'));
                    }
                    return false;
                }
            },
            getItem: (key) => { try { return localStorage.getItem(key); } catch (e) { return null; } },
            removeItem: (key) => { try { localStorage.removeItem(key); } catch (e) {} }
        };

        const API_BASE = "https://api.alquran.cloud/v1";
        const EDITIONS = {
            arabic: "quran-simple",
            audio: "ar.alafasy",
            transliteration: "tr.transliteration",
            tr_diyanet: "tr.vakfi",
            tr_yazir: "tr.yazir",
            tr_ates: "tr.ates",
            tr_ozturk: "tr.ozturk",
            tr_yildirim: "tr.yildirim",
            tr_yuksel: "tr.yuksel"
        };
        const SURAH_NAMES_AR = ["الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"];
        const getSurahNameAR = (number) => (number < 1 || number > 114) ? "" : SURAH_NAMES_AR[number - 1];
        const SURAH_NAMES_TR = ["Fâtiha", "Bakara", "Âl-i İmrân", "Nisâ", "Mâide", "En'âm", "A'râf", "Enfâl", "Tevbe", "Yûnus", "Hûd", "Yûsuf", "Ra'd", "İbrâhîm", "Hicr", "Nahl", "İsrâ", "Kehf", "Meryem", "Tâhâ", "Enbiyâ", "Hac", "Mü'minûn", "Nûr", "Furkân", "Şu'arâ", "Neml", "Kasas", "Ankebût", "Rûm", "Lokmân", "Secde", "Ahzâb", "Sebe'", "Fâtır", "Yâsîn", "Sâffât", "Sâd", "Zümer", "Mü'min", "Fussilet", "Şûrâ", "Zuhruf", "Duhân", "Câsiye", "Ahkâf", "Muhammed", "Fetih", "Hucurât", "Kâf", "Zâriyât", "Tûr", "Necm", "Kamer", "Rahmân", "Vâkıa", "Hadîd", "Mücâdele", "Haşr", "Mümtehine", "Saff", "Cum'a", "Münâfikûn", "Teğâbün", "Talâk", "Tahrîm", "Mülk", "Kalem", "Hâkka", "Meâric", "Nûh", "Cin", "Müzzemmil", "Müddessir", "Kıyâme", "İnsân", "Mürselât", "Nebe'", "Nâziât", "Abese", "Tekvîr", "İnfitâr", "Mutaffifîn", "İnşikâk", "Burûc", "Târık", "A'lâ", "Gâşiye", "Fecr", "Beled", "Şems", "Leyl", "Duhâ", "İnşirah", "Tîn", "Alak", "Kadir", "Beyyine", "Zilzâl", "Âdiyât", "Kâria", "Tekâsür", "Asr", "Hümeze", "Fîl", "Kureyş", "Mâûn", "Kevser", "Kâfirûn", "Nasr", "Tebbet", "İhlâs", "Felak", "Nâs"];
        const REVELATION_ORDER_MAP = { 1: 5, 2: 87, 3: 89, 4: 92, 5: 112, 6: 55, 7: 39, 8: 88, 9: 113, 10: 51, 11: 52, 12: 53, 13: 96, 14: 72, 15: 54, 16: 70, 17: 50, 18: 69, 19: 44, 20: 45, 21: 73, 22: 103, 23: 74, 24: 102, 25: 42, 26: 47, 27: 48, 28: 49, 29: 85, 30: 84, 31: 57, 32: 75, 33: 90, 34: 58, 35: 43, 36: 41, 37: 56, 38: 38, 39: 59, 40: 60, 41: 61, 42: 62, 43: 63, 44: 64, 45: 65, 46: 66, 47: 95, 48: 111, 49: 106, 50: 34, 51: 67, 52: 76, 53: 23, 54: 37, 55: 97, 56: 46, 57: 94, 58: 105, 59: 101, 60: 91, 61: 109, 62: 110, 63: 104, 64: 108, 65: 99, 66: 107, 67: 77, 68: 2, 69: 78, 70: 79, 71: 71, 72: 40, 73: 3, 74: 4, 75: 31, 76: 98, 77: 33, 78: 80, 79: 81, 80: 24, 81: 7, 82: 82, 83: 86, 84: 83, 85: 27, 86: 36, 87: 8, 88: 68, 89: 10, 90: 35, 91: 26, 92: 9, 93: 11, 94: 12, 95: 28, 96: 1, 97: 25, 98: 100, 99: 93, 100: 14, 101: 30, 102: 16, 103: 13, 104: 32, 105: 19, 106: 29, 107: 17, 108: 15, 109: 18, 110: 114, 111: 6, 112: 22, 113: 20, 114: 21 };

        const AYAH_COUNTS = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6];
        const getGlobalAyahID = (surahNum, ayahNumInSurah) => {
            if (!surahNum || !ayahNumInSurah) return 1;
            let count = 0;
            for (let i = 0; i < surahNum - 1; i++) count += AYAH_COUNTS[i];
            return count + ayahNumInSurah;
        };

        const getSurahNameTR = (number) => (number < 1 || number > 114) ? "" : SURAH_NAMES_TR[number - 1];

        const normalizeText = (text) => {
            if (!text) return "";
            return text.toLocaleLowerCase('tr')
                .replace(/['’‘\-\u2010\u2011\u2012\u2013\u2014\u2015]/g, '')
                .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
                .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                .replace(/İ/g, 'i').replace(/I/g, 'i')
                .replace(/\s+/g, ' ').trim();
        };

        const sortMatches = (matches, type) => {
            return [...matches].sort((a, b) => {
                if (type === 'mushaf') return (a.surah.number - b.surah.number) || (a.numberInSurah - b.numberInSurah);
                const orderA = REVELATION_ORDER_MAP[a.surah.number] || 999;
                const orderB = REVELATION_ORDER_MAP[b.surah.number] || 999;
                return (orderA - orderB) || (a.numberInSurah - b.numberInSurah);
            });
        };

        const formatTime = (time) => {
            if (isNaN(time)) return "00:00";
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        };

        // --- UTILITIES ---
        const fetchWithRetry = async (url, options = {}, retries = 3, delayMs = 500) => {
            for (let attempt = 0; attempt < retries; attempt++) {
                try {
                    const res = await fetch(url, options);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res;
                } catch (err) {
                    if (attempt === retries - 1) throw err;
                    await new Promise(r => setTimeout(r, delayMs * Math.pow(2, attempt)));
                }
            }
        };

        // Shared helper: merges edition arrays into a single ayah object array
        const combineAyahEditions = (metaAyahs, editionsData, surahNumber) =>
            metaAyahs.map((ayah, index) => ({
                ...ayah,
                surahName: getSurahNameTR(surahNumber),
                surahNumber,
                transliteration: editionsData[1]?.ayahs[index]?.text  || "",
                diyanet:         editionsData[2]?.ayahs[index]?.text  || "",
                yazir:           editionsData[3]?.ayahs[index]?.text  || "",
                ates:            editionsData[4]?.ayahs[index]?.text  || "",
                ozturk:          editionsData[5]?.ayahs[index]?.text  || "",
                yildirim:        editionsData[6]?.ayahs[index]?.text  || "",
                yuksel:          editionsData[7]?.ayahs[index]?.text  || "",
                audio:           editionsData[8]?.ayahs[index]?.audio || ""
            }));

        // Module-level constant — defined once, never re-allocated on renders
        const BISMILLAH_PREFIX = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ";

        // --- CONTEXT API ---
        const QuranContext = createContext();

        const QuranProvider = ({ children }) => {
            // ═══════════════════════════════════════════════════
            // SECTION 1 — DATA & VIEW
            // Surah/ayah data, view mode, search, loading state
            // ═══════════════════════════════════════════════════
            const [surahs, setSurahs] = useState([]);
            const [ayahs, setAyahs] = useState([]);
            const [viewMode, setViewMode] = useState('reader');
            const [activeSurah, setActiveSurah] = useState(null);
            const [searchQuery, setSearchQuery] = useState('');
            const [detailedResults, setDetailedResults] = useState([]);
            const [rawMatches, setRawMatches] = useState([]);
            const [loading, setLoading] = useState(false);
            const [loadingText, setLoadingText] = useState("");
            const [fetchError, setFetchError] = useState(null); // { surah } — set when fetchSurah fails
            const [searching, setSearching] = useState(false);
            const jumpTargetRef = useRef(null); // { ayahNumber, shouldPlay }
            const skipDisplayResetRef = useRef(false);
            const [displayLimit, setDisplayLimit] = useState(10);
            const fullQuranIndex = useRef(null);

            // ═══════════════════════════════════════════════════
            // SECTION 2 — AUDIO & PLAYBACK
            // Player state, audio element, playback controls
            // ═══════════════════════════════════════════════════
            const [activeAyah, setActiveAyah] = useState(null);
            const [isPlaying, setIsPlaying] = useState(false);
            const isPlayingRef = useRef(false); // Synchronous source of truth for intent
            const lastClickTimeRef = useRef(0); // Debounce
            const audioRef = useRef(new Audio());
            const [playbackRate, setPlaybackRate] = useState(() => { const s = parseFloat(safeStorage.getItem('quran_playbackRate')); return (s >= 0.5 && s <= 2) ? s : 1; });
            const [repeatMode, setRepeatMode] = useState(() => { const s = safeStorage.getItem('quran_repeatMode'); return ['none','one','all'].includes(s) ? s : 'none'; });
            const autoPlayAfterLoad = useRef(false);
            // Note: Cross-surah auto-scroll prevention is now handled directly in MainContent
            // by checking if activeAyah.surahNumber === activeSurah.number
            const playNextRef = useRef(null);
            const playPrevRef = useRef(null);
            const lastTransitionTimeRef = useRef(0);
            const playAyahRef = useRef(null);
            const nextSurahCacheRef = useRef(null);
            const scrollPositionRef = useRef(0); // Store scroll position when switching views
            // Tracks whether the current playback chain was started from playlist_view.
            // Set to true only when the user taps play inside playlist_view;
            // cleared when the user manually taps play in reader/search view.
            // This allows playlist order to be preserved even after switching to reader view.
            const playlistPlaybackRef = useRef(false);
            const playbackPlaylistRef = useRef(null);

            // Reset scroll memory when surah changes
            useEffect(() => {
                scrollPositionRef.current = 0;
            }, [activeSurah]);

            // ═══════════════════════════════════════════════════
            // SECTION 3 — PLAYLIST & SELECTION
            // ═══════════════════════════════════════════════════
            const [playlists, setPlaylists] = useState([]);
            const [selectedAyahs, setSelectedAyahs] = useState([]);
            const [activePlaylistId, setActivePlaylistId] = useState(null);
            const activePlaylist = useMemo(() => playlists.find(p => p.id === activePlaylistId) || null, [playlists, activePlaylistId]);
            const setActivePlaylist = useCallback((p) => setActivePlaylistId(p ? p.id : null), []);

            // ═══════════════════════════════════════════════════
            // SECTION 4 — PREFERENCES & UI
            // Font, theme, sort, bookmark, toast
            // ═══════════════════════════════════════════════════
            const [fontSize, setFontSize] = useState(() => { const s = parseInt(safeStorage.getItem('quran_fontSize')); return (s >= 14 && s <= 32) ? s : 18; });
            const [darkMode, setDarkMode] = useState(safeStorage.getItem('theme') === 'dark');
            const [sortType, setSortType] = useState(() => { const s = safeStorage.getItem('quran_sortType'); return s === 'revelation' ? 'revelation' : 'mushaf'; });
            const [bookmark, setBookmark] = useState(null);
            const [storageLoaded, setStorageLoaded] = useState(false);
            const [toastMessage, setToastMessage] = useState("");
            const toastTimerRef = useRef(null);
            const loadingRef = useRef(false);

            const showToast = useCallback((message) => {
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                setToastMessage(message);
                toastTimerRef.current = setTimeout(() => setToastMessage(""), 3000);
            }, []);

            useEffect(() => {
                return () => {
                    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                };
            }, []);

            useEffect(() => {
                const handleStorageFull = () => {
                    showToast("Cihaz hafızası dolu, yapılan değişiklikler kaydedilemedi!");
                };
                window.addEventListener('quran_storage_full', handleStorageFull);
                return () => window.removeEventListener('quran_storage_full', handleStorageFull);
            }, [showToast]);

            // iOS audio unlock — ensure a user gesture primes the audio context
            useEffect(() => {
                const audio = audioRef.current;
                if (!audio) return;
                let unlocked = false;

                const unlock = () => {
                    if (unlocked) return;
                    // Eğer kullanıcı gerçekten bir oynatma başlattıysa, unlock işlemi yaparken 
                    // pause() ve currentTime=0 yaparak sesi başa sarmasını engelliyoruz.
                    if (isPlayingRef.current) {
                        unlocked = true;
                        window.removeEventListener('touchstart', unlock);
                        window.removeEventListener('click', unlock, true);
                        return;
                    }
                    try {
                        audio.play().then(() => {
                            // KORUMA: Eğer biz playPromise.then()'e girdiğimizde kullanıcı zaten 
                            // butona basıp gerçek oynatmayı başlattıysa (isPlayingRef.current true ise),
                            // aktif oynatmayı pause edip bölmüyoruz!
                            if (isPlayingRef.current) {
                                unlocked = true;
                                window.removeEventListener('touchstart', unlock);
                                window.removeEventListener('click', unlock, true);
                                return;
                            }
                            audio.pause();
                            audio.currentTime = 0;
                            unlocked = true;
                            window.removeEventListener('touchstart', unlock);
                            window.removeEventListener('click', unlock, true);
                        }).catch(() => {});
                    } catch (e) {}
                };

                window.addEventListener('touchstart', unlock, { passive: true });
                window.addEventListener('click', unlock, true);

                return () => {
                    window.removeEventListener('touchstart', unlock);
                    window.removeEventListener('click', unlock, true);
                };
            }, []);


            // Scroll pozisyonunu kaydet — sadece reader <-> search arasi geciste restore et.
            // playlist_view veya my_notes'tan donunce reader'i en basa al (farkli icerik).
            // Initial value mirrors the actual initial viewMode state so first transition is correct.
            const prevViewModeRef = useRef(null);
            useEffect(() => {
                const mainScroll = document.getElementById('main-scroll');
                if (!mainScroll) return;

                if (viewMode === 'reader') {
                    const prev = prevViewModeRef.current;
                    // Sadece search <-> reader arasindan geliyorsak restore et.
                    // null means initial mount — treat same as non-search (no restore).
                    const shouldRestore = prev === 'search' && scrollPositionRef.current > 0;
                    if (shouldRestore) {
                        setTimeout(() => {
                            mainScroll.scrollTo({ top: scrollPositionRef.current, behavior: 'auto' });
                        }, 50);
                    } else {
                        // playlist/notes'tan geliyorsak veya ilk yuklemede basa don
                        mainScroll.scrollTo({ top: 0, behavior: 'auto' });
                        scrollPositionRef.current = 0;
                    }

                    const handleScroll = () => {
                        scrollPositionRef.current = mainScroll.scrollTop;
                    };
                    mainScroll.addEventListener('scroll', handleScroll, { passive: true });
                    prevViewModeRef.current = 'reader';
                    return () => mainScroll.removeEventListener('scroll', handleScroll);
                } else {
                    prevViewModeRef.current = viewMode;
                }
            }, [viewMode]);

            useEffect(() => {
                if (ayahs.length === 0) return;

                // Bekleyen ayet atlamasi varsa isleme al
                if (jumpTargetRef.current) {
                    const { ayahNumber, shouldPlay } = jumpTargetRef.current;
                    jumpTargetRef.current = null;
                    const target = ayahs.find(a => a.numberInSurah === ayahNumber);
                    if (target) {
                        const idx = ayahs.indexOf(target);
                        skipDisplayResetRef.current = true;
                        setDisplayLimit(Math.max(idx + 10, 10));
                        setTimeout(() => {
                            setActiveAyah(target);
                            if (shouldPlay) playAyahRef.current?.(target, { forcePlay: true, automatic: true, isAdvance: true });
                            
                            // Scroll manually after a delay to allow the DOM to render the new ayahs
                            let attempts = 0;
                            const maxAttempts = 10;
                            const tryScroll = () => {
                                const el = document.getElementById(`ayah-${target.number}`);
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    return;
                                }
                                if (++attempts < maxAttempts) {
                                    setTimeout(tryScroll, 100);
                                }
                            };
                            setTimeout(tryScroll, 100);
                        }, 300);
                        return;
                    }
                }

                if (autoPlayAfterLoad.current) {
                    const instruction = autoPlayAfterLoad.current;
                    autoPlayAfterLoad.current = false;
                    if (instruction.mode === 'nextAfter') {
                        // Play the ayah AFTER the reference ayah in the newly loaded surah
                        const refIdx = ayahs.findIndex(a => a.numberInSurah === instruction.numberInSurah);
                        const target = refIdx !== -1 && refIdx < ayahs.length - 1 ? ayahs[refIdx + 1] : ayahs[0];
                        playAyahRef.current?.(target, { automatic: instruction.automatic, isAdvance: true });
                    } else if (instruction.mode === 'prevBefore') {
                        // Play the ayah BEFORE the reference ayah (go to previous in newly loaded surah)
                        const refIdx = ayahs.findIndex(a => a.numberInSurah === instruction.numberInSurah);
                        const target = refIdx > 0 ? ayahs[refIdx - 1] : ayahs[ayahs.length - 1];
                        playAyahRef.current?.(target, { isAdvance: true });
                    } else {
                        // 'fromStart' — default: play first ayet
                        playAyahRef.current?.(ayahs[0], { automatic: instruction.automatic, isAdvance: true });
                    }
                }
            }, [ayahs]);


            // Initialize Audio
            useEffect(() => {
                const audio = audioRef.current;
                audio.preload = "auto";
                audio.setAttribute('playsinline', 'true');
                audio.playbackRate = playbackRate; // Apply initial or updated rate

                const onPlay = () => {
                    setIsPlaying(true);
                    isPlayingRef.current = true;
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.playbackState = "playing";
                    }
                };
                const onPause = () => {
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.playbackState = "paused";
                    }
                };
                const onEnded = () => {
                    const now = Date.now();
                    if (now - lastTransitionTimeRef.current < 800) {
                        console.log("[Audio] Ignored duplicate ended event (throttled by timestamp)");
                        return;
                    }
                    lastTransitionTimeRef.current = now;
                    
                    try {
                        if (repeatMode === 'one') {
                            playAyahRef.current?.(audioRef.current.__activeAyah, { forcePlay: true, automatic: true });
                        } else {
                            playNextRef.current?.({ automatic: true });
                        }
                    } catch (e) {
                        console.error("onEnded error:", e);
                    }
                };

                // Audio error recovery - retry on network errors
                let retryCount = 0;
                const MAX_RETRIES = 3;
                const onError = (e) => {
                    const error = e.target.error;
                    if (!error || error.code === 1) return; // Ignore AbortError (user paused)

                    if (error.code === error.MEDIA_ERR_NETWORK || error.code === error.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                        if (retryCount < MAX_RETRIES && audioRef.current?.__activeAyah && isPlayingRef.current) {
                            retryCount++;
                            setTimeout(() => {
                                if (audioRef.current?.__activeAyah && isPlayingRef.current) {
                                    playAyahRef.current?.(audioRef.current.__activeAyah, { forcePlay: true, automatic: true, isAdvance: true });
                                }
                            }, 1000 * retryCount);
                        } else if (isPlayingRef.current) {
                            showToast('Ses dosyası yüklenemedi. İnternet bağlantınızı kontrol edin.');
                            setIsPlaying(false);
                            isPlayingRef.current = false;
                        }
                    }
                };
                const onLoadStart = () => { retryCount = 0; };

                audio.addEventListener('play', onPlay);
                audio.addEventListener('pause', onPause);
                audio.addEventListener('ended', onEnded);
                audio.addEventListener('error', onError);
                audio.addEventListener('loadstart', onLoadStart);

                // Media Session API Support (Background Playback)
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.setActionHandler('play', () => audio.play());
                    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
                    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                        const skipTime = details.seekOffset || 10;
                        audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
                    });
                    navigator.mediaSession.setActionHandler('seekforward', (details) => {
                        const skipTime = details.seekOffset || 10;
                        audio.currentTime = Math.min(audio.currentTime + skipTime, audio.duration);
                    });
                }

                return () => {
                    audio.removeEventListener('play', onPlay);
                    audio.removeEventListener('pause', onPause);
                    audio.removeEventListener('ended', onEnded);
                    audio.removeEventListener('error', onError);
                    audio.removeEventListener('loadstart', onLoadStart);
                };
            }, [repeatMode]); // Removed isPlaying to prevent listener recreation during state changes

            // MediaSession next/prev — always fresh refs
            // MediaSession handler'ları her render'da güncelle (stale closure önlemi)
            if ('mediaSession' in navigator) {
                navigator.mediaSession.setActionHandler('previoustrack', () => playPrevRef.current?.());
                navigator.mediaSession.setActionHandler('nexttrack', () => playNextRef.current?.());
            }

            // Screen Wake Lock — Android only, iOS uses native audio wake.
            // System auto-releases the lock on visibilitychange (tab hidden/blur).
            // We re-acquire it when the page becomes visible again while still playing.
            useEffect(() => {
                if (!('wakeLock' in navigator)) return;
                let wakeLockSentinel = null;
                let cancelled = false;

                const acquire = async () => {
                    try {
                        const lock = await navigator.wakeLock.request('screen');
                        if (cancelled) { lock.release().catch(() => {}); return; }
                        wakeLockSentinel = lock;
                        // If the lock is auto-released by the system (e.g. screen off), null it
                        lock.addEventListener('release', () => { wakeLockSentinel = null; });
                    } catch (e) { /* ignore — not supported / permission denied */ }
                };

                const onVisibility = () => {
                    if (document.visibilityState === 'visible' && isPlaying && !wakeLockSentinel) {
                        acquire();
                    }
                };

                if (isPlaying) acquire();
                document.addEventListener('visibilitychange', onVisibility);

                return () => {
                    cancelled = true;
                    document.removeEventListener('visibilitychange', onVisibility);
                    wakeLockSentinel?.release().catch(() => {});
                    wakeLockSentinel = null;
                };
            }, [isPlaying]);

            // iOS visibility resume guard
            // When the user returns to the app (from lock screen or another app),
            // iOS WebKit may have suspended the JS thread mid-playback causing the
            // audio element to stall without firing 'pause'. If we think we were
            // playing (isPlayingRef) but the audio is paused, resume it.
            useEffect(() => {
                const onVisible = () => {
                    if (document.visibilityState !== 'visible') return;
                    const audio = audioRef.current;
                    if (!audio || !isPlayingRef.current) return;
                    if (audio.paused && audio.src) {
                        audio.play().catch(() => {});
                    }
                };
                document.addEventListener('visibilitychange', onVisible);
                return () => document.removeEventListener('visibilitychange', onVisible);
            }, []);

            // Handle playbackRate changes instantly — also re-apply after loadedmetadata
            // because some browsers reset playbackRate to 1 when src changes
            useEffect(() => {
                const audio = audioRef.current;
                if (!audio) return;
                audio.playbackRate = playbackRate;
                const onLoaded = () => { audio.playbackRate = playbackRate; };
                audio.addEventListener('loadedmetadata', onLoaded);
                return () => audio.removeEventListener('loadedmetadata', onLoaded);
            }, [playbackRate]);

            const prefetchSurah = async (surah) => {
                if (!surah) return;
                try {
                    const editionsStr = `${EDITIONS.arabic},${EDITIONS.transliteration},${EDITIONS.tr_diyanet},${EDITIONS.tr_yazir},${EDITIONS.tr_ates},${EDITIONS.tr_ozturk},${EDITIONS.tr_yildirim},${EDITIONS.tr_yuksel},${EDITIONS.audio}`;
                    const [editionsRes, metaRes] = await Promise.all([
                        fetchWithRetry(`${API_BASE}/surah/${surah.number}/editions/${editionsStr}`),
                        fetchWithRetry(`${API_BASE}/surah/${surah.number}`)
                    ]);

                    const editionsData = await editionsRes.json();
                    const metaData = await metaRes.json();

                    // editions endpoint: data[0] = arabic base ayahs, data[1..8] = translations/audio
                    const prefetchAyahs = combineAyahEditions(editionsData.data[0].ayahs, editionsData.data, surah.number);

                    nextSurahCacheRef.current = {
                        surah: { ...surah, ...metaData.data },
                        ayahs: prefetchAyahs
                    };
                    console.log(`[Prefetch] Successfully pre-fetched Surah ${surah.number} (${getSurahNameTR(surah.number)})`);
                } catch (e) {
                    console.error(`[Prefetch] Failed to pre-fetch Surah ${surah.number}:`, e);
                }
            };

            // sortedSurahs must be declared before the effects below that depend on it
            // (Babel previously hoisted as var; ES const TDZ requires explicit ordering).
            const sortedSurahs = useMemo(() => {
                return [...surahs].sort((a, b) => {
                    if (sortType === 'mushaf') return a.number - b.number;
                    return (REVELATION_ORDER_MAP[a.number] || 999) - (REVELATION_ORDER_MAP[b.number] || 999);
                });
            }, [surahs, sortType]);

            // Prefetch next Surah when activeSurah changes
            useEffect(() => {
                if (!activeSurah || sortedSurahs.length === 0) return;
                nextSurahCacheRef.current = null; // Clear previous prefetch cache

                const currentIdx = sortedSurahs.findIndex(s => s.number === activeSurah.number);
                const nextSurah = (currentIdx !== -1 && currentIdx < sortedSurahs.length - 1) ? sortedSurahs[currentIdx + 1] : null;
                
                if (nextSurah) {
                    const timer = setTimeout(() => {
                        prefetchSurah(nextSurah);
                    }, 3000);
                    return () => clearTimeout(timer);
                }
            }, [activeSurah, sortedSurahs]);

            // Load Initial Data & Settings
            useEffect(() => {
                const initStorageAndBoot = async () => {
                    try {
                        await migrateFromLocalStorage();
                    } catch (e) {
                        console.warn("Migration failed", e);
                    }
                    try {
                        const savedPlaylists = await dbPlaylists.getAll();
                        setPlaylists(savedPlaylists);
                    } catch (e) {
                        console.error("Failed to load playlists from IndexedDB", e);
                    }
                    setStorageLoaded(true);
                };
                initStorageAndBoot();
            }, []);

            useEffect(() => {
                if (!storageLoaded) return;

                const savedBookmarkRaw = safeStorage.getItem('quran_bookmark');
                if (savedBookmarkRaw) {
                    let b; try { b = JSON.parse(savedBookmarkRaw); } catch(e) { safeStorage.removeItem('quran_bookmark'); }
                    if (b) {
                        setBookmark(b);
                        // Legacy fix for bookmarks
                        if (b.number && !b.numberInSurah) {
                            fetchWithRetry(`${API_BASE}/ayah/${b.number}`)
                                .then(res => res.json())
                                .then(data => {
                                    if (data.code === 200 && data.data) {
                                        const fixed = { ...b, numberInSurah: data.data.numberInSurah, surah: getSurahNameTR(data.data.surah.number) };
                                        setBookmark(fixed);
                                        safeStorage.setItem('quran_bookmark', JSON.stringify(fixed));
                                    }
                                })
                                .catch(console.error);
                        }
                    } // end if (b)
                }

                setLoading(true);
                setLoadingText("Sure verileri yükleniyor...");
                fetchWithRetry(`${API_BASE}/surah`)
                    .then(res => res.json())
                    .then(data => {
                        setSurahs(data.data);

                        // RESTORE STATE: Hash'ten route (notes, playlists, reader)
                        if (window.__pendingQuranRoute) {
                            const route = window.__pendingQuranRoute;
                            window.__pendingQuranRoute = null;
                            
                            if (route.view === 'my_notes') {
                                setViewMode('my_notes');
                                setLoading(false);
                                return;
                            } else if (route.view === 'playlists_list') {
                                setViewMode('playlists_list');
                                setLoading(false);
                                return;
                            } else if (route.view === 'reader' && route.surahNumber) {
                                const targetSurah = data.data.find(s => s.number === route.surahNumber);
                                if (targetSurah) {
                                    if (route.ayahNumber) jumpTargetRef.current = { ayahNumber: route.ayahNumber, shouldPlay: false };
                                    fetchSurah(targetSurah);
                                    return;
                                }
                            }
                        }
                        
                        // RESTORE STATE: Legacy hash'ten sure (backward compat)
                        if (window.__pendingQuranSurah) {
                            const surahNum = window.__pendingQuranSurah;
                            const ayahNum = window.__pendingQuranAyah || null;
                            window.__pendingQuranSurah = null;
                            window.__pendingQuranAyah = null;
                            const targetSurah = data.data.find(s => s.number === surahNum);
                            if (targetSurah) {
                                if (ayahNum) jumpTargetRef.current = { ayahNumber: ayahNum, shouldPlay: false };
                                fetchSurah(targetSurah);
                                return;
                            }
                        }

                        // RESTORE STATE: Bookmark — sadece sureyi yükle (ama URL route'u varsa onu kullan)
                        if (!window.__pendingQuranRoute && !window.__pendingQuranSurah) {
                            const bRaw = safeStorage.getItem('quran_bookmark');
                            if (bRaw) {
                                let bParsed; try { bParsed = JSON.parse(bRaw); } catch(e) { safeStorage.removeItem('quran_bookmark'); }
                                if (bParsed && bParsed.surahNumber) {
                                    const targetSurah = data.data.find(s => s.number === bParsed.surahNumber);
                                    if (targetSurah) { fetchSurah(targetSurah); return; }
                                }
                            }
                        }

                        // Bookmark yoksa ve URL'den gelen route yoksa Fatiha'dan başla
                        if (!window.__pendingQuranRoute && !window.__pendingQuranSurah && data.data && data.data.length > 0) {
                            fetchSurah(data.data[0]);
                        } else {
                            setLoading(false);
                        }
                    })
                    .catch(e => { console.error(e); setLoading(false); showToast('Bağlantı hatası. Sayfayı yenileyiniz.'); });
            }, [storageLoaded]);

            const playlistsInitialisedRef = useRef(false);
            useEffect(() => {
                if (!storageLoaded) return;
                // Guard: skip only the very first render before storage has been read.
                if (!playlistsInitialisedRef.current) {
                    playlistsInitialisedRef.current = true;
                    return; // skip only the initial mount
                }
                // Strip heavy text fields before saving to IndexedDB to maintain a lightweight storage footprint
                const lightweightPlaylists = playlists.map(p => ({  
                    ...p,
                    items: p.items.map(item => ({
                        number: item.number,
                        surahNumber: item.surahNumber || item.surah?.number,
                        numberInSurah: item.numberInSurah,
                        isPartial: true
                    }))
                }));
                dbPlaylists.setAll(lightweightPlaylists).catch(e => console.error("Failed to save playlists to IndexedDB", e));
            }, [playlists, storageLoaded]);

            useEffect(() => {
                safeStorage.setItem('quran_fontSize', String(fontSize));
            }, [fontSize]);

            useEffect(() => {
                safeStorage.setItem('quran_playbackRate', String(playbackRate));
            }, [playbackRate]);

            useEffect(() => {
                safeStorage.setItem('quran_repeatMode', repeatMode);
            }, [repeatMode]);

            useEffect(() => {
                safeStorage.setItem('quran_sortType', sortType);
            }, [sortType]);

            // Save bookmark whenever active ayah changes
            useEffect(() => {
                if (activeAyah) {
                    const newBookmark = {
                        surah: activeAyah.surahName,
                        number: activeAyah.number,
                        numberInSurah: activeAyah.numberInSurah,
                        surahNumber: activeAyah.surahNumber || activeSurah?.number
                    };
                    setBookmark(newBookmark);
                    safeStorage.setItem('quran_bookmark', JSON.stringify(newBookmark));
                }
            }, [activeAyah, activeSurah]);

            // Hydrate partial items in active playlist
            useEffect(() => {
                if (activePlaylist && activePlaylist.items.some(i => i.isPartial)) {
                    const partials = activePlaylist.items.filter(i => i.isPartial);
                    const uniquePartials = [...new Map(partials.map(item => [item.number, item])).values()];

                    if (uniquePartials.length === 0) return;

                    const hydrate = async () => {
                        if (loadingRef.current) return;
                        loadingRef.current = true;
                        setLoadingText("Liste detayları güncelleniyor...");

                        const chunkSizes = 5;
                        const newItemsMap = {};

                        for (let i = 0; i < uniquePartials.length; i += chunkSizes) {
                            const chunk = uniquePartials.slice(i, i + chunkSizes);
                            const matches = chunk.map(p => ({ surah: { number: p.surahNumber }, numberInSurah: p.numberInSurah }));
                            try {
                                const details = await fetchDetailsForMatches(matches);
                                details.forEach(d => { newItemsMap[d.number] = d; });
                            } catch (chunkErr) {
                                console.warn("[Hydration] Failed to fetch chunk", chunkErr);
                            }
                        }

                        try {
                            const updater = (list) => list.map(item => {
                                if (newItemsMap[item.number]) {
                                    return newItemsMap[item.number];
                                }
                                // If this item was in the uniquePartials chunk we tried to fetch but it failed,
                                // strip the isPartial flag to prevent an infinite hydration fetch loop.
                                if (uniquePartials.some(up => up.number === item.number)) {
                                    const { isPartial, ...rest } = item;
                                    return rest;
                                }
                                return item;
                            });

                            setPlaylists(prev => prev.map(p => {
                                if (p.id === activePlaylist.id) {
                                    return { ...p, items: updater(p.items) };
                                }
                                return p;
                            }));
                            // activePlaylist is derived from playlists via useMemo — no separate sync needed
                        } catch (e) {
                            console.error("Hydration failed", e);
                        } finally {
                            setLoadingText("");
                            loadingRef.current = false;
                        }
                    };

                    hydrate();
                }
            }, [activePlaylist]);

            // Background Offline Audio Prefetch Utility
            const prefetchAudio = async (ayah) => {
                if (!ayah || !ayah.audio) return;
                try {
                    const cache = await caches.open('quran-audio-v28');
                    const audioUrl = ayah.audio;
                    // Check if already cached
                    const cachedResponse = await cache.match(audioUrl);
                    if (!cachedResponse) {
                        const res = await fetch(audioUrl);
                        if (res.status === 200) {
                            await cache.put(audioUrl, res);
                        }
                    }
                } catch (e) {
                    // Fail silently in background
                }
            };

            // Trigger background prefetch for current and next 2 tracks whenever activeAyah changes
            useEffect(() => {
                if (!activeAyah) return;

                // 1. Prefetch the active Ayah itself
                prefetchAudio(activeAyah);

                // 2. Determine the next 2 Ayahs to prefetch
                const nextTracks = [];
                if (playlistPlaybackRef.current && playbackPlaylistRef.current) {
                    const items = playbackPlaylistRef.current.items;
                    const idx = items.findIndex(item => Number(item.number) === Number(activeAyah.number));
                    if (idx !== -1) {
                        if (idx + 1 < items.length) nextTracks.push(items[idx + 1]);
                        if (idx + 2 < items.length) nextTracks.push(items[idx + 2]);
                    }
                } else if (ayahs && ayahs.length > 0) {
                    const idx = ayahs.findIndex(item => Number(item.number) === Number(activeAyah.number));
                    if (idx !== -1) {
                        if (idx + 1 < ayahs.length) nextTracks.push(ayahs[idx + 1]);
                        if (idx + 2 < ayahs.length) nextTracks.push(ayahs[idx + 2]);
                    }
                }

                nextTracks.forEach(track => {
                    if (track) prefetchAudio(track);
                });
            }, [activeAyah, ayahs]);

            // Audio Controls
            const playAyah = (ayah, options = {}) => {
                const now = Date.now();
                if (!options.automatic && now - lastClickTimeRef.current < 200) return; // Debounce rapid clicks only
                if (!options.automatic) lastClickTimeRef.current = now;

                const audio = audioRef.current;
                const currentAyahId = audio.__activeAyah?.number;
                // Check both audio element property AND React state to handle initial load cases
                const isSameAyah = (currentAyahId && Number(currentAyahId) === Number(ayah.number)) ||
                                   (activeAyah && Number(activeAyah.number) === Number(ayah.number));

                if (isSameAyah && !options.forcePlay) {
                    if (audio.paused) {
                        isPlayingRef.current = true;
                        audio.play().catch(e => {
                            if (e.name !== 'AbortError') console.error("Play error:", e);
                            else isPlayingRef.current = false;
                        });
                        if ('mediaSession' in navigator) {
                            navigator.mediaSession.playbackState = "playing";
                        }
                    } else {
                        isPlayingRef.current = false;
                        audio.pause();
                        if ('mediaSession' in navigator) {
                            navigator.mediaSession.playbackState = "paused";
                        }
                    }
                    return;
                }

                // Track whether this playback chain originated from playlist_view.
                // Automatic calls (chain from onEnded / playNext) or sequential advances inherit the current context;
                // only manual user card taps reset or set the flag.
                if (!options.automatic && !options.isAdvance) {
                    const isPlaylist = viewMode === 'playlist_view';
                    playlistPlaybackRef.current = isPlaylist;
                    playbackPlaylistRef.current = isPlaylist ? activePlaylist : null;
                }

                // 1. Update the Audio element FIRST (no explicit pause() or load() to prevent lockscreen dismissal)
                const targetSrc = ayah.audio || "";
                const currentSrc = audio.getAttribute('src');
                if (currentSrc !== targetSrc) {
                    audio.src = targetSrc;
                }
                
                audio.__activeAyah = ayah;
                audio.playbackRate = playbackRate;

                // 2. Start playing immediately to preserve background autoplay trust chain
                if (targetSrc) {
                    isPlayingRef.current = true;
                    audio.play().catch(e => {
                        if (e.name !== 'AbortError') console.error("Play error:", e);
                        else isPlayingRef.current = false;
                    });
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.playbackState = "playing";
                    }
                } else {
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.playbackState = "none";
                    }
                }

                // 3. Update Media Metadata (using absolute artwork URLs to prevent background fetch failures on Android)
                if ('mediaSession' in navigator) {
                    try {
                        const surahName = ayah.surahName || getSurahNameTR(ayah.surahNumber || activeSurah?.number);
                        const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, "");
                        navigator.mediaSession.metadata = new MediaMetadata({
                            title: `Ayet ${ayah.numberInSurah} (${surahName})`,
                            artist: 'Kur\'an-ı Kerim',
                            album: surahName,
                            artwork: [
                                { src: `${baseUrl}/icon-192.png`, sizes: '192x192', type: 'image/png' },
                                { src: `${baseUrl}/icon-512.png`, sizes: '512x512', type: 'image/png' }
                            ]
                        });
                    } catch (e) {
                        console.warn("Failed to set MediaSession metadata:", e);
                    }
                }

                // 4. Finally, update React State (UI) last to offload rendering overhead from the synchronous audio thread
                if (!options.onlyAudio) {
                    setActiveAyah(ayah);
                }
            };
            playAyahRef.current = playAyah;

            const fetchSurahAbortRef = useRef(null);
            const fetchSingleAyahAbortRef = useRef(null);
            
            // Lightweight: fetch single ayah without changing view
            // Uses AbortController to prevent race conditions with rapid next/prev clicks
            // MUST be defined BEFORE playNext/playPrev to avoid TDZ error
            const fetchAndPlaySingleAyah = useCallback(async (ayahNumber, options = {}) => {
                // Abort any in-flight single ayah fetch
                if (fetchSingleAyahAbortRef.current) {
                    fetchSingleAyahAbortRef.current.abort();
                }
                fetchSingleAyahAbortRef.current = new AbortController();
                const abortSignal = fetchSingleAyahAbortRef.current;
                
                const editionsStr = `${EDITIONS.arabic},${EDITIONS.transliteration},${EDITIONS.tr_diyanet},${EDITIONS.tr_yazir},${EDITIONS.tr_ates},${EDITIONS.tr_ozturk},${EDITIONS.tr_yildirim},${EDITIONS.tr_yuksel},${EDITIONS.audio}`;
                try {
                    const res = await fetchWithRetry(`${API_BASE}/ayah/${ayahNumber}/editions/${editionsStr}`, { signal: abortSignal.signal });
                    // Check if aborted before processing
                    if (abortSignal.signal.aborted) return;
                    
                    const data = await res.json();
                    if (abortSignal.signal.aborted) return;
                    
                    const d = data.data;
                    const ayah = {
                        number: d[0].number,
                        numberInSurah: d[0].numberInSurah,
                        surahNumber: d[0].surah.number,
                        surahName: getSurahNameTR(d[0].surah.number),
                        text: d[0].text,
                        transliteration: d[1].text,
                        diyanet: d[2].text,
                        yazir: d[3].text,
                        ates: d[4].text,
                        ozturk: d[5].text,
                        yildirim: d[6].text,
                        yuksel: d[7].text,
                        audio: d[8].audio
                    };
                    playAyah(ayah, options);
                } catch (e) {
                    if (e.name === 'AbortError') return; // Silently ignore aborts
                    console.error('Failed to fetch ayah:', e);
                } finally {
                    if (fetchSingleAyahAbortRef.current === abortSignal) {
                        fetchSingleAyahAbortRef.current = null;
                    }
                }
            }, [playAyah]);

            const playNext = useCallback((options = {}) => {
                const actualOptions = (options && typeof options.preventDefault === 'function') ? {} : options;
                const isAutomatic = actualOptions.automatic || false;

                // Playlist mode is determined by whether playback was *started* from playlist_view,
                // NOT by which view is currently visible. This ensures playlist order is respected
                // even when the user switches to reader view while a playlist is playing.
                const playingPlaylist = playbackPlaylistRef.current;
                const isPlaylistMode = playlistPlaybackRef.current && !!playingPlaylist;
                const list = isPlaylistMode ? playingPlaylist.items : (viewMode === 'search' ? detailedResults : ayahs);
                const idx = list.findIndex(a => a.number === activeAyah?.number);

                // idx === -1 means the currently playing ayah is not found in the current list.
                // For playlist mode: this should not happen normally, but guard just in case.
                // For reader/search mode: the playing ayah is from a different surah — play
                // the next ayah globally without changing view.
                if (idx === -1 && activeAyah) {
                    if (!isPlaylistMode) {
                        // Reader/search mode: play next global ayah without changing view
                        const nextGlobalNumber = activeAyah.number + 1;
                        if (nextGlobalNumber <= 6236) { // Last ayah in Quran
                            fetchAndPlaySingleAyah(nextGlobalNumber, { automatic: isAutomatic, isAdvance: true });
                        }
                    }
                    // In playlist mode with idx === -1: playlist may still be loading/hydrating;
                    // silently do nothing to avoid breaking playback state.
                    return;
                }

                if (idx !== -1 && idx < list.length - 1) {
                    playAyahRef.current?.(list[idx + 1], { automatic: isAutomatic, isAdvance: true });
                } else if (idx === list.length - 1 && repeatMode === 'all') {
                    playAyahRef.current?.(list[0], { forcePlay: true, automatic: isAutomatic, isAdvance: true });
                } else if (idx === list.length - 1 && repeatMode === 'none') {
                    if (isPlaylistMode) {
                        // Playlist finished — show toast regardless of which view is visible
                        showToast(`Liste bitti: ${playingPlaylist?.name}`);
                    } else if (viewMode === 'reader' && activeSurah) {
                        const currentIdx = sortedSurahs.findIndex(s => s.number === activeSurah.number);
                        const nextSurah = (currentIdx !== -1 && currentIdx < sortedSurahs.length - 1) ? sortedSurahs[currentIdx + 1] : null;
                        if (nextSurah) {
                            if (nextSurahCacheRef.current && nextSurahCacheRef.current.surah.number === nextSurah.number) {
                                // Instant transition! No network latency.
                                const cached = nextSurahCacheRef.current;
                                nextSurahCacheRef.current = null; // Consume cache

                                // 1. Synchronously set the new state
                                setAyahs(cached.ayahs);
                                setActiveSurah(cached.surah);
                                
                                // 2. Synchronously start playing the first ayah of the new surah
                                const firstAyah = cached.ayahs[0];
                                playAyah(firstAyah, { automatic: isAutomatic, isAdvance: true });

                                // 3. Asynchronously update navigation state & hash
                                setTimeout(() => {
                                    navigate('reader', { surahNumber: nextSurah.number });
                                }, 50);
                            } else {
                                // Fallback to network fetch if not yet pre-fetched
                                autoPlayAfterLoad.current = { mode: 'fromStart', automatic: isAutomatic };
                                fetchSurah(nextSurah);
                            }
                        } else {
                            showToast("Son sureye ulaşıldı.");
                        }
                    } else if (viewMode === 'search') showToast("Arama sonuçları bitti.");
                }
            }, [viewMode, activePlaylist, detailedResults, ayahs, activeAyah, repeatMode, activeSurah, sortedSurahs, surahs, showToast, fetchAndPlaySingleAyah]);

            const playPrev = useCallback((options = {}) => {
                const actualOptions = (options && typeof options.preventDefault === 'function') ? {} : options;

                // Playlist mode is determined by whether playback was *started* from playlist_view.
                const playingPlaylist = playbackPlaylistRef.current;
                const isPlaylistMode = playlistPlaybackRef.current && !!playingPlaylist;
                const list = isPlaylistMode ? playingPlaylist.items : (viewMode === 'search' ? detailedResults : ayahs);
                const idx = list.findIndex(a => a.number === activeAyah?.number);
                // User navigated away from reader/search — play previous ayah without changing view.
                // In playlist mode, guard against hydration edge cases but don't jump globally.
                if (idx === -1 && activeAyah) {
                    if (!isPlaylistMode) {
                        const prevGlobalNumber = activeAyah.number - 1;
                        if (prevGlobalNumber >= 1) { // First ayah in Quran
                            fetchAndPlaySingleAyah(prevGlobalNumber, { onlyAudio: false, isAdvance: true });
                        }
                    }
                    return;
                }
                if (idx > 0) {
                    playAyahRef.current?.(list[idx - 1], { automatic: actualOptions.automatic || false, isAdvance: true });
                }
            }, [viewMode, activePlaylist, detailedResults, ayahs, activeAyah, activeSurah, surahs, fetchAndPlaySingleAyah]);

            playNextRef.current = playNext;
            playPrevRef.current = playPrev;

            const fetchSurah = async (surah) => {
                // Abort any in-flight fetch for a different surah
                if (fetchSurahAbortRef.current) {
                    fetchSurahAbortRef.current.abort();
                }
                fetchSurahAbortRef.current = new AbortController();
                const abortSignal = fetchSurahAbortRef.current;

                // Senaryo 1: Aynı sure zaten yüklü — fetch atla, direkt jump yap
                if (surah.number === activeSurah?.number && ayahs.length > 0 && jumpTargetRef.current) {
                    const { ayahNumber, shouldPlay } = jumpTargetRef.current;
                    jumpTargetRef.current = null;
                    const target = ayahs.find(a => a.numberInSurah === ayahNumber);
                    if (target) {
                        const idx = ayahs.indexOf(target);
                        skipDisplayResetRef.current = true;
                        setDisplayLimit(Math.max(idx + 10, 10));
                        setTimeout(() => {
                            setActiveAyah(target);
                            if (shouldPlay) playAyahRef.current?.(target, { forcePlay: true, automatic: true, isAdvance: true });
                            // lastScrolledAyah in MainContent may still hold this ayah's number
                            // so the auto-scroll useEffect won't fire — scroll manually
                            const el = document.getElementById(`ayah-${target.number}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 200);
                    }
                    return;
                }

                setLoading(true); setLoadingText(`${getSurahNameTR(surah.number)} suresi yükleniyor...`);
                // Only push navigation state if the Quran view is actually visible
                const quranVisible = !document.getElementById('quran-root')?.classList.contains('hidden');
                if (quranVisible) {
                    navigate('reader', { surahNumber: surah.number });
                } else {
                    setViewMode('reader');
                }
                // Senaryo 2: Farklı sure — eski ayetleri temizleme, yüklenene kadar ekranda kalsın
                // (setAyahs([]) kaldırıldı — 1. ayete flash sorunu bu yüzden oluyordu)
                setSearchQuery(''); setRawMatches([]); setDetailedResults([]); setActiveSurah(surah);

                try {
                    const editionsStr = `${EDITIONS.arabic},${EDITIONS.transliteration},${EDITIONS.tr_diyanet},${EDITIONS.tr_yazir},${EDITIONS.tr_ates},${EDITIONS.tr_ozturk},${EDITIONS.tr_yildirim},${EDITIONS.tr_yuksel},${EDITIONS.audio}`;
                    const [editionsRes, metaRes] = await Promise.all([
                        fetchWithRetry(`${API_BASE}/surah/${surah.number}/editions/${editionsStr}`),
                        fetchWithRetry(`${API_BASE}/surah/${surah.number}`)
                    ]);

                    // Abort check: if a newer fetchSurah call superseded us, discard results silently
                    if (abortSignal.signal.aborted) return;

                    const editionsData = await editionsRes.json();
                    const metaData = await metaRes.json();
                    if (metaData.code === 200) setActiveSurah(prev => ({ ...prev, ...metaData.data }));

                    const combinedAyahs = combineAyahEditions(metaData.data.ayahs, editionsData.data, surah.number);
                    setAyahs(combinedAyahs);
                    setFetchError(null);
                } catch (e) {
                    if (abortSignal.signal.aborted) return; // Superseded — ignore
                    console.error(e); setAyahs([]); setFetchError({ surah }); showToast('Sure yüklenemedi.');
                } finally {
                    if (!abortSignal.signal.aborted) {
                        setLoading(false);
                        // Release abort controller reference once fetch lifecycle is complete
                        if (fetchSurahAbortRef.current === abortSignal) {
                            fetchSurahAbortRef.current = null;
                        }
                    }
                }
            };

            const fetchDetailsForMatches = async (matchesToFetch) => {
                const newResults = [];
                const editionsStr = `${EDITIONS.arabic},${EDITIONS.transliteration},${EDITIONS.tr_diyanet},${EDITIONS.tr_yazir},${EDITIONS.tr_ates},${EDITIONS.tr_ozturk},${EDITIONS.tr_yildirim},${EDITIONS.tr_yuksel},${EDITIONS.audio}`;
                const promises = matchesToFetch.map(async (match) => {
                    try {
                        const res = await fetchWithRetry(`${API_BASE}/ayah/${match.surah.number}:${match.numberInSurah}/editions/${editionsStr}`);
                        const data = await res.json();
                        const d = data.data;
                        return {
                            number: d[0].number, numberInSurah: d[0].numberInSurah,
                            surahName: getSurahNameTR(match.surah.number), surahNumber: match.surah.number,
                            text: d[0].text, transliteration: d[1].text, diyanet: d[2].text, yazir: d[3].text, ates: d[4].text,
                            ozturk: d[5].text, yildirim: d[6].text, yuksel: d[7].text, audio: d[8].audio
                        };
                    } catch (e) { return null; }
                });

                const results = await Promise.all(promises);
                return results.filter(r => r !== null);
            };

            const [currentSearchTerm, setCurrentSearchTerm] = useState('');
            const searchAbortController = useRef(null);
            const searchRequestId = useRef(0);

            const handleSearch = async (queryRaw) => {
                // Cancel previous search
                searchAbortController.current?.abort();
                searchAbortController.current = new AbortController();
                const currentRequestId = ++searchRequestId.current;
                if (!queryRaw.trim()) { setRawMatches([]); setDetailedResults([]); setLoadingText(''); setViewMode('reader'); return; }
                setSearching(true); setViewMode('search'); setRawMatches([]); setDetailedResults([]); setCurrentSearchTerm(queryRaw);
                
                try {
                    // 1. Build/Load Index (Multi-Translation) — uses IndexedDB (bigCache)
                    let quranData = fullQuranIndex.current;
                    if (!quranData) {
                        const CACHE_KEY = 'quran_index_v2';
                        const CACHE_TS_KEY = 'quran_index_v2_ts';
                        const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
                        let cached = null;
                        try {
                            const cachedTs = parseInt((await bigCache.get(CACHE_TS_KEY)) || 0) || 0;
                            if (Date.now() - cachedTs < CACHE_MAX_AGE) {
                                cached = await bigCache.get(CACHE_KEY);
                            }
                            if (!cached) {
                                await bigCache.remove(CACHE_KEY);
                                await bigCache.remove(CACHE_TS_KEY);
                            }
                        } catch (e) { /* IDB error — fall through to network fetch */ }
                        if (cached && Array.isArray(cached)) {
                            try {
                                quranData = cached;
                                // Calculate normalizedText ONLY in RAM to save quota
                                quranData.forEach(item => {
                                    item.normalizedText = normalizeText(item.text);
                                });
                                fullQuranIndex.current = quranData;
                            } catch (e) {
                                quranData = null;
                                try { await bigCache.remove(CACHE_KEY); await bigCache.remove(CACHE_TS_KEY); } catch {}
                            }
                        }
                        
                        if (!quranData) {
                            setLoadingText("Mealler indiriliyor (Diyanet, Yazır, Ateş)...");
                            try {
                                const editionsToFetch = [EDITIONS.tr_diyanet, EDITIONS.tr_yazir, EDITIONS.tr_ates];
                                const allSurahs = [];
                                
                                for (const ed of editionsToFetch) {
                                    try {
                                        const res = await fetchWithRetry(`${API_BASE}/quran/${ed}`);
                                        const data = await res.json();
                                        if (data && data.data && data.data.surahs) {
                                            allSurahs.push(data.data.surahs);
                                        }
                                    } catch (e) { console.warn(`Failed to fetch edition ${ed}:`, e); }
                                }

                                if (allSurahs.length === 0) throw new Error("Hiçbir meal indirilemedi.");

                                quranData = [];
                                const baseSurahs = allSurahs[0];
                                for (let i = 0; i < baseSurahs.length; i++) {
                                    for (let j = 0; j < baseSurahs[i].ayahs.length; j++) {
                                        const texts = allSurahs.map(edSurahs => edSurahs[i]?.ayahs[j]?.text || "");
                                        const combinedText = texts.join(" ");
                                        quranData.push({
                                            surah: { number: baseSurahs[i].number },
                                            number: baseSurahs[i].ayahs[j].number, // Global number
                                            numberInSurah: baseSurahs[i].ayahs[j].numberInSurah,
                                            text: combinedText
                                        });
                                    }
                                }
                                // Save lightweight index to IndexedDB (no 5MB quota limit)
                                try {
                                    await bigCache.set('quran_index_v2', quranData);
                                    await bigCache.set('quran_index_v2_ts', Date.now());
                                } catch (e) { console.warn('[Quran] index cache write failed', e); }

                                // Enrich RAM cache with normalizedText for instant searching
                                quranData.forEach(item => {
                                    item.normalizedText = normalizeText(item.text);
                                });
                                fullQuranIndex.current = quranData;
                            } catch (err) {
                                console.error("Indexing failed:", err);
                                showToast("Arama hazırlanamadı: " + err.message);
                                setSearching(false); setLoadingText(''); setViewMode('reader'); return;
                            }
                        }
                    }

                    // 2. Check for Navigation (e.g. "Bakara 43")
                    const navRegex = /^(.+?)[\s\:\-]+(\d+)$/;
                    const matchNav = queryRaw.match(navRegex);

                    const findSurahID = (q) => {
                        const nQ = normalizeText(q);
                        if (!nQ) return null;
                        if (/^\d+$/.test(nQ)) {
                            const n = parseInt(nQ);
                            if (n >= 1 && n <= 114) return n;
                        }
                        let bestID = null, bestScore = 0;
                        SURAH_NAMES_TR.forEach((name, idx) => {
                            const norm = normalizeText(name);
                            let score = 0;
                            if (norm === nQ) score = 3;
                            else if (norm.startsWith(nQ)) score = 2;
                            else if (norm.includes(nQ)) score = 1;
                            if (score > bestScore) { bestScore = score; bestID = idx + 1; }
                        });
                        return bestID;
                    };

                    let targetSurahID = null, targetVerseNum = null;
                    if (matchNav) {
                        const candidate = findSurahID(matchNav[1]);
                        // Only treat as navigation if the text part is actually a surah name
                        if (candidate) {
                            targetSurahID = candidate;
                            targetVerseNum = parseInt(matchNav[2]);
                        }
                    }
                    if (!targetSurahID) {
                        // Check if it's just a surah name
                        const possibleID = findSurahID(queryRaw);
                        if (possibleID) {
                            targetSurahID = possibleID;
                            targetVerseNum = 1;
                        }
                    }

                    if (targetSurahID) {
                        const sInfo = surahs.find(s => s.number === targetSurahID);
                        if (sInfo && targetVerseNum && targetVerseNum > sInfo.numberOfAyahs) {
                            showToast(`${getSurahNameTR(targetSurahID)} suresi ${sInfo.numberOfAyahs} ayettir.`);
                            setSearching(false); setViewMode('reader'); return;
                        }
                        const s = surahs.find(x => x.number === targetSurahID);
                        if (s) {
                            if (targetVerseNum && targetVerseNum > 1) {
                                jumpTargetRef.current = { ayahNumber: targetVerseNum, shouldPlay: false };
                            }
                            fetchSurah(s);
                            setSearching(false); return;
                        }
                    }

                    // 3. Perform Text Search (with optional surah scope: "Bakara namaz")
                    const normQuery = normalizeText(queryRaw).trim();
                    let scopedSurahID = null;
                    let actualSearchTerm = normQuery;

                    const surahMatches = SURAH_NAMES_TR.map((name, idx) => ({ name, id: idx + 1, norm: normalizeText(name) }));
                    const foundSurah = surahMatches.find(s => normQuery.startsWith(s.norm + ' '));
                    if (foundSurah) {
                        const remainder = normQuery.slice(foundSurah.norm.length).trim();
                        if (remainder) {
                            scopedSurahID = foundSurah.id;
                            actualSearchTerm = remainder;
                        } else {
                            // Only surah name typed with trailing space — navigate to it
                            const s = surahs.find(x => x.number === foundSurah.id);
                            if (s) { fetchSurah(s); setSearching(false); return; }
                        }
                    }

                    let allMatches = quranData.filter(item => {
                        if (scopedSurahID && item.surah.number !== scopedSurahID) return false;
                        return item.normalizedText.includes(actualSearchTerm);
                    });

                    allMatches = sortMatches(allMatches, sortType);
                    
                    // Check if this is still the current search request
                    if (currentRequestId !== searchRequestId.current) return;
                    setRawMatches(allMatches);
                    
                    const initialBatch = allMatches.slice(0, 5);
                    const details = await fetchDetailsForMatches(initialBatch);
                    
                    // Check again before setting results
                    if (currentRequestId !== searchRequestId.current) return;
                    setDetailedResults(details);
                } catch (e) {
                    console.error("Search error:", e);
                } finally {
                    // Only clear searching flag if this is still the current request
                    if (currentRequestId === searchRequestId.current) {
                        setSearching(false); setLoadingText("");
                    }
                }
            };

            // Re-sort search results when sortType changes
            useEffect(() => {
                if (viewMode !== 'search') return;
                setRawMatches(prev => {
                    if (prev.length === 0) return prev;
                    return sortMatches(prev, sortType);
                });
            }, [sortType]);

            // Fetch details for top search matches whenever rawMatches or sortType changes
            useEffect(() => {
                if (viewMode !== 'search' || rawMatches.length === 0) return;
                
                let active = true;
                const fetchTopDetails = async () => {
                    setLoadingText("Sıralama güncelleniyor...");
                    try {
                        const topMatches = rawMatches.slice(0, 5);
                        const details = await fetchDetailsForMatches(topMatches);
                        if (active) {
                            setDetailedResults(details);
                        }
                    } catch (err) {
                        console.error("[SearchDetails] Failed to fetch top matches details", err);
                    } finally {
                        if (active) {
                            setLoadingText("");
                        }
                    }
                };

                fetchTopDetails();
                return () => {
                    active = false;
                };
            }, [rawMatches, sortType, viewMode]);

            // Navigation Helper — only pushes history when Quran view is active
            const navigate = (view, extraState = {}) => {
                const quranVisible = !document.getElementById('quran-root')?.classList.contains('hidden');
                if (quranVisible) {
                    const state = { quran: true, view, ...extraState };
                    const surahNum = extraState.surahNumber || activeSurah?.number;
                    let hash = '#quran';
                    if (view === 'reader' && surahNum) hash = `#quran/${surahNum}`;
                    else if (view === 'my_notes') hash = '#quran/notes';
                    else if (view === 'playlists_list' || view === 'playlist_view') hash = '#quran/playlists';
                    history.pushState(state, '', hash);
                }
                setViewMode(view);
            };

            // Global Navigation Handler (for PopState and Hash Changes)
            useEffect(() => {
                window.dispatchQuranNavigation = (state) => {
                    if (!state) return;

                    if (state.view) {
                        setViewMode(state.view);

                        // Restore detailed state if passed
                        if (state.view === 'reader' && state.surahNumber) {
                            if (activeSurah?.number !== state.surahNumber) {
                                // We need to re-fetch if not already active
                                const s = surahs.find(x => x.number === state.surahNumber);
                                if (s) {
                                    // Store ayah target for jump after load
                                    if (state.ayahNumber) {
                                        jumpTargetRef.current = { ayahNumber: state.ayahNumber, shouldPlay: false };
                                    }
                                    fetchSurah(s);
                                } else if (!surahs.length) {
                                    // Surahs not loaded yet, store for later
                                    window.__pendingQuranSurah = state.surahNumber;
                                    window.__pendingQuranAyah = state.ayahNumber;
                                }
                            } else if (state.ayahNumber && activeSurah) {
                                // Already on correct surah, just jump to ayah
                                jumpTargetRef.current = { ayahNumber: state.ayahNumber, shouldPlay: false };
                                // Trigger scroll to ayah
                                const ayahEl = document.getElementById(`ayah-${state.ayahNumber}`);
                                if (ayahEl) {
                                    ayahEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    ayahEl.classList.add('ring-2', 'ring-amber-400');
                                    setTimeout(() => ayahEl.classList.remove('ring-2', 'ring-amber-400'), 2000);
                                }
                            }
                        }
                        if (state.view === 'search' && state.query) {
                            if (searchQuery !== state.query) {
                                setSearchQuery(state.query);
                                handleSearch(state.query);
                            }
                        }
                        // my_notes and playlists_list are handled by the setViewMode(state.view) call above
                    }
                };

                return () => { window.dispatchQuranNavigation = null; };
            // fetchSurah is an async function re-created every render — exclude from deps,
            // access via stable ref to avoid registering a new handler on every render.
            }, [surahs, activeSurah, searchQuery, handleSearch]);

            const value = {
                surahs, sortedSurahs, ayahs, viewMode, setViewMode, activeSurah, setActiveSurah, fetchSurah,
                searchQuery, setSearchQuery, handleSearch, currentSearchTerm, rawMatches, setRawMatches, detailedResults, setDetailedResults,
                activeAyah, setActiveAyah, isPlaying, setIsPlaying, audioRef, playAyah, playNext, playPrev,
                closePlayer: () => { audioRef.current.pause(); audioRef.current.__activeAyah = null; setIsPlaying(false); isPlayingRef.current = false; setActiveAyah(null); },
                playlists, setPlaylists, selectedAyahs, setSelectedAyahs, activePlaylist, setActivePlaylist,
                fontSize, setFontSize, darkMode, setDarkMode, sortType, setSortType,
                bookmark, setBookmark, fetchDetailsForMatches, loading, loadingText, fetchError, setFetchError, searching,
                displayLimit, setDisplayLimit, jumpTargetRef, skipDisplayResetRef, navigate,
                playbackRate, setPlaybackRate, repeatMode, setRepeatMode,
                toastMessage, showToast, scrollPositionRef, playlistPlaybackRef, playbackPlaylistRef
            };

            return <QuranContext.Provider value={value}>{children}</QuranContext.Provider>;
        };

        const useQuran = () => useContext(QuranContext);

        // --- COMPONENTS ---

        const InfiniteScrollTrigger = ({ onIntersect }) => {
            const ref = useRef();
            const callbackRef = useRef(onIntersect);
            callbackRef.current = onIntersect;

            useEffect(() => {
                if (!ref.current) return;
                const observer = new IntersectionObserver(([entry]) => {
                    if (entry.isIntersecting) callbackRef.current?.();
                }, { threshold: 0.1, rootMargin: '100px' });
                observer.observe(ref.current);
                return () => observer.disconnect();
            }, []);
            return <div ref={ref} className="h-10 w-full flex justify-center items-center" aria-hidden="true"><i className="fa-solid fa-ellipsis fa-fade text-emerald-500"></i></div>;
        };

        const AyahCard = React.memo(({ ayahData }) => {
            const {
                activeAyah, isPlaying, playAyah,
                fontSize, selectedAyahs, setSelectedAyahs,
                playlists, setPlaylists, viewMode, activePlaylist, showToast, bookmark, setBookmark, playlistPlaybackRef
            } = useQuran();

            const [showTafsir, setShowTafsir] = useState(false);
            const [showNotes, setShowNotes] = useState(false);
            const noteRef = useRef(null);
            const [localNote, setLocalNote] = useState("");
            const [footnotes, setFootnotes] = useState([]);
            const [loadingFootnotes, setLoadingFootnotes] = useState(false);
            const [diyanetTafsir, setDiyanetTafsir] = useState(null);
            const [loadingDiyanet, setLoadingDiyanet] = useState(false);

            useEffect(() => {
                let cancelled = false;
                const noteKey = `quran_note_${ayahData.surahNumber}_${ayahData.numberInSurah}`;
                const loadNote = async () => {
                    try {
                        const saved = await dbNotes.get(noteKey);
                        if (cancelled) return;
                        if (saved) {
                            if (typeof saved === 'object' && saved !== null) {
                                setLocalNote(saved.text || JSON.stringify(saved));
                            } else {
                                try {
                                    const parsed = JSON.parse(saved);
                                    setLocalNote(parsed.text || saved);
                                } catch {
                                    setLocalNote(saved);
                                }
                            }
                        } else {
                            setLocalNote(""); // Reset when no note exists for this ayah
                        }
                    } catch (err) {
                        console.error("Failed to load note from IndexedDB", err);
                        if (!cancelled) setLocalNote("");
                    }
                };
                loadNote();
                return () => { cancelled = true; };
            }, [ayahData.surahNumber, ayahData.numberInSurah]);

            const saveNote = async (val) => {
                setLocalNote(val);
                const noteKey = `quran_note_${ayahData.surahNumber}_${ayahData.numberInSurah}`;
                
                try {
                    if (val.trim()) {
                        // Store full ayah data + note text to avoid API calls in MyNotesView
                        const noteData = {
                            text: val,
                            surahNumber: ayahData.surahNumber,
                            numberInSurah: ayahData.numberInSurah,
                            surahName: ayahData.surahName,
                            number: ayahData.number,
                            savedAt: Date.now()
                        };
                        
                        await dbNotes.set(noteKey, noteData);
                    } else {
                        await dbNotes.remove(noteKey);
                    }
                } catch (e) {
                    console.error("Failed to save note to IndexedDB", e);
                }
            };

            useEffect(() => {
                if (showNotes && noteRef.current) {
                    requestAnimationFrame(() => {
                        const rect = noteRef.current.getBoundingClientRect();
                        if (rect.top < 0 || rect.bottom > window.innerHeight) {
                            noteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    });
                }
            }, [showNotes]);

            const handleShare = async () => {
                const deepLink = `${window.location.origin}${window.location.pathname}#quran/${ayahData.surahNumber}/${ayahData.numberInSurah}`;
                const resolvedSurahName = ayahData.surahName || getSurahNameTR(ayahData.surahNumber) || '';
                // WhatsApp/mobile fix: ONLY text field, no url field
                // Link at end without extra newline prevents duplicate preview
                const shareText = `"${ayahData.diyanet}"\n\n— ${resolvedSurahName} Suresi, ${ayahData.numberInSurah}. Ayet — ${deepLink}`;
                if (navigator.share) {
                    try {
                        // ONLY text - no title, no url (these cause duplicate previews on mobile)
                        await navigator.share({ text: shareText });
                    } catch (err) { }
                } else {
                    // Fallback: clipboard
                    try {
                        await navigator.clipboard.writeText(shareText);
                        showToast("Ayet metni kopyalandı!");
                    } catch {
                        showToast("Kopyalama başarısız oldu.");
                    }
                }
            };

            useEffect(() => {
                setFootnotes([]);
                setDiyanetTafsir(null);
            }, [ayahData.surahNumber, ayahData.numberInSurah]);

            useEffect(() => {
                if (showTafsir && footnotes.length === 0) {
                    setLoadingFootnotes(true);
                    fetchWithRetry(`https://api.acikkuran.com/surah/${ayahData.surahNumber}/verse/${ayahData.numberInSurah}?author=105`)
                        .then(r => r.json())
                        .then(data => {
                            if (data.data && data.data.translation && data.data.translation.footnotes) {
                                setFootnotes(data.data.translation.footnotes);
                            }
                        }).catch(err => console.error("Footnote error:", err))
                        .finally(() => setLoadingFootnotes(false));
                }
            }, [showTafsir, ayahData.surahNumber, ayahData.numberInSurah]);

            const globalID = getGlobalAyahID(ayahData.surahNumber, ayahData.numberInSurah);
            const normalizedSurahName = (ayahData.surahName || getSurahNameTR(ayahData.surahNumber) || '').toLowerCase()
                .replace(/â/g,'a').replace(/î/g,'i').replace(/û/g,'u').replace(/ö/g,'o').replace(/ü/g,'u')
                .replace(/ş/g,'s').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i')
                .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
            const diyanetUrl = `https://kuran.diyanet.gov.tr/tefsir/${normalizedSurahName}-suresi/${globalID}/${ayahData.numberInSurah}-ayet-tefsiri`;

            const fetchDiyanetTafsir = async () => {
                if (diyanetTafsir || loadingDiyanet) return;
                setLoadingDiyanet(true);
                try {
                    // CORS Proxy kullanarak Diyanet sitesinden tefsiri çekiyoruz (allorigins hata verdiği için codetabs kullanıyoruz)
                    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(diyanetUrl)}`;
                    const response = await fetch(proxyUrl);
                    const htmlText = await response.text();
                    
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlText, 'text/html');
                    const tefsirDiv = doc.querySelector('.tefsir-text');
                    
                    if (tefsirDiv) {
                        const cleanText = DOMPurify.sanitize(tefsirDiv.innerHTML, {
                            ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'br', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'],
                            ALLOWED_ATTR: ['href', 'target', 'rel']
                        });
                        setDiyanetTafsir(cleanText);
                    } else {
                        setDiyanetTafsir("<p class='text-sm text-red-500'>Tefsir metni bu sayfadan çekilemedi. Lütfen Diyanet'in sitesinden kontrol edin.</p>");
                    }
                } catch (err) {
                    console.error("Diyanet fetch error:", err);
                    setDiyanetTafsir("<p class='text-sm text-red-500'>Tefsir yüklenirken bir hata oluştu (CORS/Proxy).</p>");
                } finally {
                    setLoadingDiyanet(false);
                }
            };

            const renderTextWithMarkers = (text) => {
                if (!text) return "";
                const parts = text.split(/(\[\d+\]|\(\d+\))/g);
                return parts.map((part, i) => {
                    if (part.match(/(\[\d+\]|\(\d+\))/)) {
                        return (
                            <span 
                                key={i} 
                                className="inline-flex items-center justify-center w-5 h-5 ml-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer hover:bg-emerald-200 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setShowTafsir(true); }}
                                title="Açıklamayı gör"
                            >
                                {part.replace(/[\[\]()]/g, '')}
                            </span>
                        );
                    }
                    return part;
                });
            };

            // Decoupled isActive: Only highlight in the appropriate view context.
            // Use playlistPlaybackRef to determine if playback was started FROM playlist_view,
            // not just whether the ayah happens to exist in a playlist.
            const isPlaylistItem = activePlaylist?.items?.some(item => item.number === ayahData.number);
            const isPlaylistPlayback = playlistPlaybackRef.current;

            let isActive = false;
            if (activeAyah?.number === ayahData.number) {
                if (viewMode === 'playlist_view') {
                    isActive = isPlaylistItem; // Playlist view: only highlight playlist items
                } else if (viewMode === 'reader') {
                    isActive = !playlistPlaybackRef.current; // Reader view: only highlight if NOT playlist playback
                } else if (viewMode === 'search') {
                    isActive = true; // Search view: always highlight the playing ayah
                }
            }
            const isSelected = selectedAyahs.some(s => s.number === ayahData.number);

            const toggleSelect = useCallback(() => {
                setSelectedAyahs(prev => prev.some(item => item.number === ayahData.number)
                    ? prev.filter(item => item.number !== ayahData.number)
                    : [...prev, ayahData]);
            }, [ayahData, setSelectedAyahs]);

            const togglePlay = useCallback(() => playAyah(ayahData), [ayahData, playAyah]);

            const [showModal, setShowModal] = useState(false);
            const [newPlaylist, setNewPlaylist] = useState("");

            const closeModal = () => { setShowModal(false); setNewPlaylist(""); };

            const handleAddToPlaylist = (playlistId) => {
                const playlist = playlists.find(p => p.id === playlistId);
                const alreadyIn = playlist?.items.some(i => i.number === ayahData.number);
                if (!alreadyIn) {
                    setPlaylists(prev => prev.map(p =>
                        p.id === playlistId ? { ...p, items: [...p.items, ayahData] } : p
                    ));
                }
                showToast(alreadyIn ? `Zaten '${playlist?.name}' listesinde.` : `'${playlist?.name}' listesine eklendi ✓`);
                closeModal();
            };

            const removeFromPlaylist = () => {
                if (!activePlaylist) return;
                setPlaylists(prev => prev.map(p =>
                    p.id === activePlaylist.id
                        ? { ...p, items: p.items.filter(i => i.number !== ayahData.number) }
                        : p
                ));
            };

            // BISMILLAH_PREFIX is defined at module level; accessed here as a constant
            // Resilient Bismillah detection: strip Arabic harakat (U+064B–U+065F, U+0670)
            // and tatweel (U+0640) so the prefix still matches when the API delivers a
            // slightly different vowel mark or spacing variant.
            const stripHarakat = (s) => String(s || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').trim();
            let displayArabic = ayahData.text;
            let bismillahShown = false;
            const isBismillahCandidate =
                ayahData.numberInSurah === 1 &&
                ayahData.surahNumber !== 1 &&
                ayahData.surahNumber !== 9;
            if (isBismillahCandidate) {
                const bareText = stripHarakat(displayArabic);
                const barePrefix = stripHarakat(BISMILLAH_PREFIX);
                if (bareText.startsWith(barePrefix)) {
                    // Find boundary in original text by walking until stripped count reaches barePrefix length
                    let cut = 0;
                    let stripped = 0;
                    while (cut < displayArabic.length && stripped < barePrefix.length) {
                        const ch = displayArabic[cut];
                        if (!/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/.test(ch)) stripped++;
                        cut++;
                    }
                    // Skip any trailing whitespace after the prefix
                    while (cut < displayArabic.length && /\s/.test(displayArabic[cut])) cut++;
                    displayArabic = displayArabic.substring(cut);
                    bismillahShown = true;
                }
            }

            return (
                <div id={`ayah-${ayahData.number}`} className={`rounded-xl shadow-sm border mb-6 overflow-hidden transition-all duration-300 ${isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 ring-2 ring-emerald-400/50' : 'bg-white dark:bg-black border-slate-200 dark:border-neutral-800'} ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-50/30' : ''}`}>
                    <div className="bg-slate-50 dark:bg-black dark:border-b dark:border-neutral-800 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <button onClick={toggleSelect} aria-label={isSelected ? 'Ayeti seçimden kaldır' : 'Ayeti seç'} aria-pressed={isSelected} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shadow-sm ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 hover:border-emerald-400'}`}>
                                {isSelected && <i className="fa-solid fa-check text-[10px]"></i>}
                            </button>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded">
                                {ayahData.surahName || getSurahNameTR(ayahData.surahNumber)} - {ayahData.numberInSurah}
                            </span>
                        </div>
                        <div className="flex gap-2 relative">
                            <button onClick={handleShare} aria-label="Ayeti paylaş" className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-gray-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-600" title="Paylaş"><i className="fa-solid fa-share-nodes text-xs"></i></button>
                            <button
                                onClick={() => {
                                    const newBookmark = { surah: ayahData.surahName || getSurahNameTR(ayahData.surahNumber) || '', number: ayahData.number, numberInSurah: ayahData.numberInSurah, surahNumber: ayahData.surahNumber };
                                    setBookmark(newBookmark);
                                    safeStorage.setItem('quran_bookmark', JSON.stringify(newBookmark));
                                    showToast(`Yer imi kaydedildi: ${ayahData.surahName || getSurahNameTR(ayahData.surahNumber)} ${ayahData.numberInSurah}. Ayet ✓`);
                                }}
                                aria-label="Yer imi kaydet"
                                title="Yer İmi Kaydet"
                                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                                    bookmark?.number === ayahData.number
                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                                        : 'bg-slate-200 text-slate-600 dark:bg-gray-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-600'
                                }`}
                            ><i className="fa-solid fa-bookmark text-xs"></i></button>
                            <button onClick={() => setShowNotes(!showNotes)} aria-label={showNotes ? 'Notları gizle' : 'Not al'} aria-expanded={showNotes} className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${localNote ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-500' : 'bg-slate-200 text-slate-600 dark:bg-gray-700 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-600'}`} title="Not Al"><i className={`fa-solid ${localNote ? 'fa-comment' : 'fa-pen-to-square'} text-xs`}></i></button>
                            {viewMode === 'playlist_view' ? (
                                <button onClick={removeFromPlaylist} aria-label="Listeden kaldır" className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors" title="Listeden kaldır"><i className="fa-solid fa-eraser text-xs"></i></button>
                            ) : (
                                <button onClick={() => setShowModal(true)} aria-label="Listeye ekle" className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-gray-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-600"><i className="fa-solid fa-folder-plus text-xs"></i></button>
                            )}
                            <button onClick={togglePlay} className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${isActive && isPlaying ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-gray-700 dark:text-slate-300'}`}>
                                {isActive && isPlaying ? <><i className="fa-solid fa-pause"></i> Dur</> : <><i className="fa-solid fa-play"></i> Dinle</>}
                            </button>

                            {/* Mini Playlist Modal */}
                            {showModal && (
                                <>
                                <div className="fixed inset-0 z-40" onClick={closeModal} />
                                <div className="absolute right-0 top-8 z-50 w-48 bg-white dark:bg-black rounded-lg shadow-xl border border-gray-200 dark:border-neutral-800 p-2 fade-in">
                                    <div className="flex justify-between items-center mb-2 pb-2 border-b dark:border-neutral-800">
                                        <span className="text-xs font-bold dark:text-slate-100">Listeye Ekle</span>
                                        <button onClick={closeModal}><i className="fa-solid fa-xmark text-gray-400 dark:text-slate-400"></i></button>
                                    </div>
                                    <ul className="max-h-32 overflow-y-auto mb-2">
                                        {playlists.map(p => {
                                            const alreadyAdded = p.items.some(i => i.number === ayahData.number);
                                            return (
                                                <li key={p.id}><button onClick={() => handleAddToPlaylist(p.id)} className={`w-full text-left text-xs p-1.5 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded truncate flex items-center justify-between gap-1 ${alreadyAdded ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}><span className="truncate">{p.name}</span>{alreadyAdded && <i className="fa-solid fa-check text-[9px] shrink-0"></i>}</button></li>
                                            );
                                        })}
                                    </ul>
                                    <div className="flex gap-1">
                                        <input type="text" value={newPlaylist} onChange={(e) => setNewPlaylist(e.target.value)} placeholder="Yeni Liste" className="w-full text-xs p-1 bg-white border border-gray-200 rounded outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white" />
                                        <button onClick={() => { if (newPlaylist) { const p = { id: Date.now(), name: newPlaylist, items: [ayahData] }; setPlaylists(prevPlaylists => [...prevPlaylists, p]); showToast(`'${newPlaylist}' listesi oluşturuldu ve ayet eklendi ✓`); closeModal(); } }} className="bg-emerald-600 text-white px-2 rounded hover:bg-emerald-700"><i className="fa-solid fa-plus text-xs"></i></button>
                                    </div>
                                </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="text-right mb-6 leading-loose" dir="rtl">
                            <div className="space-y-2">
                                {bismillahShown && (
                                    <div className="text-center mb-6 font-arabic text-emerald-600 dark:text-emerald-400 opacity-80" style={{ fontSize: `${fontSize * 1.8}px` }}>{BISMILLAH_PREFIX}</div>
                                )}
                                <p className="font-arabic text-slate-800 dark:text-slate-100" style={{ fontFamily: "'Amiri', serif", fontSize: `${fontSize + 12}px` }}>{displayArabic}</p>
                            </div>
                        </div>
                        <div className="mb-6 p-3 bg-slate-50 dark:bg-gray-800/60 rounded-lg border-l-4 border-slate-300 dark:border-gray-500">
                            <h4 className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1 font-bold">Türkçe Okunuş</h4>
                            <p className="italic text-slate-600 dark:text-slate-200" style={{ fontSize: `${fontSize - 2}px` }}>{ayahData.transliteration}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-500 mb-2 flex items-center gap-1">Diyanet Vakfı</h4>
                                <p className="text-slate-800 dark:text-slate-200 leading-relaxed" style={{ fontSize: `${fontSize}px` }}>{renderTextWithMarkers(ayahData.diyanet)}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-neutral-700">
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Elmalılı Hamdi Yazır</h4>
                                    <p className="text-slate-600 dark:text-slate-200 leading-relaxed" style={{ fontSize: `${fontSize - 1}px` }}>{ayahData.yazir}</p>
                                </div>
                                <div className="p-4 rounded-lg bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-neutral-700">
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Süleyman Ateş</h4>
                                    <p className="text-slate-600 dark:text-slate-200 leading-relaxed" style={{ fontSize: `${fontSize - 1}px` }}>{ayahData.ates}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-center border-t border-slate-100 dark:border-neutral-800 pt-5">
                            <button onClick={() => setShowTafsir(!showTafsir)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${showTafsir ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-emerald-600 dark:bg-transparent dark:border-neutral-700 dark:text-slate-400 dark:hover:bg-neutral-800'}`}>
                                <i className={`fa-solid ${showTafsir ? 'fa-chevron-up' : 'fa-book-open'}`}></i>
                                {showTafsir ? 'Tefsir ve Mealleri Gizle' : 'Tefsir ve Diğer Mealleri Gör'}
                            </button>
                        </div>

                        {showNotes && (
                            <div ref={noteRef} className="mt-6 p-4 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2"><i className="fa-solid fa-pen-nib"></i> Notunuz</h4>
                                    {localNote && (
                                        <button onClick={() => { saveNote(''); }} className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200/50 dark:border-red-800/30 hover:scale-105 active:scale-95 transition-all shadow-sm" title="Notu sil">
                                            <i className="fa-solid fa-eraser text-sm"></i>
                                        </button>
                                    )}
                                </div>
                                <textarea value={localNote} onChange={(e) => saveNote(e.target.value)} placeholder="Notlarınızı buraya yazabilirsiniz..." className="w-full h-24 p-3 text-sm bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-900/30 rounded focus:ring-2 focus:ring-amber-500 outline-none resize-none dark:text-slate-200" />
                            </div>
                        )}

                        {showTafsir && (
                            <div className="mt-6 space-y-4 pt-4 border-t dark:border-neutral-800">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-neutral-700">
                                        <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">Yaşar Nuri Öztürk</h4>
                                        <p className="text-slate-600 dark:text-slate-200 leading-relaxed" style={{ fontSize: `${fontSize - 1}px` }}>{ayahData.ozturk}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-neutral-700">
                                        <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">Suat Yıldırım</h4>
                                        <p className="text-slate-600 dark:text-slate-200 leading-relaxed" style={{ fontSize: `${fontSize - 1}px` }}>{ayahData.yildirim}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-neutral-700">
                                        <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">Edip Yüksel</h4>
                                        <p className="text-slate-600 dark:text-slate-200 leading-relaxed" style={{ fontSize: `${fontSize - 1}px` }}>{ayahData.yuksel}</p>
                                    </div>
                                </div>
                                {loadingFootnotes ? <div className="text-center p-2"><i className="fa-solid fa-spinner fa-spin text-emerald-500"></i></div> : footnotes.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-emerald-600 flex items-center gap-2"><i className="fa-solid fa-circle-info"></i> Açıklamalar</h4>
                                        {footnotes.map((fn, idx) => (
                                            <div key={idx} className="p-3 rounded bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100/50 dark:border-emerald-800/50 text-sm text-slate-700 dark:text-slate-200">{fn.text}</div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t dark:border-neutral-800">
                                    <h4 className="text-xs font-bold text-emerald-600 mb-3 flex items-center justify-between">
                                        <span>Diyanet İşleri (Kur'an Yolu) Tefsiri</span>
                                        <a href={diyanetUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600/70 hover:text-emerald-600 dark:text-emerald-500/70 dark:hover:text-emerald-400 transition-colors flex items-center gap-1" title="Diyanet sitesinde aç">
                                            Orijinal Kaynak <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                        </a>
                                    </h4>
                                    
                                    {loadingDiyanet ? (
                                        <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 py-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                            <i className="fa-solid fa-spinner fa-spin"></i> Tefsir metni çekiliyor...
                                        </div>
                                    ) : diyanetTafsir ? (
                                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-800/40 p-4 rounded-lg border dark:border-neutral-800 max-h-96 overflow-y-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: diyanetTafsir }} />
                                    ) : (
                                        <button onClick={fetchDiyanetTafsir} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-xs font-bold shadow-sm active:scale-[0.99]">
                                            <i className="fa-solid fa-cloud-arrow-down"></i> Tefsir Metnini Buraya Getir
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        });

        const PlayerBar = () => {
            const { activeAyah, isPlaying, playAyah, closePlayer, playNext, playPrev, audioRef, playbackRate, setPlaybackRate, repeatMode, setRepeatMode, fetchSurah, surahs, activeSurah, jumpTargetRef, setViewMode, activePlaylist, setActivePlaylist, viewMode, playlistPlaybackRef, playbackPlaylistRef, ayahs, setDisplayLimit, skipDisplayResetRef } = useQuran();

            // Local state for high-frequency updates
            const [currentTime, setCurrentTime] = useState(0);
            const [duration, setDuration] = useState(0);

            useEffect(() => {
                const audio = audioRef.current;
                if (!audio) return;

                const updateTime = () => setCurrentTime(audio.currentTime);
                const updateDuration = () => setDuration(audio.duration || 0);

                // Initial sync
                setCurrentTime(audio.currentTime);
                setDuration(audio.duration || 0);

                audio.addEventListener('timeupdate', updateTime);
                audio.addEventListener('loadedmetadata', updateDuration);

                return () => {
                    audio.removeEventListener('timeupdate', updateTime);
                    audio.removeEventListener('loadedmetadata', updateDuration);
                };
            }, []); // Stabilize - sadece mount/unmount'ta çalışır, audioRef stable

            const seek = (time) => {
                if (audioRef.current) {
                    audioRef.current.currentTime = time;
                    setCurrentTime(time);
                }
            };

            const scrollToActiveAyah = () => {
                if (!activeAyah) return;
                
                // Check if current playback is from a playlist
                const isPlaylistPlayback = playlistPlaybackRef.current && !!playbackPlaylistRef.current;
                
                // If playlist playback, go to playlist view; otherwise go to reader view
                const targetViewMode = isPlaylistPlayback ? 'playlist_view' : 'reader';
                const needsViewChange = viewMode !== targetViewMode;
                
                if (isPlaylistPlayback) {
                    // Restore the active playlist if it was changed
                    if (activePlaylist?.id !== playbackPlaylistRef.current?.id) {
                        setActivePlaylist(playbackPlaylistRef.current);
                    }
                }
                
                if (needsViewChange) {
                    setViewMode(targetViewMode);
                }
                
                // If playlist playback, or normal playback with SAME surah: retry scroll to find the element
                const targetSurahNum = parseInt(activeAyah.surahNumber);
                const targetAyahNum = parseInt(activeAyah.numberInSurah);
                const isSameSurah = !isPlaylistPlayback && activeSurah?.number === targetSurahNum;

                if (isSameSurah) {
                    const target = ayahs.find(a => a.numberInSurah === targetAyahNum);
                    if (target) {
                        const idx = ayahs.indexOf(target);
                        if (needsViewChange) {
                            skipDisplayResetRef.current = true;
                        }
                        setDisplayLimit(Math.max(idx + 10, 10));
                    }
                }

                if (isPlaylistPlayback || isSameSurah) {
                    let attempts = 0;
                    const maxAttempts = 15; // Up to 1.5 seconds to account for slower devices
                    const tryScroll = () => {
                        const el = document.getElementById(`ayah-${activeAyah.number}`);
                        if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return;
                        }
                        if (++attempts < maxAttempts) {
                            setTimeout(tryScroll, 100);
                        }
                    };
                    setTimeout(tryScroll, needsViewChange ? 150 : 50);
                } else {
                    // Different surah in normal playback: fetch the surah
                    if (!targetSurahNum || !targetAyahNum) return;
                    const s = surahs.find(x => x.number === targetSurahNum);
                    if (!s) return;
                    jumpTargetRef.current = { ayahNumber: targetAyahNum, shouldPlay: false };
                    fetchSurah(s);
                }
            };

            // Klavye kısayolları
            useEffect(() => {
                const handleKey = (e) => {
                    if (!activeAyah) return;
                    const tag = e.target.tagName;
                    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
                    if (e.code === 'Space') { e.preventDefault(); playAyah(activeAyah); }
                    else if (e.code === 'ArrowRight') { e.preventDefault(); playNext(); }
                    else if (e.code === 'ArrowLeft') { e.preventDefault(); playPrev(); }
                };
                window.addEventListener('keydown', handleKey);
                return () => window.removeEventListener('keydown', handleKey);
            }, [activeAyah, playAyah, playNext, playPrev]);

            if (!activeAyah) return null;

            return (
                <div role="region" aria-label="Ses çalar" className="absolute bottom-2 left-2 right-2 md:left-1/2 md:right-auto transform md:-translate-x-1/2 md:w-[600px] bg-white dark:bg-black border border-emerald-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-2 md:pt-1.5 md:pb-2 md:px-3 z-50 flex flex-col gap-1 md:gap-1.5 transition-transform duration-300 pb-[calc(env(safe-area-inset-bottom)+8px)] md:pb-[calc(env(safe-area-inset-bottom)+4px)]">
                    
                    {/* Row 1: Title & Close Button (Unified for both Mobile & Desktop) */}
                    <div className="flex items-center justify-between px-2 pt-0.5 md:pt-0">
                        <button onClick={scrollToActiveAyah} className="flex-1 min-w-0 pr-2 text-left group flex items-center gap-2" title="Ayete git" aria-label={`${activeAyah.surahName} ${activeAyah.numberInSurah}. ayete git`}>
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate group-hover:text-emerald-600 transition-colors">
                                {activeAyah.surahName} {activeAyah.numberInSurah}. Ayet 
                            </h3>
                            <span className="text-[10px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 border border-emerald-100 dark:border-emerald-800/50">
                                Git <i className="fa-solid fa-location-crosshairs text-[10px]"></i>
                            </span>
                        </button>
                        <button onClick={closePlayer} aria-label="Çaları kapat" className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center shrink-0 ml-1 transition-colors">
                            <i className="fa-solid fa-xmark text-xs md:text-sm"></i>
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full flex items-center gap-2 px-2">
                        <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono w-8 text-right">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={(e) => seek(Number(e.target.value))}
                            aria-label="Ses ilerleme çubuğu"
                            className="flex-1 h-1.5 md:h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-emerald-600"
                        />
                        <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono w-8">{formatTime(duration)}</span>
                    </div>

                    <div className="px-2 pb-1">
                        <div className="flex items-center justify-between w-full gap-2">
                            {/* Left: Playback speed */}
                            <div className="flex-1 flex justify-start">
                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shrink-0 h-8 border border-gray-200 dark:border-neutral-800 shadow-inner">
                                    <button onClick={() => setPlaybackRate(prev => Math.round(Math.max(0.5, prev - 0.25) * 100) / 100)} className="w-6 h-full flex items-center justify-center text-[14px] font-bold text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-emerald-600 transition-colors" title="Yavaşlat" aria-label="Oynatma hızını azalt">-</button>
                                    <span className="w-7 md:w-8 text-center text-[10px] font-bold text-emerald-600 select-none" aria-label={`Oynatma hızı: ${playbackRate}x`}>{playbackRate}x</span>
                                    <button onClick={() => setPlaybackRate(prev => Math.round(Math.min(2.0, prev + 0.25) * 100) / 100)} className="w-6 h-full flex items-center justify-center text-[14px] font-bold text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-emerald-600 transition-colors" title="Hızlandır" aria-label="Oynatma hızını artır">+</button>
                                </div>
                            </div>

                            {/* Center: Playback buttons (Prev, Play/Pause, Next) */}
                            <div className="flex items-center justify-center gap-3 shrink-0">
                                <button onClick={playPrev} aria-label="Önceki ayet" className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors active:scale-95"><i className="fa-solid fa-backward-step text-xs"></i></button>
                                <button onClick={() => playAyah(activeAyah)} aria-label={isPlaying ? 'Dur' : 'Oynat'} className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                                    {isPlaying ? <i className="fa-solid fa-pause"></i> : <i className="fa-solid fa-play ml-1"></i>}
                                </button>
                                <button onClick={playNext} aria-label="Sonraki ayet" className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors active:scale-95"><i className="fa-solid fa-forward-step text-xs"></i></button>
                            </div>

                            {/* Right: Repeat Mode */}
                            <div className="flex-1 flex justify-end items-center gap-2">
                                <button onClick={() => setRepeatMode(prev => prev === 'none' ? 'one' : prev === 'one' ? 'all' : 'none')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors relative ${repeatMode !== 'none' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-emerald-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`} title={repeatMode === 'none' ? "Tekrar Kapalı" : repeatMode === 'one' ? "Tek Ayeti Tekrarla" : "Tüm Listeyi Tekrarla"} aria-label={repeatMode === 'none' ? 'Tekrar kapalı, tekrar modunu değiştir' : repeatMode === 'one' ? 'Tek ayet tekrar modu, değiştir' : 'Tüm liste tekrar modu, değiştir'} aria-pressed={repeatMode !== 'none'}>
                                    <i className="fa-solid fa-repeat text-xs"></i>
                                    {repeatMode === 'one' && <span className="absolute text-[8px] font-bold bottom-1 right-1.5 bg-white dark:bg-black rounded-full w-3 h-3 flex items-center justify-center leading-none border border-emerald-100 dark:border-neutral-800">1</span>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };


        const SurahList = React.memo(() => {
            const { sortedSurahs, activeSurah, fetchSurah, sortType, setSortType } = useQuran();

            return (
                <div className="h-full overflow-y-auto bg-slate-50 border-r border-slate-200 dark:bg-black dark:border-neutral-800 w-full md:w-64 flex-shrink-0 hidden md:block">
                    <div className="p-4 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-black sticky top-0 z-10 flex justify-between items-center">
                        <h2 className="font-bold text-slate-700 dark:text-slate-200"><i className="fa-solid fa-book-open text-emerald-600 mr-2"></i> Sureler</h2>
                        <button onClick={() => setSortType(prev => prev === 'mushaf' ? 'revelation' : 'mushaf')} aria-label={sortType === 'mushaf' ? 'İniş sırasına göre sırala' : 'Mushaf sırasına göre sırala'} className="text-xs bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-200 px-2 py-1 rounded hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1">
                            <i className={`fa-solid ${sortType === 'mushaf' ? 'fa-arrow-down-1-9' : 'fa-clock-rotate-left'}`}></i>
                            {sortType === 'mushaf' ? 'Sıra' : 'İniş'}
                        </button>
                    </div>
                    <ul>
                        {sortedSurahs.map((surah) => (
                            <li key={surah.number}>
                                <button onClick={() => fetchSurah(surah)} aria-label={`${surah.englishName} suresi${activeSurah?.number === surah.number ? ', aktif sure' : ''}`} aria-current={activeSurah?.number === surah.number ? 'true' : undefined} className={`w-full text-left p-3 hover:bg-emerald-50 dark:hover:bg-gray-800 border-b border-slate-100 dark:border-neutral-800 flex justify-between items-center ${activeSurah?.number === surah.number ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-semibold' : 'text-slate-700 dark:text-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="bg-slate-200 dark:bg-gray-700 dark:text-slate-200 text-xs w-6 h-6 flex items-center justify-center rounded-full">{surah.number}</span>
                                        <div className="flex flex-col">
                                            <span className="dark:text-slate-100">{getSurahNameTR(surah.number)} <span className="text-xs text-slate-500 dark:text-slate-400" style={{fontFamily:"'Amiri',serif"}}>({getSurahNameAR(surah.number)})</span></span>
                                            {sortType !== 'mushaf' && <span className="text-[10px] text-slate-400 dark:text-slate-400">İniş: {REVELATION_ORDER_MAP[surah.number]}</span>}
                                        </div>
                                    </div>
                                    {activeSurah?.number === surah.number && <i className="fa-solid fa-chevron-right text-xs"></i>}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            );
        });

        // MyNotesView is declared BEFORE MainContent to avoid TDZ
        // (MainContent references <MyNotesView /> in its JSX return).
        const MyNotesView = () => {
            const { showToast, surahs, fetchSurah, setViewMode, viewMode, jumpTargetRef, fetchDetailsForMatches, navigate } = useQuran();
            const [notes, setNotes] = useState([]);
            const [ayahDetails, setAyahDetails] = useState({});
            const mountedRef = useRef(true);
            
            useEffect(() => {
                return () => { mountedRef.current = false; };
            }, []);

            // Cycling notes search placeholder to prevent cutoff on mobile screens
            const [notePlaceholderIdx, setNotePlaceholderIdx] = useState(0);
            const notePlaceholders = [
                "Notlarında ara... (Örn: şüphesiz)",
                "Sure/ayet ile ara... (Örn: Bakara 183)",
                "Meal veya notta ara... (Örn: sabır)"
            ];

            useEffect(() => {
                const timer = setInterval(() => {
                    setNotePlaceholderIdx(prev => (prev + 1) % notePlaceholders.length);
                }, 3500);
                return () => clearInterval(timer);
            }, []);

            // Load notes with on-the-fly RAM-based hydration - NO persistent storage overhead!
            const loadNotesFromStorage = useCallback(async () => {
                    const loadedNotes = [];
                    const details = {};
                    const toHydrate = [];

                    let dbEntries = [];
                    try {
                        dbEntries = await dbNotes.getAll();
                    } catch (e) {
                        console.error("Failed to load notes from DB", e);
                    }

                    for (const { key, value: noteDataRaw } of dbEntries) {
                        if (!key.startsWith('quran_note_')) continue;
                        const match = key.match(/quran_note_(\d+)_(\d+)/);
                        
                        if (match && noteDataRaw) {
                            const surahNum = parseInt(match[1]);
                            const ayahNum = parseInt(match[2]);
                            
                            try {
                                let noteData = noteDataRaw;
                                if (typeof noteData === 'string') {
                                    try {
                                        noteData = JSON.parse(noteData);
                                    } catch {
                                        noteData = { text: noteDataRaw };
                                    }
                                }
                                
                                // Handle both new lightweight structure and legacy stored structure
                                const noteText = noteData.text || (typeof noteDataRaw === 'string' ? noteDataRaw : JSON.stringify(noteDataRaw));
                                const surahName = noteData.surahName || getSurahNameTR(surahNum);
                                
                                loadedNotes.push({
                                    key,
                                    surahNum,
                                    ayahNum,
                                    surahName,
                                    noteText
                                });
                                
                                if (noteData.arabicText) {
                                    // Legacy structure: use cached text directly
                                    details[key] = {
                                        number: noteData.number,
                                        numberInSurah: noteData.numberInSurah,
                                        surahName: noteData.surahName,
                                        surahNumber: noteData.surahNumber,
                                        text: noteData.arabicText,
                                        transliteration: noteData.transliteration,
                                        diyanet: noteData.diyanet,
                                        yazir: noteData.yazir,
                                        ates: noteData.ates,
                                        ozturk: noteData.ozturk,
                                        yildirim: noteData.yildirim,
                                        yuksel: noteData.yuksel,
                                        audio: noteData.audio
                                    };
                                } else {
                                    // New structure: queue for RAM-based background hydration
                                    toHydrate.push({
                                        key,
                                        surah: { number: surahNum },
                                        numberInSurah: ayahNum
                                    });
                                }
                            } catch {
                                // Plain text legacy fallback
                                loadedNotes.push({
                                    key,
                                    surahNum,
                                    ayahNum,
                                    surahName: getSurahNameTR(surahNum),
                                    noteText: typeof noteDataRaw === 'string' ? noteDataRaw : JSON.stringify(noteDataRaw)
                                });
                                toHydrate.push({
                                    key,
                                    surah: { number: surahNum },
                                    numberInSurah: ayahNum
                                });
                            }
                        }
                    }
                    
                    loadedNotes.sort((a, b) => {
                        if (a.surahNum !== b.surahNum) return a.surahNum - b.surahNum;
                        return a.ayahNum - b.ayahNum;
                    });
                    
                    // Only update state if component still mounted
                    if (!mountedRef.current) return;
                    setNotes(loadedNotes);
                    setAyahDetails(details);

                    // Fetch details dynamically in chunks of 5 and enrich state (in-memory only)
                    if (toHydrate.length > 0) {
                        try {
                            const chunkSizes = 5;
                            for (let i = 0; i < toHydrate.length; i += chunkSizes) {
                                const chunk = toHydrate.slice(i, i + chunkSizes);
                                const matches = chunk.map(p => ({ surah: p.surah, numberInSurah: p.numberInSurah }));
                                const fetchedDetails = await fetchDetailsForMatches(matches);
                                
                                // Skip if component unmounted during fetch
                                if (!mountedRef.current) return;
                                
                                setAyahDetails(prev => {
                                    const next = { ...prev };
                                    fetchedDetails.forEach(d => {
                                        const noteKey = `quran_note_${d.surahNumber}_${d.numberInSurah}`;
                                        next[noteKey] = d;
                                    });
                                    return next;
                                });
                            }
                        } catch (err) {
                            console.error("Notes dynamic hydration failed:", err);
                        }
                    }
            }, [fetchDetailsForMatches, mountedRef]);

            // Load notes once on mount; also callable by importNotes for in-place refresh
            useEffect(() => { loadNotesFromStorage(); }, []);

            const deleteNote = async (key) => {
                try {
                    await dbNotes.remove(key);
                } catch (e) {
                    console.error("Failed to delete note", e);
                }
                setNotes(prev => prev.filter(n => n.key !== key));
                showToast('Not silindi.');
            };

            const navigateToAyah = (note) => {
                const surah = surahs.find(s => s.number === note.surahNum);
                if (surah) {
                    jumpTargetRef.current = { ayahNumber: note.ayahNum, shouldPlay: false };
                    fetchSurah(surah); // fetchSurah calls navigate('reader') internally
                }
            };

            const exportNotes = async () => {
                if (notes.length === 0) { showToast('Kaydedilmiş not yok.'); return; }
                try {
                    const dbEntries = await dbNotes.getAll();
                    const notesObj = {};
                    dbEntries.forEach(n => {
                        notesObj[n.key] = n.value;
                    });
                    const blob = new Blob([JSON.stringify(notesObj, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url;
                    a.download = `kuran-notlar-${new Date().toISOString().slice(0,10)}.json`; a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                    showToast(`${notes.length} not yedeklendi.`);
                } catch (e) {
                    console.error("Failed to export notes", e);
                    showToast('Yedekleme sırasında hata oluştu.');
                }
            };

            const importNotes = (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        let count = 0;
                        const promises = [];
                        for (const [k, v] of Object.entries(data)) {
                            if (k.startsWith('quran_note_')) {
                                let valToStore = v;
                                if (typeof v === 'string') {
                                    try {
                                        valToStore = JSON.parse(v);
                                    } catch {
                                        valToStore = v;
                                    }
                                }
                                promises.push(dbNotes.set(k, valToStore));
                                count++;
                            }
                        }
                        await Promise.all(promises);
                        // Reload notes in-memory without requiring a page refresh
                        await loadNotesFromStorage();
                        showToast(`${count} not yüklendi.`);
                    } catch (err) { 
                        console.error("Import notes failed", err);
                        showToast('Geçersiz dosya formatı.'); 
                    }
                };
                reader.onerror = () => showToast('Dosya okunamadı.');
                reader.readAsText(file);
                e.target.value = '';
            };


            const [noteSearchQuery, setNoteSearchQuery] = useState('');
            
            const filteredNotes = useMemo(() => {
                const queryRaw = noteSearchQuery.trim();
                if (!queryRaw) return notes;
                
                const normQuery = normalizeText(queryRaw);
                
                // Regex to capture Surah Name + Verse Number, e.g. "bakara 183" or "ali imran 5"
                const surahAyahRegex = /^(.+?)\s+(\d+)$/;
                const regexMatch = normQuery.match(surahAyahRegex);
                
                return notes.filter(note => {
                    const ayahData = ayahDetails[note.key];
                    const normSurahName = normalizeText(note.surahName);
                    const normNoteText = normalizeText(note.noteText);
                    
                    // 1. Exact Surah + Ayah number match (e.g., "bakara 183")
                    if (regexMatch) {
                        const querySurah = regexMatch[1];
                        const queryAyahNum = parseInt(regexMatch[2]);
                        
                        if (normSurahName.includes(querySurah) && note.ayahNum === queryAyahNum) {
                            return true;
                        }
                    }
                    
                    // 2. Multi-term, multi-field search (checks Surah name, Ayah number, Note text, and all translations)
                    const queryTerms = normQuery.split(/\s+/).filter(Boolean);
                    
                    return queryTerms.every(term => {
                        if (normSurahName.includes(term)) return true;
                        if (String(note.ayahNum) === term) return true;
                        if (normNoteText.includes(term)) return true;
                        
                        if (ayahData) {
                            // Check Arabic text
                            if (ayahData.text && ayahData.text.includes(term)) return true;
                            // Check Transliteration
                            if (ayahData.transliteration && normalizeText(ayahData.transliteration).includes(term)) return true;
                            // Check all available translations (meals)
                            if (ayahData.diyanet && normalizeText(ayahData.diyanet).includes(term)) return true;
                            if (ayahData.yazir && normalizeText(ayahData.yazir).includes(term)) return true;
                            if (ayahData.ates && normalizeText(ayahData.ates).includes(term)) return true;
                            if (ayahData.ozturk && normalizeText(ayahData.ozturk).includes(term)) return true;
                            if (ayahData.yildirim && normalizeText(ayahData.yildirim).includes(term)) return true;
                            if (ayahData.yuksel && normalizeText(ayahData.yuksel).includes(term)) return true;
                        }
                        return false;
                    });
                });
            }, [notes, noteSearchQuery, ayahDetails]);

            return (
                <div className="fade-in transition-colors duration-300">
                    {/* Header Section - Professional UI Pattern */}
                    <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 dark:text-slate-100">
                                <i className="fa-solid fa-comment text-emerald-600"></i> Notlarım
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{notes.length} not kaydedildi</p>
                        </div>
                        <div className="flex gap-2 items-center">
                            <button title="Tüm notları yedek olarak bilgisayarına kaydet" onClick={exportNotes} className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg font-bold shadow-sm transition-colors shrink-0">
                                <i className="fa-solid fa-file-export"></i> Yedekle
                            </button>
                            <label title="Daha önce kaydettiğin notları yükle" className="flex items-center gap-1.5 text-xs bg-white dark:bg-black border border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2.5 py-1.5 rounded-lg font-bold shadow-sm cursor-pointer transition-colors shrink-0">
                                <i className="fa-solid fa-file-import"></i> Yükle
                                <input type="file" accept=".json" className="hidden" onChange={importNotes} />
                            </label>
                        </div>
                    </div>

                    {/* Search in Notes */}
                    <div className="mb-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={notePlaceholders[notePlaceholderIdx]}
                                value={noteSearchQuery}
                                onChange={(e) => setNoteSearchQuery(e.target.value)}
                                className="w-full p-2.5 pl-10 pr-8 rounded-lg text-sm bg-white dark:bg-black border border-gray-200 dark:border-neutral-700 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-colors"
                            />
                            <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            {noteSearchQuery && (
                                <button
                                    onClick={() => setNoteSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500"
                                >
                                    <i className="fa-solid fa-xmark text-xs"></i>
                                </button>
                            )}
                        </div>
                        {noteSearchQuery && (
                            <p className="text-xs text-gray-500 mt-1.5">
                                {filteredNotes.length} sonuç bulundu
                            </p>
                        )}
                    </div>

                    {/* Empty State */}
                    {notes.length === 0 && (
                        <div className="text-center py-16 bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-neutral-800">
                            <i className="fa-solid fa-comment text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                            <p className="text-gray-500 dark:text-slate-400">Henüz not oluşturmadınız.</p>
                            <p className="text-sm text-gray-400 dark:text-slate-500 mt-2">Ayet kartlarındaki <i className="fa-solid fa-pen-to-square text-xs"></i> butonu ile not ekleyin.</p>
                        </div>
                    )}

                    {/* Notes List with Ayah Cards */}
                    <div className="space-y-6">
                        {filteredNotes.map((note) => {
                            const ayahData = ayahDetails[note.key];
                            if (!ayahData) {
                                // Old note without stored ayah data - show note only with uniform styling
                                return (
                                    <div key={note.key} className="bg-white dark:bg-black rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden">
                                        {/* Header with surah info */}
                                        <div className="p-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded">
                                                    {note.surahName} {note.ayahNum}
                                                </span>
                                                <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                                                    <i className="fa-solid fa-circle-info mr-1"></i>Eski format
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Note Section - Uniform with Reader View */}
                                        <div className="mt-5 mx-4 mb-4 pt-5 border-t border-slate-100 dark:border-neutral-800">
                                            <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2">
                                                        <i className="fa-solid fa-pen-nib"></i> Notunuz
                                                    </h4>
                                                    <div className="flex gap-2.5 items-center">
                                                        <button 
                                                            onClick={() => navigateToAyah(note)} 
                                                            className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200/50 dark:border-emerald-800/30 hover:scale-105 active:scale-95 transition-all shadow-sm" 
                                                            title="Ayete git"
                                                        >
                                                            <i className="fa-solid fa-arrow-right-to-bracket text-sm"></i>
                                                        </button>
                                                        <button 
                                                            onClick={() => deleteNote(note.key)} 
                                                            className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200/50 dark:border-red-800/30 hover:scale-105 active:scale-95 transition-all shadow-sm" 
                                                            title="Notu sil"
                                                        >
                                                            <i className="fa-solid fa-eraser text-sm"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                                    {note.noteText}
                                                </p>
                                                <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-3 italic">
                                                    Bu notu güncellemek için sureye gidip tekrar kaydedebilirsiniz.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={note.key} className="bg-white dark:bg-black rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden">
                                    {/* Ayah Card */}
                                    <AyahCard ayahData={ayahData} />
                                    
                                    {/* Note Section - Uniform with Reader View */}
                                    <div className="mt-5 mx-4 mb-4 pt-5 border-t border-slate-100 dark:border-neutral-800">
                                        <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2">
                                                    <i className="fa-solid fa-pen-nib"></i> Notunuz
                                                </h4>
                                                <div className="flex gap-2.5 items-center">
                                                    <button 
                                                        onClick={() => navigateToAyah(note)} 
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200/50 dark:border-emerald-800/30 hover:scale-105 active:scale-95 transition-all shadow-sm" 
                                                        title="Ayete git"
                                                    >
                                                        <i className="fa-solid fa-arrow-right-to-bracket text-sm"></i>
                                                    </button>
                                                    <button 
                                                        onClick={() => deleteNote(note.key)} 
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200/50 dark:border-red-800/30 hover:scale-105 active:scale-95 transition-all shadow-sm" 
                                                        title="Notu sil"
                                                    >
                                                        <i className="fa-solid fa-eraser text-sm"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                                {note.noteText}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* No search results */}
                        {filteredNotes.length === 0 && noteSearchQuery && (
                            <div className="text-center py-8 bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-neutral-800">
                                <i className="fa-solid fa-magnifying-glass text-2xl text-gray-300 dark:text-gray-600 mb-2"></i>
                                <p className="text-gray-500 dark:text-slate-400 text-sm">"{noteSearchQuery}" için sonuç bulunamadı</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        const MainContent = () => {
            const {
                viewMode, setViewMode, activeSurah, ayahs,
                searching, searchQuery, handleSearch, currentSearchTerm, rawMatches, setRawMatches, detailedResults, setDetailedResults, fetchDetailsForMatches,
                loading, loadingText, fetchError, playlists, activePlaylist, setActivePlaylist, setPlaylists,
                selectedAyahs, setSelectedAyahs, bookmark, fetchSurah, surahs, sortType, setSortType, sortedSurahs,
                activeAyah, isPlaying, displayLimit, setDisplayLimit, jumpTargetRef, skipDisplayResetRef, closePlayer, showToast, scrollPositionRef,
                playlistPlaybackRef, playbackPlaylistRef
            } = useQuran();

            // Initialize lastScrolledAyah to activeAyah.number if returning to a saved scroll position,
            // to bypass the initial smooth auto-scroll and jump instantly.
            const lastScrolledAyah = useRef(scrollPositionRef.current > 0 ? activeAyah?.number : null);

            // Smart Scroll Detection - Hide/Show Mobile Surah Select on scroll
            const [showMobileSelect, setShowMobileSelect] = useState(true);
            const lastScrollY = useRef(0);
            const ticking = useRef(false);

            useEffect(() => {
                const mainScroll = document.getElementById('main-scroll');
                if (!mainScroll) return;

                const handleScroll = () => {
                    if (!ticking.current) {
                        requestAnimationFrame(() => {
                            const currentScrollY = mainScroll.scrollTop;
                            const scrollDelta = currentScrollY - lastScrollY.current;

                            // Show when scrolling up, hide when scrolling down
                            // Only trigger after scrolling 10px to avoid micro-jitters
                            if (scrollDelta < -10) {
                                setShowMobileSelect(true);
                            } else if (scrollDelta > 10) {
                                setShowMobileSelect(false);
                            }

                            lastScrollY.current = currentScrollY;
                            ticking.current = false;
                        });
                        ticking.current = true;
                    }
                };

                mainScroll.addEventListener('scroll', handleScroll, { passive: true });
                return () => mainScroll.removeEventListener('scroll', handleScroll);
            }, []);

            // Sure değişince scroll hafızasını sıfırla
            useEffect(() => { lastScrolledAyah.current = null; }, [activeSurah]);

            // Auto-scroll to active ayah
            useEffect(() => {
                if (activeAyah) {
                    // Cross-surah protection IN READER MODE: 
                    // If user navigated to a different surah while playback continues,
                    // don't force scroll - let them stay where they are reading.
                    // Other views (search, notes, playlist) should still scroll.
                    if (viewMode === 'reader' && activeAyah.surahNumber !== activeSurah?.number) {
                        lastScrolledAyah.current = activeAyah.number;
                        return;
                    }

                    // DECOUPLING: Don't auto-scroll in reader view when playback was started from playlist_view.
                    // Use playlistPlaybackRef (the authoritative origin flag) instead of checking whether
                    // the ayah happens to exist in a playlist — that would incorrectly suppress scrolling
                    // when the user plays a reader ayah that also appears in a playlist.
                    if (viewMode === 'reader' && playlistPlaybackRef.current) {
                        lastScrolledAyah.current = activeAyah.number;
                        return;
                    }

                    // Handle lazy loading for reader mode
                    if (viewMode === 'reader') {
                        const idx = ayahs.findIndex(a => a.number === activeAyah.number);
                        if (idx !== -1 && idx >= displayLimit) {
                            setDisplayLimit(idx + 5);
                            return; // Wait for render to scroll
                        }
                    }

                    if (activeAyah.number !== lastScrolledAyah.current) {
                        // Retry-based scroll — handles lazy loading and render delays
                        let attempts = 0;
                        const maxAttempts = 10; // 10 x 100ms = 1s total
                        const tryScroll = () => {
                            const el = document.getElementById(`ayah-${activeAyah.number}`);
                            if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                lastScrolledAyah.current = activeAyah.number;
                                return;
                            }
                            if (++attempts < maxAttempts) {
                                setTimeout(tryScroll, 100);
                            }
                        };
                        // Initial delay to let render settle
                        const timer = setTimeout(tryScroll, 100);
                        return () => clearTimeout(timer);
                    }
                }
            }, [activeAyah, displayLimit, ayahs, viewMode, activeSurah, activePlaylist]);

            // Infinite Scroll Logic — skip reset when a jump just set displayLimit
            useEffect(() => {
                if (skipDisplayResetRef?.current) { skipDisplayResetRef.current = false; return; }
                setDisplayLimit(10);
            }, [activeSurah, searchQuery]);

            const handleLoadMore = useCallback(() => {
                if (viewMode === 'reader' && displayLimit < ayahs.length) {
                    setDisplayLimit(prev => Math.min(prev + 10, ayahs.length));
                } else if (viewMode === 'search' && detailedResults.length < rawMatches.length) {
                    const startIdx = detailedResults.length;
                    const nextBatch = rawMatches.slice(startIdx, startIdx + 5);
                    if (nextBatch.length > 0) {
                        fetchDetailsForMatches(nextBatch).then(newDetails => {
                            // Re-sort to preserve rawMatches order
                            const ordered = nextBatch.map(m => newDetails.find(d => d.number === m.number)).filter(Boolean);
                            setDetailedResults(prev => [...prev, ...ordered]);
                        });
                    }
                }
            }, [viewMode, displayLimit, ayahs.length, detailedResults.length, rawMatches, fetchDetailsForMatches]);

            // Determine all items in current context (for Select All)
            const allItemsInContext = useMemo(() => {
                if (viewMode === 'reader') return ayahs;
                if (viewMode === 'search') return rawMatches;
                if (viewMode === 'playlist_view' && activePlaylist) return activePlaylist.items;
                return [];
            }, [viewMode, ayahs, rawMatches, activePlaylist]);

            // Select All Toggle
            const handleToggleSelectAll = () => {
                const list = allItemsInContext;
                if (list.length === 0) return;

                const isAllSelected = list.every(item => selectedAyahs.some(s => s.number === item.number));

                if (isAllSelected) {
                    setSelectedAyahs(prev => prev.filter(s => !list.some(l => l.number === s.number)));
                } else {
                    const newItems = list.map(item => {
                        // If it's a raw match (search mode), prefer detailed version if available, otherwise partial
                        if (viewMode === 'search') {
                            const existingFull = detailedResults.find(d => d.number === item.number);
                            if (existingFull) return existingFull;
                            return {
                                number: item.number,
                                numberInSurah: item.numberInSurah,
                                surahName: getSurahNameTR(item.surah.number),
                                surahNumber: item.surah.number,
                                text: "",
                                transliteration: "",
                                diyanet: item.text, // rawMatches has turkish text
                                yazir: "",
                                ates: "",
                                audio: "",
                                isPartial: true
                            };
                        }
                        return item;
                    });

                    setSelectedAyahs(prev => {
                        const existingIds = new Set(prev.map(a => a.number));
                        const toAdd = newItems.filter(a => !existingIds.has(a.number));
                        return [...prev, ...toAdd];
                    });
                }
            };

            const itemsToRender = useMemo(() => {
                if (viewMode === 'reader') return ayahs.slice(0, displayLimit);
                if (viewMode === 'search') return detailedResults;
                if (viewMode === 'playlist_view' && activePlaylist) return activePlaylist.items;
                return [];
            }, [viewMode, ayahs, displayLimit, detailedResults, activePlaylist]);

            // Farklı suredeyken VEYA aynı suredeyken PlayerBar kapalıysa (aktif ayet yok/oynamıyor) göster
            const bookmarkInCurrentSurah = bookmark && bookmark.surahNumber === activeSurah?.number;
            const playerInactive = !activeAyah; // PlayerBar tamamen kapalıysa (pause değil, kapalı)
            const showContinueReading = !loading && !searching && viewMode === 'reader' && bookmark && bookmark.surahNumber && (
                bookmark.surahNumber !== activeSurah?.number ||
                (bookmarkInCurrentSurah && playerInactive)
            );

            return (
                <main className="flex-1 overflow-y-auto ios-scroll bg-slate-100 dark:bg-black p-4 md:p-8 pt-4 md:pt-8 scroll-smooth transition-colors duration-300" id="main-scroll">
                    <div className="max-w-4xl mx-auto pb-32">
                        {/* Minimal loading indicator - just top spinner, no blocking overlay */}
                        {loading && (
                            <div className="sticky top-0 z-20 flex items-center justify-center py-2 bg-emerald-50/80 dark:bg-emerald-900/20 backdrop-blur-sm">
                                <i className="fa-solid fa-circle-notch fa-spin text-emerald-600 text-sm mr-2"></i>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">{loadingText}</span>
                            </div>
                        )}

                        {!loading && fetchError && (
                            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                                <i className="fa-solid fa-triangle-exclamation text-4xl text-red-400"></i>
                                <p className="text-gray-600 dark:text-slate-300 font-medium">{getSurahNameTR(fetchError.surah?.number)} suresi yüklenemedi.</p>
                                <p className="text-sm text-gray-400 dark:text-slate-500">İnternet bağlantınızı kontrol edip tekrar deneyin.</p>
                                <button
                                    onClick={() => fetchSurah(fetchError.surah)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                                >
                                    <i className="fa-solid fa-rotate-right"></i> Tekrar Dene
                                </button>
                            </div>
                        )}

                        {/* Mobile Surah Select - Smart hide/show on scroll */}
                        {!loading && !searching && viewMode === 'reader' && (
                            <div className={`md:hidden sticky left-0 w-full z-10 bg-white dark:bg-black border-b border-gray-200 dark:border-neutral-800 pt-0 px-2 pb-2 shadow-sm flex gap-2 mb-4 transition-transform duration-300 ease-out ${showMobileSelect ? 'translate-y-0 top-0' : '-translate-y-full -top-20'}`}>
                                <div className="flex-1 relative">
                                    <select
                                        onChange={(e) => {
                                            const num = parseInt(e.target.value);
                                            if (isNaN(num)) return;
                                            const surah = surahs.find(s => s.number === num);
                                            if (surah) fetchSurah(surah);
                                        }}
                                        className="w-full p-1 pr-8 rounded border border-gray-200 dark:border-neutral-800 bg-white dark:bg-black dark:text-white focus:ring-emerald-500 text-sm appearance-none"
                                        value={activeSurah?.number || 1}
                                    >
                                        {sortedSurahs.map(s => (
                                            <option key={s.number} value={s.number}>
                                                {s.number}. {getSurahNameTR(s.number)} — {getSurahNameAR(s.number)} {sortType === 'revelation' ? `(İniş: ${REVELATION_ORDER_MAP[s.number]})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 text-xs pointer-events-none"></i>
                                </div>

                                <button
                                    onClick={() => setSortType(prev => prev === 'mushaf' ? 'revelation' : 'mushaf')}
                                    className="px-3 py-2 bg-slate-100 dark:bg-black text-slate-600 dark:text-slate-300 rounded border border-gray-200 dark:border-neutral-800 hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center justify-center min-w-[40px]"
                                    title={sortType === 'mushaf' ? "İniş sırasına göre sırala" : "Mushaf sırasına göre sırala"}
                                >
                                    <i className={`fa-solid ${sortType === 'mushaf' ? 'fa-arrow-down-1-9' : 'fa-clock-rotate-left'}`}></i>
                                </button>
                            </div>
                        )}


                        {/* Bookmark Prompt */}
                        {showContinueReading && (
                            <div className="mb-6 bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-xl flex justify-between items-center shadow-sm border border-emerald-200 dark:border-emerald-800">
                                <div>
                                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">Son Okunan</h4>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400">{bookmark.surah} Suresi, {bookmark.numberInSurah}. Ayet</p>
                                </div>
                                <button onClick={() => {
                                    const targetSurahNum = parseInt(bookmark.surahNumber);
                                    const targetAyahNum = parseInt(bookmark.numberInSurah);
                                    if (!targetSurahNum || !targetAyahNum) return;
                                    const s = surahs.find(x => x.number === targetSurahNum);
                                    if (!s) return;
                                    closePlayer();
                                    jumpTargetRef.current = { ayahNumber: targetAyahNum, shouldPlay: true };
                                    fetchSurah(s);
                                }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 shrink-0 ml-4">Devam Et</button>
                            </div>
                        )}

                        {/* Reader Mode Header */}
                        {!loading && !searching && viewMode === 'reader' && (
                            <div className="text-center mb-8 border-b border-gray-200 dark:border-neutral-800 pb-6 fade-in relative">
                                {ayahs.length > 0 && (
                                    <button onClick={handleToggleSelectAll} className={`absolute right-0 top-0 text-xs font-bold px-3 py-1.5 rounded-full transition shadow-sm flex items-center gap-1 ${allItemsInContext.every(item => selectedAyahs.some(s => s.number === item.number)) ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 dark:bg-black dark:text-emerald-400 dark:border-neutral-800'}`}>
                                        <i className={`fa-solid ${allItemsInContext.every(item => selectedAyahs.some(s => s.number === item.number)) ? 'fa-check-double' : 'fa-list-check'}`}></i>
                                        <span className="hidden sm:inline">{allItemsInContext.every(item => selectedAyahs.some(s => s.number === item.number)) ? 'Seçimi Kaldır' : 'Tümünü Seç'}</span>
                                    </button>
                                )}
                                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-1">{getSurahNameTR(activeSurah?.number)}</h2>
                                {activeSurah && <p className="text-xl text-slate-500 dark:text-slate-300 mb-2" style={{fontFamily:"'Amiri',serif"}}>{getSurahNameAR(activeSurah.number)}</p>}
                                <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="bg-white dark:bg-black px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-neutral-800">{activeSurah?.numberOfAyahs} Ayet</span>
                                    <span className="bg-white dark:bg-black px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-neutral-800">{activeSurah?.revelationType === 'Meccan' ? 'Mekke' : activeSurah?.revelationType === 'Medinan' ? 'Medine' : '...'}</span>
                                    <span className="bg-white dark:bg-black px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-neutral-800">İniş Sırası: {REVELATION_ORDER_MAP[activeSurah?.number]}</span>
                                </div>
                            </div>
                        )}

                        {/* List Content */}
                        {!loading && !searching && (viewMode === 'reader' || viewMode === 'search' || viewMode === 'playlist_view') && (
                            <>
                                {/* SEARCH RESULTS MODE */}
                                {!searching && viewMode === 'search' && (
                                    <>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex flex-col gap-1">
                                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">"{currentSearchTerm}" Sonuçları ({rawMatches.length})</h2>
                                                <button onClick={() => setSortType(prev => prev === 'mushaf' ? 'revelation' : 'mushaf')} className="text-xs text-left bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded w-fit hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-1">
                                                    <i className={`fa-solid ${sortType === 'mushaf' ? 'fa-arrow-down-1-9' : 'fa-clock-rotate-left'}`}></i>
                                                    {sortType === 'mushaf' ? 'Sıraya göre sıralı' : 'İniş sırasına göre sıralı'}
                                                </button>
                                            </div>
                                            <div className="flex gap-3">
                                                {rawMatches.length > 0 && (
                                                    <button
                                                        onClick={handleToggleSelectAll}
                                                        className={`text-sm font-bold px-3 py-1.5 rounded-full transition shadow-sm flex items-center gap-1 ${allItemsInContext.every(item => selectedAyahs.some(s => s.number === item.number))
                                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                            : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 dark:bg-black dark:text-emerald-400 dark:border-neutral-800'
                                                            }`}
                                                    >
                                                        <i className={`fa-solid ${allItemsInContext.every(item => selectedAyahs.some(s => s.number === item.number)) ? 'fa-check-double' : 'fa-list-check'}`}></i>
                                                        {allItemsInContext.every(item => selectedAyahs.some(s => s.number === item.number)) ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                                                    </button>
                                                )}
                                                <button onClick={() => { setViewMode('reader'); setSearchQuery(''); setRawMatches([]); setDetailedResults([]); }} className="text-sm text-emerald-600 hover:underline flex items-center">Listeye Dön</button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {viewMode === 'playlist_view' && activePlaylist && (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-6 mb-6 text-center border border-emerald-100 dark:border-emerald-800">
                                        <h2 className="text-2xl font-bold mb-2">{activePlaylist.name}</h2>
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => setViewMode('playlists_list')} className="text-sm bg-white dark:bg-black px-4 py-2 rounded-full shadow-sm dark:border dark:border-neutral-800">Geri Dön</button>
                                        </div>
                                    </div>
                                )}

                                {itemsToRender.map((ayah) => (
                                    <AyahCard key={ayah.number} ayahData={ayah} />
                                ))}

                                {(viewMode === 'reader' && displayLimit < ayahs.length) || (viewMode === 'search' && detailedResults.length < rawMatches.length) ? (
                                    <InfiniteScrollTrigger onIntersect={handleLoadMore} />
                                ) : null}
                            </>
                        )}

                        {/* Playlist List Mode */}
                        {!loading && viewMode === 'playlists_list' && (
                            <div className="fade-in transition-colors duration-300">
                                <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                                    <div>
                                        <h2 className="text-2xl font-bold flex items-center gap-2 dark:text-slate-100"><i className="fa-solid fa-layer-group text-emerald-600"></i> Listelerim</h2>
                                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{playlists.length} liste oluşturuldu</p>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <button title="Tüm listeleri yedek olarak bilgisayarına kaydet" onClick={() => {
                                            if (playlists.length === 0) { showToast('Kaydedilmiş liste yok.'); return; }
                                            const blob = new Blob([JSON.stringify(playlists, null, 2)], { type: 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a'); a.href = url;
                                            a.download = `kuran-listeler-${new Date().toISOString().slice(0,10)}.json`; a.click();
                                            setTimeout(() => URL.revokeObjectURL(url), 60000);
                                            showToast(`${playlists.length} liste yedeklendi.`);
                                        }} className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg font-bold shadow-sm transition-colors shrink-0">
                                            <i className="fa-solid fa-file-export"></i> Yedekle
                                        </button>
                                        <label title="Daha önce kaydettiğin listeleri yükle" className="flex items-center gap-1.5 text-xs bg-white dark:bg-black border border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2.5 py-1.5 rounded-lg font-bold shadow-sm cursor-pointer transition-colors shrink-0">
                                            <i className="fa-solid fa-file-import"></i> Yükle
                                            <input type="file" accept=".json" className="hidden" onChange={(e) => {
                                                const file = e.target.files?.[0]; if (!file) return;
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    try {
                                                        const data = JSON.parse(ev.target.result);
                                                        if (!Array.isArray(data)) { showToast('Geçersiz dosya formatı.'); return; }
                                                        
                                                        // Validate and normalize schema
                                                        const validatedPlaylists = [];
                                                        for (const p of data) {
                                                            if (!p || typeof p !== 'object') continue;
                                                            if (!p.id || typeof p.name !== 'string' || !p.name.trim()) continue;
                                                            
                                                            const rawItems = Array.isArray(p.items) ? p.items : [];
                                                            const cleanItems = rawItems.map(item => {
                                                                if (!item || typeof item !== 'object') return null;
                                                                const num = parseInt(item.number);
                                                                if (isNaN(num)) return null;
                                                                return {
                                                                    number: num,
                                                                    surahNumber: parseInt(item.surahNumber || item.surah?.number || 0) || null,
                                                                    numberInSurah: parseInt(item.numberInSurah) || null,
                                                                    isPartial: item.isPartial !== undefined ? !!item.isPartial : true,
                                                                    text: typeof item.text === 'string' ? item.text : undefined,
                                                                    audio: typeof item.audio === 'string' ? item.audio : undefined,
                                                                    diyanet: typeof item.diyanet === 'string' ? item.diyanet : undefined
                                                                };
                                                            }).filter(Boolean);

                                                            validatedPlaylists.push({
                                                                id: String(p.id),
                                                                name: p.name.trim(),
                                                                items: cleanItems
                                                            });
                                                        }

                                                        if (validatedPlaylists.length === 0) {
                                                            showToast('Yüklenecek geçerli bir liste bulunamadı.');
                                                            return;
                                                        }

                                                        setPlaylists(prev => {
                                                            const existingIds = new Set(prev.map(p => p.id));
                                                            const newOnes = validatedPlaylists.filter(p => !existingIds.has(p.id));
                                                            showToast(`${newOnes.length} liste yedeğinden yüklendi.`);
                                                            return [...prev, ...newOnes];
                                                        });
                                                    } catch (err) { 
                                                        console.error("Playlist import parse error", err);
                                                        showToast('Geçersiz dosya formatı.'); 
                                                    }
                                                };
                                                reader.onerror = () => showToast('Dosya okunamadı.');
                                                reader.readAsText(file);
                                                e.target.value = '';
                                            }} />
                                        </label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {playlists.map(p => (
                                        <div key={p.id} onClick={() => { setActivePlaylist(p); setViewMode('playlist_view'); }} className="bg-white dark:bg-black p-4 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 cursor-pointer hover:border-emerald-400 transition relative group">
                                            <div className="absolute top-2 right-2 flex gap-1">
                                                <button title="Metin olarak aktar" onClick={(e) => {
                                                    e.stopPropagation();
                                                    const lines = p.items.filter(it => !it.isPartial).map((it, i) =>
                                                        `${i+1}. ${it.surahName} ${it.numberInSurah}. Ayet\n` +
                                                        `${it.text || ''}\n` +
                                                        `${it.transliteration || ''}\n` +
                                                        `${it.diyanet || ''}\n`
                                                    );
                                                    if (lines.length === 0) { showToast('Liste henüz yüklenmedi, lütfen önce listeyi açın.'); return; }
                                                    const content = `${p.name}\n${'='.repeat(p.name.length)}\n\n${lines.join('\n')}`;
                                                    const blob = new Blob(['\uFEFF', content], { type: 'text/plain;charset=utf-8' });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a'); a.href = url;
                                                    a.download = `${p.name.replace(/[^a-z0-9]/gi,'_')}.txt`; a.click();
                                                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                                                    showToast(`'${p.name}' metin olarak aktarıldı.`);
                                                }} className="w-9 h-9 flex items-center justify-center rounded-full text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200/50 dark:border-emerald-800/30 hover:scale-105 active:scale-95 transition-all shadow-sm"><i className="fa-solid fa-download text-sm"></i></button>
                                                <button title="Listeyi sil" onClick={(e) => { e.stopPropagation(); if (playbackPlaylistRef.current?.id === p.id) { closePlayer(); } setPlaylists(prev => prev.filter(x => x.id !== p.id)); if (activePlaylist?.id === p.id) { setActivePlaylist(null); setViewMode('playlists_list'); } }} className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200/50 dark:border-red-800/30 hover:scale-105 active:scale-95 transition-all shadow-sm"><i className="fa-solid fa-eraser text-sm"></i></button>
                                            </div>
                                            <h3 className="font-bold text-lg pr-16 dark:text-slate-100">{p.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-slate-400">{p.items.length} Ayet</p>
                                        </div>
                                    ))}
                                    {playlists.length === 0 && <p className="text-gray-500 dark:text-slate-400 italic">Henüz liste oluşturmadınız.</p>}
                                </div>
                            </div>
                        )}

                        {/* My Notes Mode */}
                        {!loading && viewMode === 'my_notes' && (
                            <MyNotesView />
                        )}
                    </div>
                </main>
            );
        };

        const AppContainer = () => {
            const { darkMode, setDarkMode, searchQuery, setSearchQuery, handleSearch, setViewMode, viewMode, activePlaylist, fontSize, setFontSize, selectedAyahs, setSelectedAyahs, playlists, setPlaylists, toastMessage, showToast, setRawMatches, setDetailedResults, navigate, searching } = useQuran();

            // Cycling search placeholder to prevent cutoff on mobile screens
            const [placeholderIndex, setPlaceholderIndex] = useState(0);
            const searchPlaceholders = [
                "Sure/Ayet ara... (Örn: Bakara 183)",
                "Kelime ara... (Örn: namaz sabır)",
                "Sure no ile git... (Örn: 18 10)",
                "Ayet no'ya git... (Örn: Tevbe 3)"
            ];

            useEffect(() => {
                const timer = setInterval(() => {
                    setPlaceholderIndex(prev => (prev + 1) % searchPlaceholders.length);
                }, 3500); // cycle every 3.5 seconds
                return () => clearInterval(timer);
            }, []);

            // Dynamic search with debounce
            const [searchInput, setSearchInput] = useState(searchQuery);
            const debouncedSearch = useDebounce(searchInput, 400); // 400ms delay
            
            // Sync searchInput when searchQuery is reset externally (e.g. fetchSurah clears it)
            useEffect(() => { setSearchInput(searchQuery); }, [searchQuery]);

            // Trigger search when debounced value stabilises; reset on clear
            useEffect(() => {
                if (debouncedSearch === searchQuery) return; // No change needed
                if (debouncedSearch.length >= 3) {
                    handleSearch(debouncedSearch);
                } else if (debouncedSearch.length === 0) {
                    setViewMode('reader');
                    setRawMatches([]);
                    setDetailedResults([]);
                }
            }, [debouncedSearch]); // searchQuery intentionally omitted — external reset handled above

            // Sync Dark Mode with HTML
            useEffect(() => {
                if (darkMode) { document.documentElement.classList.add('dark'); safeStorage.setItem('theme', 'dark'); }
                else { document.documentElement.classList.remove('dark'); safeStorage.setItem('theme', 'light'); }
                if (window.syncReactTheme) window.syncReactTheme(darkMode);
            }, [darkMode]);

            const goBack = () => {
                // Hierarchical navigation: nested views -> parent view -> main page
                if (viewMode === 'playlist_view') {
                    setViewMode('playlists_list');
                    return;
                }
                if (viewMode === 'playlists_list') {
                    setViewMode('reader');
                    return;
                }
                if (viewMode === 'search') {
                    setViewMode('reader');
                    setSearchQuery('');
                    setRawMatches([]);
                    setDetailedResults([]);
                    return;
                }
                // If in reader or any other mode, go to main page
                window.toggleQuranView(false);
            };

            const [playlistModal, setPlaylistModal] = useState(false);
            const [newListName, setNewListName] = useState("");
            const [showHelp, setShowHelp] = useState(false);

            const handleBulkAdd = () => {
                if (!newListName) return;
                const newP = { id: Date.now(), name: newListName, items: [...selectedAyahs] };
                setPlaylists(prev => [...prev, newP]);
                setNewListName("");
                showToast(`${selectedAyahs.length} ayet '${newListName}' listesine eklendi.`);
                setSelectedAyahs([]);
                setPlaylistModal(false);
            };

            return (
                <div className="flex flex-col h-full font-sans relative">

                    {/* Help Modal */}
                    {showHelp && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
                            <div className="absolute inset-0 bg-black/50"></div>
                            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                <div className="bg-emerald-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
                                    <h2 className="font-bold text-lg flex items-center gap-2"><i className="fa-solid fa-circle-question"></i> Kullanım Rehberi</h2>
                                    <button onClick={() => setShowHelp(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-emerald-500"><i className="fa-solid fa-xmark"></i></button>
                                </div>
                                <div className="p-6 space-y-5 text-sm text-gray-700 dark:text-gray-300">

                                    <section>
                                        <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2"><i className="fa-solid fa-magnifying-glass text-xs"></i> Arama Özellikleri</h3>
                                        <ul className="space-y-2 pl-2">
                                            <li><span className="font-semibold">Tüm Meallerde Kelime Arama:</span> Yazdığınız herhangi bir kelime 6 farklı Türkçe mealde (Diyanet, Elmalılı vb.) eş zamanlı taranır (örn: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">namaz</code>, <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">sabır</code>).</li>
                                            <li><span className="font-semibold">Sure İçi Kelime Arama:</span> Aramayı belirli bir sureyle sınırlamak için sure adından sonra kelime yazabilirsiniz (örn: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">Bakara namaz</code>).</li>
                                            <li><span className="font-semibold">Ayete Doğrudan Gitme (Navigasyon):</span> Sure adı + ayet no (örn: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">Bakara 183</code>) veya sure no + ayet no (örn: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">2 183</code>) yazarak doğrudan ilgili ayete ışınlanabilirsiniz.</li>
                                            <li><span className="font-semibold">Sure Açma:</span> Sadece sure adını (örn: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">Yasin</code>) veya sure numarasını (örn: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">36</code>) yazarak sureyi açabilirsiniz.</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2"><i className="fa-solid fa-layer-group text-xs"></i> Listeler (Playlists)</h3>
                                        <ul className="space-y-2 pl-2">
                                            <li>Herhangi bir ayetin üzerindeki <i className="fa-solid fa-folder-plus text-xs"></i> butonuna basarak listelerinize ekleyin.</li>
                                            <li>Birden fazla ayet seçip <span className="font-semibold">Listeye Ekle</span> butonuyla toplu listeler oluşturun.</li>
                                            <li><i className="fa-solid fa-file-lines text-xs"></i> butonuyla listelerinizi Arapça, okunuş ve mealler dahil, her bilgisayar ve telefonda bozulmadan açılan evrensel UTF-8 formatında (.txt) cihazınıza indirin.</li>
                                            <li><span className="font-semibold">Listeleri Yedekle</span> ile tüm listelerinizi yedekleyin, <span className="font-semibold">Yedek Yükle</span> ile başka cihazlara aktarın.</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2"><i className="fa-solid fa-comment text-xs"></i> Kişisel Notlar</h3>
                                        <ul className="space-y-2 pl-2">
                                            <li>Ayet kartlarının üzerindeki not simgesine tıklayarak notlar ekleyin; notlarınız tarayıcınızda güvenle saklanır.</li>
                                            <li><span className="font-semibold">Gelişmiş Not Arama:</span> Notlarım menüsündeki akıllı arama motorunu kullanarak kendi notlarınız, mealler, Arapça kelimeler veya doğrudan <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">Bakara 183</code> gibi sure/ayet kombinasyonları arasında anında filtreleme yapın.</li>
                                            <li>Notlarım ekranındaki pratik aksiyon butonlarıyla ayete anında geri dönebilir veya notlarınızı silebilirsiniz.</li>
                                            <li>Notlarınızı dilediğiniz an tek tıkla bilgisayarınıza yedekleyebilir veya yedekten geri yükleyebilirsiniz.</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2"><i className="fa-solid fa-play text-xs"></i> Ses Oynatma & Dinleme</h3>
                                        <ul className="space-y-2 pl-2">
                                            <li>Herhangi bir ayetin <span className="font-semibold">Dinle</span> butonuna basın; ayetler sırasıyla kesintisiz şekilde çalmaya devam eder.</li>
                                            <li>Alt kısımdaki oynatıcı çubuğundan ses hızını ayarlayabilir (0.5× – 2×) ve tekrar modlarını (Tümü, Tek Ayet) yönetebilirsiniz.</li>
                                            <li><span className="font-semibold">Arka Planda Çalma (Background Audio):</span> Hem iOS hem de Android cihazlarda ekran kilitlense ya da tarayıcı arka plana alınsa dahi oynatım kesintisiz devam eder.</li>
                                            <li>Masaüstü klavye kısayolları: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">Space</code> oynat/duraklat · <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">→</code> sonraki ayet · <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">←</code> önceki ayet.</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2"><i className="fa-solid fa-bookmark text-xs"></i> Akıllı Yer İmi & Kaldığı Yer</h3>
                                        <ul className="space-y-2 pl-2">
                                            <li>Dinlediğiniz ayetler otomatik olarak akıllı yer imi olarak kaydedilir.</li>
                                            <li>Uygulamayı tamamen kapatıp açsanız dahi, ana sayfadaki yeşil <span className="font-semibold">Devam Et</span> butonuyla kaldığınız yere anında ve yağ gibi akan bir hızla geri dönersiniz.</li>
                                        </ul>
                                    </section>

                                </div>
                            </div>
                        </div>
                    )}

                    <header className="bg-emerald-700 dark:bg-emerald-900 text-white px-4 pb-2 shadow-lg z-20 sticky top-0 border-b border-transparent dark:border-emerald-800">
                        <div className="max-w-md mx-auto relative pt-2">
                            {/* Simplified header - Material Design style */}
                            <div className="absolute right-0 top-1.5 flex items-center gap-1">
                                <button onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Açık temaya geç' : 'Koyu temaya geç'} aria-pressed={darkMode} className="bg-emerald-600 p-1.5 rounded-full w-8 h-8 flex items-center justify-center hover:bg-emerald-500 transition">
                                    {darkMode ? <i className="fa-solid fa-sun text-xs"></i> : <i className="fa-solid fa-moon text-xs"></i>}
                                </button>
                                <div className="flex items-center bg-emerald-800 rounded-lg px-1.5 py-1 gap-1">
                                    <button onClick={() => setFontSize(prev => Math.max(14, prev - 2))} aria-label="Küçült" className="w-6 h-6 flex items-center justify-center bg-emerald-600 rounded text-xs hover:bg-emerald-500 font-bold">-</button>
                                    <span className="text-xs font-mono w-4 text-center">{fontSize}</span>
                                    <button onClick={() => setFontSize(prev => Math.min(32, prev + 2))} aria-label="Büyüt" className="w-6 h-6 flex items-center justify-center bg-emerald-600 rounded text-xs hover:bg-emerald-500 font-bold">+</button>
                                </div>
                            </div>
                            <div className="mb-2 flex items-center gap-3 pr-28">
                                <button onClick={goBack} aria-label="Ana sayfaya dön" className="bg-emerald-800 p-2 rounded-lg hover:bg-emerald-600 transition h-8 w-8 flex items-center justify-center shrink-0"><i className="fa-solid fa-arrow-left text-sm"></i></button>
                                <div className="min-w-0">
                                    <h1 className="text-lg font-bold mb-0.5 flex items-center leading-none truncate">
                                        <i className="fa-solid fa-book-open mr-2 text-sm"></i> 
                                        Kuran Rehberi
                                        <button 
                                            onClick={() => setShowHelp(true)} 
                                            aria-label="Kullanım rehberi" 
                                            className="ml-2 text-emerald-200 hover:text-white transition-colors"
                                            title="Yardım"
                                        >
                                            <i className="fa-solid fa-circle-question text-xs"></i>
                                        </button>
                                    </h1>
                                    <p className="text-emerald-100 text-[11px] opacity-90 leading-none">Oku, Dinle, Araştır</p>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center mb-2">
                                <form onSubmit={(e) => { e.preventDefault(); if (searchInput.length >= 3) handleSearch(searchInput); }} className="relative group flex-1">
                                    <input 
                                        type="text" 
                                        placeholder={searchPlaceholders[placeholderIndex]} 
                                        value={searchInput} 
                                        onChange={(e) => setSearchInput(e.target.value)} 
                                        aria-label="Ayet veya sure ara" 
                                        className="w-full p-2 pl-9 pr-10 rounded-lg text-sm text-gray-800 bg-white dark:bg-black dark:text-white border-0 focus:ring-2 focus:ring-emerald-400 shadow-sm dark:border dark:border-neutral-700" 
                                    />
                                    <div className="absolute left-0 top-0 h-full w-10 flex items-center justify-center text-gray-400">
                                        {searching ? <i className="fa-solid fa-circle-notch fa-spin text-emerald-500"></i> : <i className="fa-solid fa-search"></i>}
                                    </div>
                                    {searchInput && (
                                        <button 
                                            type="button" 
                                            aria-label="Aramayı temizle" 
                                            onClick={() => { setSearchInput(''); setSearchQuery(''); setRawMatches([]); setDetailedResults([]); setViewMode('reader'); }} 
                                            className="absolute right-0 top-0 h-full w-8 flex items-center justify-center text-gray-400 hover:text-red-500"
                                        >
                                            <i className="fa-solid fa-xmark text-sm"></i>
                                        </button>
                                    )}
                                </form>
                            </div>
                            {/* Navigation Tabs */}
                            <div className="flex gap-1 mt-2 mb-1">
                                <button
                                    onClick={() => navigate('reader')}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${viewMode === 'reader' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:bg-emerald-600'}`}
                                >
                                    <i className="fa-solid fa-book-open text-[10px]"></i> Kur'an
                                </button>
                                <button
                                    onClick={() => navigate('my_notes')}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${viewMode === 'my_notes' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:bg-emerald-600'}`}
                                >
                                    <i className="fa-solid fa-comment text-[10px]"></i> Notlarım
                                </button>
                                <button
                                    onClick={() => navigate('playlists_list')}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${viewMode === 'playlists_list' || viewMode === 'playlist_view' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:bg-emerald-600'}`}
                                >
                                    <i className="fa-solid fa-layer-group text-[10px]"></i> Listelerim
                                </button>
                            </div>

                            {/* Note: Not backup buttons removed - moved to my_notes view */}
                        </div>
                    </header>

                    <div className="flex flex-1 overflow-hidden relative">
                        <SurahList />
                        <div className="flex-1 flex flex-col relative overflow-hidden">
                            <MainContent />
                            <PlayerBar />
                        </div>
                    </div>

                    {/* Bulk Actions Floating Bar */}
                    {selectedAyahs.length > 0 && (
                        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-bounce-in">
                            <span className="font-bold text-sm whitespace-nowrap">{selectedAyahs.length} Seçildi</span>
                            <div className="h-4 w-px bg-white/30"></div>
                            <button onClick={() => setPlaylistModal(true)} className="font-bold text-sm hover:text-emerald-200 flex items-center gap-2"><i className="fa-solid fa-folder-plus"></i> Listeye Ekle</button>
                            <button onClick={() => setSelectedAyahs([])} className="w-6 h-6 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-xs ml-2"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                    )}

                    {/* Bulk Add Modal */}
                    {playlistModal && (
                        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-black dark:border dark:border-neutral-800 p-6 rounded-xl w-full max-w-sm">
                                <h3 className="font-bold mb-4 dark:text-white">Seçilenleri Listeye Ekle</h3>
                                <input type="text" placeholder="Yeni Liste Adı" value={newListName} onChange={(e) => setNewListName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleBulkAdd(); }} className="w-full p-2 bg-white border border-gray-200 rounded mb-4 outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-800 dark:text-white" />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => { setPlaylistModal(false); setNewListName(""); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">İptal</button>
                                    <button onClick={handleBulkAdd} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Oluştur ve Ekle</button>
                                </div>
                                <div className="mt-4 pt-4 border-t dark:border-neutral-800">
                                    <p className="text-xs text-gray-500 mb-2">Veya mevcut listeye ekle:</p>
                                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                                        {playlists.map(p => (
                                            <button key={p.id} onClick={() => {
                                                const updated = { ...p, items: [...p.items, ...selectedAyahs.filter(s => !p.items.some(pi => pi.number === s.number))] };
                                                setPlaylists(prev => prev.map(pr => pr.id === p.id ? updated : pr));
                                                showToast(`${selectedAyahs.filter(s => !p.items.some(pi => pi.number === s.number)).length} ayet '${p.name}' listesine eklendi.`);
                                                setSelectedAyahs([]);
                                                setPlaylistModal(false);
                                            }} className="text-left text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20">{p.name}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Toast Notification */}
                    {toastMessage && (
                        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[150] bg-gray-900/90 dark:bg-emerald-900/90 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 animate-bounce-in border border-gray-700 dark:border-emerald-700 backdrop-blur-sm">
                            <i className="fa-solid fa-circle-check text-emerald-400"></i>
                            {toastMessage}
                        </div>
                    )}
                </div>
            );
        };

        const QuranApp = () => {
            return (
                <QuranProvider>
                    <AppContainer />
                </QuranProvider>
            );
        };

        // ───────────────────────────────────────────
        // Error Boundary — catches render errors so the
        // entire #quran-root doesn't unmount silently
        // ───────────────────────────────────────────
        class ErrorBoundary extends React.Component {
            constructor(props) {
                super(props);
                this.state = { hasError: false, error: null };
            }
            static getDerivedStateFromError(error) {
                return { hasError: true, error };
            }
            componentDidCatch(error, info) {
                console.error('[Quran ErrorBoundary]', error, info);
            }
            render() {
                if (this.state.hasError) {
                    return (
                        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-black text-center">
                            <i className="fa-solid fa-triangle-exclamation text-5xl text-red-500 mb-4"></i>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Bir şeyler yanlış gitti</h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 max-w-md">
                                Uygulama beklenmeyen bir hata ile karşılaştı. Sayfayı yenilemek genellikle sorunu çözer.
                            </p>
                            {this.state.error && (
                                <pre className="text-xs text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded mb-4 max-w-md overflow-auto">
                                    {String(this.state.error?.message || this.state.error)}
                                </pre>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors">
                                    <i className="fa-solid fa-rotate-right mr-2"></i> Yenile
                                </button>
                                <button
                                    onClick={() => { window.location.hash = ''; window.location.reload(); }}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-sm shadow-sm transition-colors">
                                    Ana sayfaya dön
                                </button>
                            </div>
                        </div>
                    );
                }
                return this.props.children;
            }
        }

        const root = ReactDOM.createRoot(document.getElementById('quran-root'));
        root.render(
            <ErrorBoundary>
                <QuranApp />
            </ErrorBoundary>
        );