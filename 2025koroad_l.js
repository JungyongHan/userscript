// ==UserScript==
// @name         NEW KOROAD LEARNING HELPER (Child)
// @version      2.4.0
// @include      *://study.hunet.co.kr/Study/Main.aspx*
// @include      *://study.hunet.co.kr/Study/LMain.aspx*
// @include      *://study.hunet.co.kr/Study/WMain.aspx*
// @include      *://smartlearning.hunet.co.kr/LearningModule*
// @downloadURL  https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad_l.js
// @updateURL    https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad_l.js
// @grant        none
// ==/UserScript==

(function () {
    console.log("hook2.4.0", location.href);

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
    // isDoneSent 가드가 있어 여러 경로(영상종료, alert감지, watchdog 등)에서
    // 중복 호출돼도 실제 전송/종료는 한 번만 일어난다.
    function notifyParentDone(reason) {
        if (isDoneSent()) return;
        setDoneSent();
        console.log(`📨 챕터 완료 → 부모창에 신호 전송 (사유: ${reason || 'unknown'})`);
        try {
            const opener = window.top?.opener || window.opener;
            if (opener && !opener.closed) {
                opener.postMessage(
                    { type: 'KOROAD_CHAPTER_DONE', reason: reason || 'unknown' },
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
        };
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
            if (msg === '본 차시의 학습이 종료되었습니다.') { notifyParentDone('alert_end'); return; }
            origAlert?.(msg);
        };
        cw.confirm = () => true;

        // iframe 내부의 window.close() / window.parent.close() 감지
        cw.close = function () { notifyParentDone('iframe_close'); };
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
    if (isWMain) {
        window.close = function () { notifyParentDone('wmain_close'); };
    }

    // ── Main.aspx 전용: 60초 watchdog ────────────────────────────────
    // 영상 재생 중이면 타이머 리셋.
    // 60초간 영상이 감지되지 않으면, 자식창을 직접 reload하지 않는다.
    // reload는 부모창에 어떤 신호도 주지 않아 부모가 이 상황을 전혀 인지하지
    // 못하고, beforeunload 진행률 저장 로직만 불필요하게 반복 트리거하며,
    // 서버 로딩 지연 시 무한 reload 루프로 이어질 수 있다.
    // 대신 notifyParentDone()으로 정상 종료 절차(완료신호 전송 → 창 닫기)를
    // 태워, 부모가 자식창 종료를 감지한 뒤 자체 지연 새로고침 → 진행률
    // 재확인 → 다음 버튼 클릭까지 이어가도록 위임한다.
    if (isMain) {
        let NOpaged = 0;
        const reloadTimer = setInterval(() => {
            if (isAnyVideoPlaying()) { NOpaged = 0; return; }
            NOpaged++;
            if (NOpaged >= 40 && NOpaged < 60) {
                console.warn(`⚠️ 영상 미감지 ${NOpaged}초. ${60 - NOpaged}초 후 부모에 위임 종료.`);
            }
            if (NOpaged >= 60) {
                clearInterval(reloadTimer);
                console.warn("⏱ 60초간 영상 미감지 → 자식창 자체 reload 대신 부모창에 위임 (notifyParentDone)");
                notifyParentDone('video_watchdog_timeout');
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

                        if (nextBtn && nextBtn.style.display === '') {
                            nextBtn.click();
                        }

                        if (video.ended && (!nextBtn || nextBtn.style.display !== '')) {
                            notifyParentDone('learningmodule_video_ended');
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
                            vid.muted = true;
                            vid.play().catch((err) => {
                                console.warn('자동재생 실패:', err.name, err.message);
                            });
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
                                    notifyParentDone('lmain_video_ended_last_page');
                                } else {
                                    cw.document.querySelector('#next')?.click();
                                }
                            }
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
                            hookWindow(cw);
                        } catch (e) {}
                    }
                });
            }, 1000);
        }, 2000);
    });
})();
