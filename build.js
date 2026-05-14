/**
 * build.js — Kuran Rehberi Obfuscation Build Script
 *
 * Kullanım:
 *   node build.js          → dist/index.html üretir
 *
 * Ne yapar:
 *   1. index.html içindeki <script> bloklarını Terser ile minify + obfuscate eder
 *   2. HTML'i html-minifier-terser ile sıkıştırır
 *   3. dist/index.html olarak yazar
 */

const fs = require('fs');
const path = require('path');
const { minify: terserMinify } = require('terser');
const { minify: htmlMinify } = require('html-minifier-terser');

const SRC = path.join(__dirname, 'index.html');
const DIST_DIR = path.join(__dirname, 'dist');
const DIST = path.join(DIST_DIR, 'index.html');

async function build() {
    console.log('\n🔨 Build başlıyor...\n');

    if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

    let html = fs.readFileSync(SRC, 'utf8');
    const originalSize = Buffer.byteLength(html, 'utf8');

    // ── Step 1: Obfuscate each <script> block ────────────────────────────────
    const scriptRegex = /<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/gi;
    const scriptJobs = [];

    // Collect all script blocks first
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
        const content = match[2].trim();
        if (content.length > 0) {
            scriptJobs.push({ fullMatch: match[0], attrs: match[1], content, index: match.index });
        }
    }

    // Process each script block
    for (const job of scriptJobs) {
        try {
            const result = await terserMinify(job.content, {
                compress: {
                    drop_console: false,   // console.error/warn kept for runtime debugging
                    passes: 2,
                    unsafe: false,
                },
                mangle: {
                    toplevel: false,       // don't mangle top-level (React globals etc.)
                    reserved: [            // keep these names intact
                        'React', 'ReactDOM', 'useState', 'useEffect', 'useRef',
                        'useContext', 'useCallback', 'useMemo', 'createContext',
                        'children', 'className', 'onClick', 'onChange', 'onSubmit',
                        'onKeyDown', 'style', 'key', 'id', 'type', 'value',
                        'placeholder', 'title', 'href', 'src', 'rel', 'target',
                        'dir', 'aria-label', 'role',
                    ],
                },
                format: {
                    comments: false,       // strip all comments
                    ascii_only: false,
                },
            });

            if (result.code) {
                const obfuscated = `<script${job.attrs}>${result.code}</script>`;
                html = html.replace(job.fullMatch, obfuscated);
                console.log(`  ✅ Script obfuscated (${(job.content.length / 1024).toFixed(1)}KB → ${(result.code.length / 1024).toFixed(1)}KB)`);
            }
        } catch (err) {
            // JSX blocks can't be parsed by Terser — strip comments + collapse whitespace instead
            const stripped = job.content
                .replace(/\/\*[\s\S]*?\*\//g, '')      // block comments
                .replace(/\/\/[^\n]*/g, '')              // line comments
                .replace(/\n\s*\n/g, '\n')              // blank lines
                .replace(/[ \t]+/g, ' ')                // multiple spaces
                .trim();
            const fallback = `<script${job.attrs}>${stripped}</script>`;
            html = html.replace(job.fullMatch, fallback);
            console.log(`  ⚠️  JSX block: comments stripped (${(job.content.length / 1024).toFixed(1)}KB → ${(stripped.length / 1024).toFixed(1)}KB)`);
        }
    }

    // ── Step 2: Minify HTML ───────────────────────────────────────────────────
    html = await htmlMinify(html, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: false,        // already handled by terser above
        keepClosingSlash: false,
    });

    // ── Step 3: Write output ──────────────────────────────────────────────────
    fs.writeFileSync(DIST, html, 'utf8');

    const finalSize = Buffer.byteLength(html, 'utf8');
    const saved = (((originalSize - finalSize) / originalSize) * 100).toFixed(1);

    // ── Step 4: Copy PWA assets to dist/ ─────────────────────────────────────
    const assets = [
        'manifest.json', 'sw.js', 'offline.html',
        'icon-96.png', 'icon-192.png', 'icon-512.png',
        'apple-touch-icon.png', 'favicon.png'
    ];
    for (const asset of assets) {
        const src = path.join(__dirname, asset);
        const dst = path.join(DIST_DIR, asset);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dst);
            console.log(`  📄 Kopyalandı: ${asset}`);
        }
    }

    console.log(`\n✅ dist/index.html oluşturuldu`);
    console.log(`   Orijinal : ${(originalSize / 1024).toFixed(1)} KB`);
    console.log(`   Sonuç    : ${(finalSize / 1024).toFixed(1)} KB`);
    console.log(`   Tasarruf : %${saved}\n`);
}

build().catch(err => {
    console.error('❌ Build hatası:', err);
    process.exit(1);
});
