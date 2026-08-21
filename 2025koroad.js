// ==UserScript==
// @name         KOROAD AUTO PROGRESS (Parent)
// @version      1.7.9
// @include      *://smartlearning.hunet.co.kr/Progress/ProgressList.aspx*
// @include      *://smartlearning.hunet.co.kr/Home/*
// @downloadURL  https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad.js
// @updateURL    https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad.js
// @grant        none
// ==/UserScript==

(function () {
    console.log("koroad-parent 1.7.9", location.href);

    const STORAGE_KEY = 'koroad_auto_state';
    const DONE_COURSES_KEY = 'koroad_done_courses';
    const DAILY_BLOCKED_KEY = 'koroad_daily_blocked_courses';
    const PROGRESS_LIST_PATH = '/Progress/ProgressList.aspx';
    var userID = '';

    const CHILD_CLOSE_FALLBACK_MS = 6000;
    const REFRESH_DELAY_MS = 3000;
    const MAX_STALE_RETRY = 3;
    const STALE_RETRY_DELAY_MS = 2000;

    function todayStr() {
        const d = new Date();
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }

    function loadStateRaw() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : { isAuto: false };
        } catch {
            return { isAuto: false };
        }
    }

    function saveState(isAuto, extra = {}) {
        const prev = loadStateRaw();

        sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...prev, isAuto, ...extra })
        );
    }

    function loadState() {
        return loadStateRaw();
    }

    function clearState() {
        sessionStorage.removeItem(STORAGE_KEY);
    }

    const isProgressListPage = location.pathname
        .toLowerCase()
        .includes('/progress/progresslist.aspx');

    if (!isProgressListPage) {
        const state = loadStateRaw();

        if (state.isAuto) {
            console.log("↩️ 자동 학습 중 다른 페이지 감지 → 과정 목록으로 복귀");
            location.href = PROGRESS_LIST_PATH;
        } else {
            console.log("ℹ️ 자동 학습 비활성 상태:", location.pathname);
        }

        return;
    }

    let childWindow = null;
    let monitorInterval = null;
    let childCloseFallbackTimer = null;
    let pendingRefreshTimer = null;

    function isProgressContentsReady() {
        return !!document.querySelector('#progress_contents');
    }

    // 목록의 href에서 courseCd를 가져와 과정 식별 키로 만든다.
    function getCourseKeyFromHref(href) {
        try {
            const url = new URL(href, location.href);
            const courseCd = url.searchParams.get('courseCd');

            if (!courseCd) {
                console.warn("⚠️ 목록 URL에서 courseCd를 찾지 못함:", href);
                return null;
            }

            return `courseCd=${courseCd}`;
        } catch (e) {
            console.warn("⚠️ 목록 URL courseCd 추출 실패:", href, e);
            return null;
        }
    }
    function getUserID() {
        try {
            const source = window.fn_Captcha?.toString?.() || '';

 
            userID = source.match(
                /\'userId\'\s*:\s*["']([^"']+)["']/
            )?.[1];
   

            if (!userID) {
                console.warn("⚠️ fn_Captcha에서 userID 추출 실패");
                return null;
            }


            console.log("🔑 현재 과정 userID:", userID);
            
        } catch (e) {
            console.warn("⚠️ 현재 과정 userID 조회 실패:", e);
            return null;
        }
    }

    // 현재 ProgressList 페이지의 사이트 함수 소스에서 courseCd를 추출한다.
    function getCurrentCourseKey() {
        try {
            const source = window.fn_Captcha?.toString?.() || '';

            const courseCd = source.match(
                /\'courseCd\'\s*:\s*["']([^"']+)["']/
            )?.[1];

            if (!courseCd) {
                console.warn("⚠️ fn_Captcha에서 courseCd 추출 실패");
                return null;
            }

            const key = `courseCd=${courseCd}`;

            console.log("🔑 현재 과정 courseCd:", key);

            return key;
        } catch (e) {
            console.warn("⚠️ 현재 과정 courseCd 조회 실패:", e);
            return null;
        }
    }

    function getDoneCourses() {
        try {
            const raw = localStorage.getItem(`${userID}${DONE_COURSES_KEY}`);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function addDoneCourse(courseKey) {
        if (!courseKey) return;

        const list = getDoneCourses();

        if (!list.includes(courseKey)) {
            list.push(courseKey);
            localStorage.setItem(`${userID}${DONE_COURSES_KEY}`, JSON.stringify(list));
            console.log("💾 완료 과정 저장:", courseKey);
        } else {
            console.log("ℹ️ 이미 완료 목록에 존재:", courseKey);
        }
    }

    function getDailyBlocked() {
        try {
            const raw = JSON.parse(localStorage.getItem(`${userID}${DAILY_BLOCKED_KEY}`) || '{}');

            if (raw.date !== todayStr()) {
                return [];
            }

            return raw.courses || [];
        } catch {
            return [];
        }
    }

    function addDailyBlocked(courseKey) {
        if (!courseKey) return;

        const list = getDailyBlocked();

        if (!list.includes(courseKey)) {
            list.push(courseKey);

            localStorage.setItem(
                `${userID}${DAILY_BLOCKED_KEY}`,
                JSON.stringify({ date: todayStr(), courses: list })
            );

            console.log("🚫 오늘 차시 제한 과정 저장:", courseKey);
        }
    }

    function moveToNextIncompleteCourse() {
        const items = document.querySelectorAll(
            '#content > div.header-bar > div.pull-right > dl > dd > ul > li'
        );

        if (items.length === 0) {
            console.warn("⚠️ 과정 목록을 찾지 못했습니다.");
            return false;
        }

        const doneList = getDoneCourses();
        const blockedList = getDailyBlocked();

        console.log(
            `🔍 과정 목록 ${items.length}개 탐색 ` +
            `(완료 ${doneList.length}개, 오늘차단 ${blockedList.length}개)`
        );

        for (const li of items) {
            const link = li.querySelector('a');

            if (!link?.href) {
                continue;
            }

            const courseTitle = li.innerText.trim();
            const courseKey = getCourseKeyFromHref(link.href);

            if (!courseKey) {
                console.warn("⚠️ courseCd 없는 링크 건너뜀:", courseTitle);
                continue;
            }

            if (doneList.includes(courseKey)) {
                console.log("⏭ 완료 과정 건너뜀:", courseTitle, courseKey);
                continue;
            }

            if (blockedList.includes(courseKey)) {
                console.log("⏭ 오늘 제한 과정 건너뜀:", courseTitle, courseKey);
                continue;
            }

            console.log("➡ 다음 과정 이동:", courseTitle, courseKey, link.href);

            saveState(true, {
                staleRetry: 0,
                lastSignature: null,
                currentCourseKey: courseKey,
                currentCourseTitle: courseTitle
            });

            location.href = link.href;
            return true;
        }

        console.log("✅ 이동 가능한 과정이 없습니다.");
        return false;
    }

    function getStudyButtons() {
        const buttons = [
            ...document.querySelectorAll(
                '#progress_contents > table > tbody > tr > td.text-center > a'
            )
        ].filter(a => a.innerText.trim() === '학습하기');

        console.log("🔘 학습하기 버튼:", buttons.length);

        return buttons;
    }

    function getFirstProgress() {
        const el = document.querySelector(
            '#progress_contents > ul > li:nth-child(1) > em'
        );

        const progress = el ? el.innerText.trim() : null;

        console.log("📊 첫 항목 진행률:", progress);

        return progress;
    }

    function detectBlockedReason(btn) {
        const onclickStr = btn?.getAttribute('onclick') || '';

        if (/fnStudyStart|popStudy|fnStudyStart2/i.test(onclickStr)) {
            return null;
        }

        const alertMatch = onclickStr.match(
            /alert\(\s*['"](.+?)['"]\s*\)/
        );

        if (alertMatch) {
            return alertMatch[1];
        }

        if (onclickStr.trim()) {
            return `알 수 없는 차단 사유: ${onclickStr}`;
        }

        return null;
    }

    function executeStudyBtn(btn) {
        if (!btn) {
            console.warn("⚠️ 실행할 학습하기 버튼이 없습니다.");
            return;
        }

        try {
            const onclickStr = btn.getAttribute('onclick');

            if (!onclickStr) {
                btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                btn.click();
                return;
            }

            console.log("▶ 학습 시작 실행:", onclickStr);
            new Function(onclickStr).call(btn);
        } catch (e) {
            if (e.message?.includes('focus')) {
                console.log("ℹ️ 학습창은 열렸고 focus 오류만 발생했습니다.");
                return;
            }

            console.warn("onclick 실행 실패 → click()으로 재시도:", e);
            btn.scrollIntoView({ behavior: 'instant', block: 'center' });
            btn.click();
        }
    }

    function finishCurrentCourse(shouldRecordDone) {
        const state = loadState();

        // 사이트 함수 추출값을 우선하고, 실패하면 이동 직전 저장값을 사용한다.
        const courseKey =
            getCurrentCourseKey() ||
            state.currentCourseKey;

        console.log("🔑 완료 처리 과정 키:", courseKey);

        if (shouldRecordDone && courseKey) {
            addDoneCourse(courseKey);
        } else {
            console.log(
                "ℹ️ 버튼 없음 또는 100% 미확인 → 완료 목록 미기록:",
                courseKey
            );
        }

        if (moveToNextIncompleteCourse()) {
            return;
        }

        clearState();
        updateUI(false);

        alert(
            shouldRecordDone
                ? '🎉 모든 과정의 학습이 완료되었습니다!'
                : '⏸ 다음으로 이동할 과정이 없습니다.'
        );
    }

    function handleDailyLimitAndMoveOn(reason) {
        console.warn("🚫 오늘 차시 제한 감지:", reason);

        const state = loadState();

        const courseKey =
            getCurrentCourseKey() ||
            state.currentCourseKey;

        if (courseKey) {
            addDailyBlocked(courseKey);
        } else {
            console.warn("⚠️ 차단된 현재 과정 courseCd를 찾지 못했습니다.");
        }

        if (moveToNextIncompleteCourse()) {
            return;
        }

        clearState();
        updateUI(false);

        alert(
            `⏸ 오늘 학습 가능한 과정이 모두 소진되었습니다.\n\n마지막 사유: ${reason}`
        );
    }

    function startMonitor(win) {
        if (monitorInterval) {
            clearInterval(monitorInterval);
        }

        childWindow = win;

        monitorInterval = setInterval(() => {
            if (!childWindow || childWindow.closed) {
                clearInterval(monitorInterval);
                monitorInterval = null;
                console.log("🔔 학습창 닫힘 감지");
            }
        }, 1000);
    }

    function scheduleDelayedRefresh(origFnReFresh) {
        if (pendingRefreshTimer) {
            console.log("ℹ️ 새로고침이 이미 예약되어 있습니다.");
            return;
        }

        const state = loadState();

        saveState(state.isAuto, { staleRetry: 0 });

        pendingRefreshTimer = setTimeout(() => {
            pendingRefreshTimer = null;

            try {
                if (typeof origFnReFresh === 'function') {
                    origFnReFresh();
                    return;
                }
            } catch (e) {
                console.warn("원본 fnReFresh 실패 → reload 사용:", e);
            }

            location.reload();
        }, REFRESH_DELAY_MS);
    }

    function hookFnReFresh() {
        if (typeof window.fnReFresh !== 'function') {
            console.warn("⚠️ fnReFresh를 찾지 못했습니다.");
            return;
        }

        if (window.fnReFresh._koroadHooked) {
            return;
        }

        const original = window.fnReFresh;

        const hooked = function (...args) {
            scheduleDelayedRefresh(() => original.apply(this, args));
        };

        hooked._koroadHooked = true;
        window.fnReFresh = hooked;

        console.log("✅ fnReFresh 후킹 완료");
    }

    window.addEventListener('message', event => {
        if (
            event.origin.includes('study.hunet.co.kr') &&
            event.data?.type === 'KOROAD_CHAPTER_DONE'
        ) {
            console.log("📨 챕터 완료 신호 수신");

            if (childCloseFallbackTimer) {
                clearTimeout(childCloseFallbackTimer);
            }

            childCloseFallbackTimer = setTimeout(() => {
                if (childWindow && !childWindow.closed) {
                    console.warn("⚠️ 학습창 강제 종료");

                    try {
                        childWindow.close();
                    } catch {}
                }
            }, CHILD_CLOSE_FALLBACK_MS);

            return;
        }

        if (
            event.data?.command === 'callFunction' &&
            event.data?.functionName === 'fnReFresh'
        ) {
            console.log("📨 fnReFresh 신호 수신");

            if (!pendingRefreshTimer) {
                scheduleDelayedRefresh(
                    window.fnReFresh?._koroadHooked ? null : window.fnReFresh
                );
            }
        }
    });

    function hookWindowOpen() {
        const originalOpen = window.open;

        window.open = function (url, name, features) {
            const win = originalOpen.call(this, url, name, features);

            if (url?.includes('study.hunet.co.kr')) {
                console.log("📂 학습창 열림:", url);
                startMonitor(win);
            }

            return win;
        };

        if (typeof window.popStudy === 'function') {
            const originalPopStudy = window.popStudy;

            window.popStudy = function (...args) {
                try {
                    return originalPopStudy.apply(this, args);
                } catch (e) {
                    if (e.message?.includes('focus')) {
                        console.log("ℹ️ popStudy focus 오류 무시");
                        return;
                    }

                    throw e;
                }
            };
        }
    }

    function updateUI(isAuto) {
        const btn = document.getElementById('koroad-auto-btn');

        if (!btn) return;

        btn.textContent = isAuto
            ? '⏹ 자동 학습 중지'
            : '⚡ 자동 학습 시작';

        btn.style.background = isAuto ? '#e53935' : '#1a6cf5';
    }

    function waitForStudyButtons(callback, timeout = 15000) {
        const initialButtons = getStudyButtons();

        if (initialButtons.length > 0) {
            setTimeout(() => callback(initialButtons), 500);
            return;
        }

        const target = document.querySelector('#progress_contents') || document.body;
        let resolved = false;

        const observer = new MutationObserver(() => {
            const buttons = getStudyButtons();

            if (buttons.length === 0) {
                return;
            }

            resolved = true;
            observer.disconnect();

            console.log(`✅ 학습하기 버튼 ${buttons.length}개 감지`);

            setTimeout(() => callback(buttons), 500);
        });

        observer.observe(target, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            if (resolved) return;

            observer.disconnect();

            const buttons = getStudyButtons();

            if (buttons.length > 0) {
                resolved = true;
                callback(buttons);
                return;
            }

            console.warn(`⚠️ ${timeout / 1000}초 동안 버튼 미감지 → 5초 후 재확인`);

            setTimeout(() => {
                if (resolved) return;

                const retryButtons = getStudyButtons();

                if (retryButtons.length > 0) {
                    resolved = true;
                    callback(retryButtons);
                    return;
                }

                if (isProgressContentsReady()) {
                    console.log("ℹ️ 과정 영역은 존재하지만 학습하기 버튼 없음");
                    resolved = true;
                    callback([]);
                    return;
                }

                console.error("❌ 과정 영역 자체가 로드되지 않음 → 자동 중단");
                clearState();
                updateUI(false);
            }, 5000);
        }, timeout);
    }

    function getCurrentSignature(btns) {
        const progress = getFirstProgress();
        const firstOnclick = btns[0]?.getAttribute('onclick') || '';

        return `${progress}::${firstOnclick}`;
    }

    function startOrResumeAutoStudy(source) {
        console.log(`🚀 자동 학습 ${source} → 학습하기 버튼 대기`);
        
        waitForStudyButtons((btns) => {
            const state = loadState();

            if (!state.isAuto) {
                console.log("ℹ️ 대기 중 자동 학습이 중지되어 실행하지 않습니다.");
                return;
            }

            const progress = getFirstProgress();
            const noBtn = btns.length === 0;
            const fullyDone = progress === '100';

            console.log(
                `🔎 [${source}] 버튼없음: ${noBtn}, 진행률100%: ${fullyDone}`
            );

            if (noBtn || fullyDone) {
                finishCurrentCourse(fullyDone);
                return;
            }

            const blockedReason = detectBlockedReason(btns[0]);

            if (blockedReason) {
                handleDailyLimitAndMoveOn(blockedReason);
                return;
            }

            const signature = getCurrentSignature(btns);
            const prevState = loadState();

            if (source === '복원' && prevState.lastSignature === signature) {
                const retryCount = (prevState.staleRetry || 0) + 1;

                console.warn(
                    `⚠️ 동일 챕터/진행률 감지 (재시도 ${retryCount}/${MAX_STALE_RETRY})`
                );

                if (retryCount > MAX_STALE_RETRY) {
                    clearState();
                    updateUI(false);

                    alert(
                        '⚠️ 진행률이 갱신되지 않아 자동 학습을 중단했습니다. 새로고침 후 수동으로 확인해주세요.'
                    );

                    return;
                }

                saveState(true, {
                    staleRetry: retryCount,
                    lastSignature: signature
                });

                setTimeout(() => location.reload(), STALE_RETRY_DELAY_MS);
                return;
            }

            saveState(true, {
                staleRetry: 0,
                lastSignature: signature
            });

            console.log(`▶ 학습하기 실행 (버튼 ${btns.length}개)`);
            executeStudyBtn(btns[0]);
        });
    }

    function injectUI() {
        const state = loadState();

        const btn = document.createElement('button');
        btn.id = 'koroad-auto-btn';

        btn.style.cssText = `
            position: fixed; bottom: 24px; right: 24px; z-index: 9999;
            color: #fff; border: none; border-radius: 8px;
            padding: 12px 20px; font-size: 15px; font-weight: bold;
            cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            background: ${state.isAuto ? '#e53935' : '#1a6cf5'};
            transition: background 0.2s;
        `;

        btn.textContent = state.isAuto
            ? '⏹ 자동 학습 중지'
            : '⚡ 자동 학습 시작';

        document.body.appendChild(btn);

        btn.addEventListener('click', () => {
        
            const currentState = loadState();

            if (currentState.isAuto) {
                clearState();
                updateUI(false);

                if (monitorInterval) {
                    clearInterval(monitorInterval);
                    monitorInterval = null;
                }

                if (childCloseFallbackTimer) {
                    clearTimeout(childCloseFallbackTimer);
                    childCloseFallbackTimer = null;
                }

                if (pendingRefreshTimer) {
                    clearTimeout(pendingRefreshTimer);
                    pendingRefreshTimer = null;
                }

                console.log("⏹ 자동 학습 중지");
                return;
            }

            saveState(true, {
                staleRetry: 0,
                lastSignature: null
            });

            updateUI(true);
            startOrResumeAutoStudy('시작');
        });

        const resetBtn = document.createElement('button');
        resetBtn.id = 'koroad-reset-done-btn';
        resetBtn.textContent = '🗑 목록 초기화';

        resetBtn.style.cssText = `
            position: fixed; bottom: 24px; right: 190px; z-index: 9999;
            color: #333; border: 1px solid #ccc; border-radius: 8px;
            padding: 12px 16px; font-size: 13px;
            cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            background: #fff;
        `;

        resetBtn.addEventListener('click', () => {
            if (!confirm('완료 목록과 오늘의 차시 제한 목록을 모두 초기화하시겠습니까?')) {
                return;
            }

            localStorage.removeItem(`${userID}${DONE_COURSES_KEY}`);
            localStorage.removeItem(`${userID}${DAILY_BLOCKED_KEY}`);

            console.log("🗑 완료/차단 목록 초기화");
            alert('초기화되었습니다.');
        });

        document.body.appendChild(resetBtn);
    }

    window.addEventListener('load', () => {
        hookWindowOpen();
        hookFnReFresh();
        getUserID();
        injectUI();

        if (!loadState().isAuto) {
            return;
        }

        startOrResumeAutoStudy('복원');
    });
})();
