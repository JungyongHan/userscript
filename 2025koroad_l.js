// ==UserScript==
// @name         NEW KOROAD LEARNING HELPER (Child)
// @version      2.3.1
// @include      *://study.hunet.co.kr/Study/Main.aspx*
// @include      *://study.hunet.co.kr/Study/LMain.aspx*
// @include      *://study.hunet.co.kr/Study/WMain.aspx*
// @include      *://smartlearning.hunet.co.kr/LearningModule*
// @downloadURL  https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad_l.js
// @updateURL    https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad_l.js
// @grant        none
// ==/UserScript==

(function () {
    console.log("hook2.3.1", location.href);

    const path = location.pathname.toLowerCase();
    const isMain     = path.includes('/study/main.aspx');
    const isLMain    = path.includes('/study/lmain.aspx');
    const isWMain    = path.includes('/study/wmain.aspx');
    const isLearning = path.includes('/learningmodule');

    // window.close 오버라이드 전에 원본 저장 (재귀 방지 핵심)
    const _origClose = window.close.bind(window);

    let mainIntervalId = null;

    // ── sessionStorage로 완료 중복 방지 (reload 후에도 유지) ─────────
    const isDoneSent  = () => sessionStorage.getItem('koroad_done_sent') === '1';
    const setDoneSent = () => sessionStorage.setItem('koroad_done_sent', '1');
    const clearDoneSent = () => sessionStorage.removeItem('koroad_done_sent');

    // ── 부모창에 완료 신호 전송 후 창 닫기 ──────────────────────────
    function notifyParentDone() {
        if (isDoneSent()) return;
        setDoneSent();
        console.log("📨 챕터 완료 → 부모창에 신호 전송");
        try {
            const opener = window.top?.opener || window.opener;
            if (opener && !opener.closed) {
                opener.postMessage(
                    { type: 'KOROAD_CHAPTER_DONE' },
                    'https://smartlearning.hunet.co.kr'
                );
            }
        } catch (e) {
            console.warn("postMessage 실패:", e);
        }
        setTimeout(() => {
            clearDoneSent();
            try { _origClose(); } catch (e) {}
        }, 500);
    }

    // ── 영상 재생 중 여부 확인 (60초 watchdog용) ─────────────────────
    function isAnyVideoPlaying() {
        const check = (doc) => {
            try {
                return [...doc.querySelectorAll('video')]
                    .some(v => !v.paused && !v.ended && v.currentTime > 0);
            } catch { return false; }
        };isAnyVideoPlaying
        if (check(document)) return true;
        for (const f of [...document.querySelectorAll('iframe'), ...document.querySelectorAll('frame')]) {
            try { if (check(f.contentWindow.document)) return true; } catch {}
        }
        return false;
    }

    // ── alert/confirm/close 오버라이드 ───────────────────────────────
    function hookWindow(cw) {
        if (!cw || cw._koroad_hooked) return;
        cw._koroad_hooked = true;

        const origAlert = cw.alert?.bind(cw);
        cw.alert = function (msg) {
            if (msg === '영상을 다 보셔야 합니다.') return;
            if (msg === '마지막 페이지입니다.') return;
            if (msg === '본 차시의 학습이 종료되었습니다.') { notifyParentDone(); return; }
            origAlert?.(msg);
        };
        cw.confirm = () => true;

        // iframe 내부의 window.close() / window.parent.close() 감지
        cw.close = function () { notifyParentDone(); };
    }

    // ── Main.aspx 전용: btn-next 패치 ───────────────────────────────
    function patchBtnNext(targetWin) {
        if (!targetWin) return;
        const btn = targetWin.document?.querySelector('#btn-next');
        if (!btn || btn._patched) return;
        hookWindow(targetWin);
        btn._patched = true;
    }

    // ── WMain.aspx: 최상위 window.close() 인터셉트 ──────────────────
    // fnPlayEnd가 window.parent.close()를 호출할 때 감지
    // _origClose는 이미 위에서 저장했으므로 재귀 없음
    if (isWMain) {
        window.close = function () { notifyParentDone(); };
    }

    // ── Main.aspx 전용: 60초 watchdog ────────────────────────────────
    // 영상 재생 중이면 타이머 리셋 → 무한 reload 방지
    if (isMain) {
        let NOpaged = 0;
        const reloadTimer = setInterval(() => {
            if (isAnyVideoPlaying()) { NOpaged = 0; return; }
            NOpaged++;
            if (NOpaged >= 40 && NOpaged < 60) {
                console.warn(`⚠️ 영상 미감지 ${NOpaged}초. ${60 - NOpaged}초 후 reload.`);
            }
            if (NOpaged >= 60) {
                clearInterval(reloadTimer);
                try {
                    (window.top && window.top !== window ? window.top : window).location.reload();
                } catch (e) { window.location.reload(); }
            }
        }, 1000);
    }

    // ── 메인 루프 ────────────────────────────────────────────────────
    window.addEventListener('load', function () {
        clearDoneSent(); // 새 챕터 진입 시 초기화

        if (isMain) patchBtnNext(window);

        // ── LearningModule: iframe 없이 직접 처리 후 리턴 ───────────
        if (isLearning) {
            setTimeout(() => {
                if (mainIntervalId) clearInterval(mainIntervalId);
                mainIntervalId = setInterval(() => {
                    try {
                        const video   = document.querySelector('.main video');
                        const nextBtn = document.querySelector('.main #btn-next-chapter');
                        if (!video) return;

                        if (video.playbackRate < 2) video.playbackRate = 2;
                        if (video.paused && !video.ended) video.play();

                        // 다음 챕터 버튼 표시 중이면 클릭
                        if (nextBtn && nextBtn.style.display === '') {
                            nextBtn.click();
                        }

                        // 영상 종료 + 다음 버튼 없음 → 챕터 완료
                        if (video.ended && (!nextBtn || nextBtn.style.display !== '')) {
                            notifyParentDone();
                        }
                    } catch (e) { console.error("LearningModule 오류:", e); }
                }, 1000);
            }, 2000);
            return;
        }

        // ── study.hunet.co.kr 3종 공통 iframe 루프 ──────────────────
        setTimeout(() => {
            if (isMain) patchBtnNext(window);

            if (mainIntervalId) clearInterval(mainIntervalId);
            mainIntervalId = setInterval(() => {
                const iframes = [
                    ...document.querySelectorAll('iframe'),
                    ...document.querySelectorAll('frame')
                ];
                iframes.forEach(ele => {
                    const cw = ele.contentWindow;
                    if (!cw) return;
					cw.document.querySelectorAll('video').forEach(vid => {
					    if (vid.paused && !vid.ended && vid.readyState >= 2) {
					        vid.play().catch(() => {}); // 자동재생 정책 차단 시 무시
					    }
					});
                    // ════ Main.aspx ════════════════════════════════
                    if (isMain) {
                        try {
                            patchBtnNext(cw);
                            if (ele.name === 'main') {
                                hookWindow(cw);
                                if (typeof cw.fn_SpeedUp === "function") cw.fn_SpeedUp();
                                if (typeof cw.fnSpdUpOne === "function") cw.fnSpdUpOne();
                                if (typeof cw.jwplayer === "function" && !cw._jwHooked) {
                                    cw._jwHooked = true;
                                    cw.jwplayer('video').onPlay(() => {
                                        cw.fn_SpeedUp?.();
                                        console.log("speed up!!");
                                    });
                                }
                                // Old Flash 타입 처리
                                if (cw.movieEnd !== undefined) {
                                    const btn = cw.document.querySelector('#btn-next');
                                    if (!btn) return;
                                    const doc = cw.document;
                                    if      (cw.movieEnd)                                                   { btn.click(); }
                                    else if (doc.querySelector('.pager .current'))                          { btn.click(); }
                                    else if (doc.querySelector('#hidQuizSeq'))                              { btn.click(); }
                                    else if (doc.querySelector('a[onclick="SaveOipinion();"]'))             { btn.click(); }
                                    else if (cw.totalImgCnt !== undefined)                                  { btn.click(); }
                                    else if (!doc.querySelector('video'))                                   { btn.click(); }
                                    else if (doc.querySelector('a[onclick="Click_MoveNextChapter();"]'))    {
                                        hookWindow(cw);
                                        doc.querySelector('a[onclick="Click_MoveNextChapter();"]').click();
                                    }
                                }
                            }
                        } catch (e) {}
                    }

                    // ════ LMain.aspx ════════════════════════════════
                    if (isLMain) {
                        try {
                            const rateBtn = cw.document.querySelector('#rate-3');
                            if (rateBtn && rateBtn.style.color !== 'rgb(114, 88, 87)') rateBtn.click();
                        } catch (e) { console.error("rate-3 오류:", e); }

                        try {
                            const video = cw.document.querySelector('video');
                            if (video && video.duration > 0 && video.currentTime === video.duration) {
                                if (cw.now_page === cw.total_page) {
                                    notifyParentDone();
                                } else {
                                    cw.document.querySelector('#next')?.click();
                                }
                            }
                            // vjs 플레이어 종료 감지
                            const mainFrame = cw.document.querySelector('#mainFrame');
                            if (mainFrame?.contentWindow) {
                                const mfw = mainFrame.contentWindow;
                                const dur = mfw.document.querySelector('span.vjs-duration-display');
                                const cur = mfw.document.querySelector('span.vjs-current-time-display');
                                if (dur && cur && dur.innerText && dur.innerText === cur.innerText) {
                                    mfw.goNextPage?.();
                                }
                            }
                        } catch (e) { console.error("video 오류:", e); }
                    }

                    // ════ WMain.aspx ════════════════════════════════
                    if (isWMain && ele.name === 'main') {
                        try {
                            const videoEl = cw.document.getElementById('video')?.querySelector('video');
                            if (videoEl && videoEl.playbackRate < 2) videoEl.playbackRate = 2;
                            hookWindow(cw); // fnPlayEnd confirm 우회 + close 감지
                        } catch (e) {}
                    }
                });
            }, 1000);
        }, 2000);
    });
})();
