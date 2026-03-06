// ==UserScript==
// @name         KOROAD AUTO PROGRESS (Parent)
// @version      1.3.0
// @include      *://smartlearning.hunet.co.kr/Progress/ProgressList.aspx*
// @downloadURL  https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad.js
// @updateURL    https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad.js
// @grant        none
// ==/UserScript==

(function () {
    console.log("koroad-parent 1.3.0", location.href);

    const STORAGE_KEY = 'koroad_auto_state';

    let childWindow = null;
    let monitorInterval = null;

    // ── 상태 저장/불러오기 ───────────────────────────────────────────
    function saveState(isAuto) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ isAuto }));
    }
    function loadState() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : { isAuto: false };
        } catch {
            return { isAuto: false };
        }
    }
    function clearState() {
        sessionStorage.removeItem(STORAGE_KEY);
    }

    // ── 학습하기 버튼 목록 ──────────────────────────────────────────
    function getStudyButtons() {
        return [...document.querySelectorAll(
            '#progress_contents > table > tbody > tr > td.text-center > a'
        )].filter(a => a.innerText.trim() === '학습하기');
    }

    // ── onclick 속성 직접 실행 (visibility 무관) ─────────────────────
	function executeStudyBtn(btn) {
	    try {
	        const onclickStr = btn.getAttribute('onclick');
	        if (!onclickStr) {
	            btn.scrollIntoView({ behavior: 'instant', block: 'center' });
	            btn.click();
	            return;
	        }
	        console.log("▶ onclick 직접 실행:", onclickStr);
	        new Function(onclickStr).call(btn);
	    } catch (e) {
	        // focus 에러 = 창은 이미 정상 열림 → fallback 불필요
	        if (e.message?.includes('focus')) {
	            console.log("ℹ️ popStudy focus 에러 무시 (창 정상 열림)");
	            return;
	        }
	        console.warn("onclick 직접 실행 실패, click() fallback:", e);
	        btn.scrollIntoView({ behavior: 'instant', block: 'center' });
	        btn.click();
	    }
	}

    // ── 첫 번째 학습하기 버튼 실행 ──────────────────────────────────
    function startFirstStudy() {
        const btns = getStudyButtons();
        if (btns.length === 0) {
            console.log("✅ 모든 학습 완료!");
            alert("🎉 모든 학습이 완료되었습니다!");
            clearState();
            updateUI(false);
            return;
        }
        console.log(`▶ 첫 번째 학습하기 실행 (남은 버튼: ${btns.length}개)`);
        executeStudyBtn(btns[0]);
    }

    // ── 자식창 닫힘 모니터링 ────────────────────────────────────────
    function startMonitor(win) {
        if (monitorInterval) clearInterval(monitorInterval);
        childWindow = win;

        monitorInterval = setInterval(() => {
            if (!childWindow || childWindow.closed) {
                clearInterval(monitorInterval);
                monitorInterval = null;
                console.log("🔔 학습창 닫힘 감지");

                const state = loadState();
                if (!state.isAuto) return;

                // 닫힘 후 새로고침 → sessionStorage 유지 → 복원 로직이 실행
                saveState(true);
            }
        }, 1000);
    }

    // ── postMessage 수신 ─────────────────────────────────────────────
    window.addEventListener('message', (event) => {
        if (!event.origin.includes('study.hunet.co.kr')) return;
        if (event.data?.type !== 'KOROAD_CHAPTER_DONE') return;
        console.log("📨 챕터 완료 신호 수신");
        if (childWindow && !childWindow.closed) {
            childWindow.close();
        }
        // startMonitor의 closed 감지가 reload 처리
    });

    // ── window.open 후킹 ─────────────────────────────────────────────
	function hookWindowOpen() {
	    const origOpen = window.open;
	    window.open = function (url, name, features) {
	        const win = origOpen.call(this, url, name, features);
	        if (url && url.includes('study.hunet.co.kr')) {
	            console.log("📂 학습창 열림:", url);
	            startMonitor(win);
	        }
	        return win;
	    };
	
	    // popStudy의 win.focus() null 에러 원천 차단
	    if (typeof window.popStudy === 'function') {
	        const origPopStudy = window.popStudy;
	        window.popStudy = function (...args) {
	            try {
	                origPopStudy.apply(this, args);
	            } catch (e) {
	                if (e.message?.includes('focus')) {
	                    console.log("ℹ️ popStudy focus 에러 무시");
	                    return;
	                }
	                throw e;
	            }
	        };
	    }
	}


    // ── UI 상태 업데이트 ─────────────────────────────────────────────
    function updateUI(isAuto) {
        const btn = document.getElementById('koroad-auto-btn');
        if (!btn) return;
        btn.textContent = isAuto ? '⏹ 자동 학습 중지' : '⚡ 자동 학습 시작';
        btn.style.background = isAuto ? '#e53935' : '#1a6cf5';
    }

    // ── UI 버튼 삽입 ─────────────────────────────────────────────────
    function injectUI() {
        const state = loadState();
        const isAuto = state.isAuto;

        const btn = document.createElement('button');
        btn.id = 'koroad-auto-btn';
        btn.style.cssText = `
            position: fixed; bottom: 24px; right: 24px; z-index: 9999;
            color: #fff; border: none; border-radius: 8px;
            padding: 12px 20px; font-size: 15px; font-weight: bold;
            cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            background: ${isAuto ? '#e53935' : '#1a6cf5'};
            transition: background 0.2s;
        `;
        btn.textContent = isAuto ? '⏹ 자동 학습 중지' : '⚡ 자동 학습 시작';
        document.body.appendChild(btn);

        btn.addEventListener('click', () => {
            const state = loadState();
            if (state.isAuto) {
                clearState();
                updateUI(false);
                if (monitorInterval) clearInterval(monitorInterval);
                console.log("⏹ 자동 학습 중지");
                return;
            }
            const btns = getStudyButtons();
            if (btns.length === 0) {
                alert("학습하기 버튼을 찾을 수 없습니다.");
                return;
            }
            saveState(true);
            updateUI(true);
            console.log(`🚀 자동 학습 시작 (학습하기 버튼 ${btns.length}개)`);
            executeStudyBtn(btns[0]);
        });
    }

    // ── 버튼이 DOM에 나타날 때까지 대기 ─────────────────────────────
    function waitForStudyButtons(callback, timeout = 15000) {
        const btns = getStudyButtons();
        if (btns.length > 0) {
            setTimeout(() => callback(btns), 500);
            return;
        }

        const target = document.querySelector('#progress_contents') || document.body;
        let resolved = false;

        const observer = new MutationObserver(() => {
            const btns = getStudyButtons();
            if (btns.length === 0) return;
            resolved = true;
            observer.disconnect();
            console.log(`✅ 학습하기 버튼 ${btns.length}개 감지`);
            setTimeout(() => callback(btns), 500);
        });

        observer.observe(target, { childList: true, subtree: true });

        setTimeout(() => {
            if (resolved) return;
            observer.disconnect();
            const btns = getStudyButtons();
            if (btns.length > 0) {
                callback(btns);
            } else {
                console.warn(`⚠️ ${timeout / 1000}초 내 버튼 미감지 → 5초 후 재시도`);
                setTimeout(() => {
                    const retryBtns = getStudyButtons();
                    if (retryBtns.length > 0) {
                        callback(retryBtns);
                    } else {
                        console.error("버튼 감지 최종 실패 → 자동 학습 중단");
                        clearState();
                        updateUI(false);
                    }
                }, 5000);
            }
        }, timeout);
    }

    // ── 페이지 로드 ──────────────────────────────────────────────────
    window.addEventListener('load', () => {
        hookWindowOpen();
        injectUI();

        const state = loadState();
        if (!state.isAuto) return;

        console.log("♻️ 자동 학습 상태 복원 → 버튼 대기 중...");

        waitForStudyButtons((btns) => {
            if (btns.length === 0) {
                console.log("✅ 모든 학습 완료");
                alert("🎉 모든 학습이 완료되었습니다!");
                clearState();
                updateUI(false);
                return;
            }
            console.log(`▶ 복원 후 첫 번째 학습하기 실행`);
            executeStudyBtn(btns[0]);
        });
    });
})();
