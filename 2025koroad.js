// ==UserScript==
// @name         KOROAD AUTO PROGRESS (Parent)
// @version      1.8.0
// @include      *://smartlearning.hunet.co.kr/Progress/ProgressList.aspx*
// @include      *://smartlearning.hunet.co.kr/Home/*
// @include      *://smartlearning.hunet.co.kr/Diagnosis/Index.aspx*
// @include      *://smartlearning.hunet.co.kr/Diagnosis/Step01.aspx*
// @include      *://smartlearning.hunet.co.kr/Diagnosis/Step02.aspx*
// @include      *://smartlearning.hunet.co.kr/Diagnosis/Step03.aspx*
// @downloadURL  https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad.js
// @updateURL    https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad.js
// @grant        none
// ==/UserScript==

(function () {
    console.log("koroad-parent 1.8.0", location.href);

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

    // ------------------------------------------------------------------
    // 진단(Diagnosis) 자동화
    // ------------------------------------------------------------------

    const DIAGNOSIS_STATE_KEY = 'koroad_diagnosis_auto_state';
    const DIAGNOSIS_INDEX_PATH = '/diagnosis/index.aspx';
    const DIAGNOSIS_STEP01_PATH = '/diagnosis/step01.aspx';
    const DIAGNOSIS_STEP02_PATH = '/diagnosis/step02.aspx';
    const DIAGNOSIS_STEP03_PATH = '/diagnosis/step03.aspx';

    function isDiagnosisPage() {
        return location.pathname.toLowerCase().includes('/diagnosis/');
    }

    function loadDiagnosisState() {
        try {
            return JSON.parse(
                sessionStorage.getItem(DIAGNOSIS_STATE_KEY) || '{}'
            );
        } catch {
            return {};
        }
    }

    function saveDiagnosisState(extra = {}) {
        const prev = loadDiagnosisState();

        sessionStorage.setItem(
            DIAGNOSIS_STATE_KEY,
            JSON.stringify({
                ...prev,
                isAuto: true,
                startedAt: prev.startedAt || Date.now(),
                ...extra
            })
        );
    }

    function clearDiagnosisState() {
        sessionStorage.removeItem(DIAGNOSIS_STATE_KEY);
    }

    function waitForElement(selector, callback, timeout = 15000) {
        const found = document.querySelector(selector);

        if (found) {
            callback(found);
            return;
        }

        let resolved = false;

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);

            if (!el || resolved) return;

            resolved = true;
            observer.disconnect();
            callback(el);
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            if (resolved) return;

            observer.disconnect();

            const el = document.querySelector(selector);

            if (el) {
                resolved = true;
                callback(el);
            } else {
                console.warn(`⚠️ 요소 대기 시간 초과: ${selector}`);
            }
        }, timeout);
    }

    // save()를 거치지 않고 saveAnswer()를 직접 호출하여
    // confirm()/alert() 메시지박스를 완전히 우회한다.
    function callSaveAnswer(...args) {
        try {
            if (typeof window.saveAnswer !== 'function') {
                console.error('❌ 진단 저장 함수 saveAnswer()를 찾지 못했습니다.');
                return false;
            }

            console.log('💾 진단 응답 직접 저장:', args);
            window.saveAnswer(...args);

            return true;
        } catch (e) {
            console.error('❌ 진단 응답 직접 저장 실패:', e);
            return false;
        }
    }

    function runDiagnosisIndex() {
        console.log('🩺 진단 Index 자동 진행');

        waitForElement('#ContentPlaceHolder1_hlButton', btn => {
            console.log('➡️ 진단 시작 버튼 클릭');
            saveDiagnosisState({ step: 'index' });
            btn.click();
        });
    }

    function runDiagnosisStep01() {
        console.log('🩺 진단 Step01 자동 진행');

        waitForElement(
            '#ulContent > li:nth-child(1) input[type="checkbox"]',
            () => {
                const questionGroups = document.querySelectorAll('#ulContent > li');

                let checkedValues = '';
                let abilityseqes = '';
                let selectedCount = 0;

                questionGroups.forEach((group, index) => {
                    const checkbox = group.querySelector('input[type="checkbox"]');
                    const abilityInput = document.getElementsByName('ability_seq')[index];

                    if (!checkbox || !abilityInput) {
                        console.warn(`⚠️ Step01 문항 ${index + 1} 정보를 찾지 못했습니다.`);
                        return;
                    }

                    // 요구사항: 아무 체크박스 하나만 선택, 나머지는 미선택 유지
                    const shouldCheck = selectedCount === 0;

                    checkbox.checked = shouldCheck;

                    if (shouldCheck) {
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));

                        checkedValues += `${checkbox.value}|`;
                        abilityseqes += `${abilityInput.value}|`;
                        selectedCount++;
                    }
                });

                if (selectedCount === 0) {
                    console.error('❌ Step01에서 선택할 체크박스가 없습니다.');
                    return;
                }

                console.log(`☑️ Step01 체크 ${selectedCount}개 선택, 직접 저장 실행`);

                saveDiagnosisState({ step: 'step01' });

                setTimeout(() => {
                    // save() 미사용: confirm/alert 없이 saveAnswer 직접 호출
                    callSaveAnswer(checkedValues, abilityseqes);
                }, 500);
            }
        );
    }

    function runDiagnosisStep02() {
        console.log('🩺 진단 Step02 자동 진행');

        waitForElement('#dvContent input[type="radio"][value="1"]', () => {
            const questionSeqInputs = [...document.getElementsByName('question_seq')];
            const abilitySeqInputs = [...document.getElementsByName('ability_seq')];

            if (questionSeqInputs.length === 0) {
                console.error('❌ Step02 question_seq 항목을 찾지 못했습니다.');
                return;
            }

            let questionSeqs = '';
            let abilityseqes = '';
            let answers = '';

            for (let i = 0; i < questionSeqInputs.length; i++) {
                const questionSeq = questionSeqInputs[i]?.value;
                const abilitySeq = abilitySeqInputs[i]?.value;

                const radio = document.querySelector(
                    `#dvContent input[name="score${i}"][type="radio"][value="1"]`
                );

                if (!questionSeq || !abilitySeq || !radio) {
                    console.warn(`⚠️ Step02 Q${i + 1} 입력 요소를 찾지 못했습니다.`);
                    return;
                }

                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));

                questionSeqs += `${questionSeq}|`;
                abilityseqes += `${abilitySeq}|`;
                answers += '1|';
            }

            console.log(`☑️ Step02 ${questionSeqInputs.length}개 문항에 value="1" 선택 완료`);

            saveDiagnosisState({ step: 'step02' });

            setTimeout(() => {
                // 원본 save()의 confirm()/alert() 검증 단계를 거치지 않고 직접 저장
                callSaveAnswer(questionSeqs, abilityseqes, answers);
            }, 500);
        });
    }

    function runDiagnosisStep03() {
        console.log('🩺 진단 Step03 완료 → 학습 목록 복귀');

        waitForElement(
            'a[href="/Progress/ProgressList.aspx"][target="_self"]',
            link => {
                saveDiagnosisState({ step: 'step03' });

                setTimeout(() => {
                    console.log('➡️ 학습 목록으로 이동');
                    clearDiagnosisState();
                    link.click();
                }, 1000);
            }
        );
    }

    function runDiagnosisAutoFlow() {
        const path = location.pathname.toLowerCase();

        if (path.includes(DIAGNOSIS_INDEX_PATH)) {
            runDiagnosisIndex();
            return true;
        }

        if (path.includes(DIAGNOSIS_STEP01_PATH)) {
            runDiagnosisStep01();
            return true;
        }

        if (path.includes(DIAGNOSIS_STEP02_PATH)) {
            runDiagnosisStep02();
            return true;
        }

        if (path.includes(DIAGNOSIS_STEP03_PATH)) {
            runDiagnosisStep03();
            return true;
        }

        return false;
    }

    if (isDiagnosisPage()) {
        window.addEventListener('load', () => {
            runDiagnosisAutoFlow();
        });

        return;
    }

    // ------------------------------------------------------------------
    // 기존 학습 진행(ProgressList) 자동화
    // ------------------------------------------------------------------

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

            if (source === '복원' && prevState.lastSignature === signature && false) {
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
