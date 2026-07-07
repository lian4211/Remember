const CACHE_NAME = 'word-learner-v6';
const basePath = new URL(self.location.href).pathname.replace(/\/[^/]*$/, '');

// 需要预缓存的静态资源
const urlsToCache = [
    `${basePath}/`,
    `${basePath}/index.html`,
    `${basePath}/manifest.json`,
    `${basePath}/css/style.css`,
    `${basePath}/data/roots.json`,
    `${basePath}/js/app.js`,
    `${basePath}/js/data.js`,
    `${basePath}/js/ui.js`,
    `${basePath}/js/voice.js`,
    `${basePath}/js/sm2.js`,
    `${basePath}/js/stats.js`,
    `${basePath}/js/import.js`,
    `${basePath}/js/dictionary.js`,
    `${basePath}/js/plan.js`,
    `${basePath}/js/test-ec.js`,
    `${basePath}/js/test-ce.js`,
    `${basePath}/js/review.js`,
    `${basePath}/js/fsrs.js`,
    `${basePath}/js/settings.js`,
    `${basePath}/js/search.js`,
    `${basePath}/js/flashcard.js`,
    `${basePath}/js/quiz.js`,
    `${basePath}/js/java-crash.js`,
    `${basePath}/js/java-mistakes.js`,
    `${basePath}/data/quiz-maogai.json`,
    `${basePath}/data/quiz-java.json`,
    `${basePath}/data/quiz-java-supplement.json`,
    `${basePath}/data/quiz-maogai-exam.json`,
    `${basePath}/data/quiz-maogai2.json`,
    `${basePath}/js/sentences.js`,
    `${basePath}/js/starred.js`,
    `${basePath}/data/sentences.json`
];

// 安装时缓存静态资源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// 激活时清理旧版本缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// 请求拦截：所有资源网络优先，离线时回退缓存
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // 跳过非本域请求
    if (!url.pathname.startsWith(basePath) || url.hostname !== self.location.hostname) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {
                // 成功则更新缓存
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});
