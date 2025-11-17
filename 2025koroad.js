// ==UserScript==
// @name         NEW KOROAD LEARNING HELPER
// @version      1.1.5
// @include      *://study.hunet.co.kr/Study/Main.aspx?courseCd=*
// @downloadURL  https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad.js
// @updateURL    https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad.js
// ==/UserScript==
(function () {
    console.log("hook1.1.5", location.href);
    window.addEventListener('load', function () {
        let btnNext = document.querySelector('#btn-next');
        if(btnNext && btnNext.onclick) {
            console.log("this is inner page btn replaced func");
            window.eval(`document.querySelector('#btn-next').onclick = ${btnNext.onclick.toString().replace("alert('영상을 다 보셔야 합니다.');", '')}`);
            window.eval(`document.querySelector('#btn-next').onclick = ${btnNext.onclick.toString().replace("alert('마지막 페이지입니다.');", '')}`);
        }
        setTimeout(() => {
            let btnNext = document.querySelector('#btn-next');
            if(btnNext && btnNext.onclick) {
            console.log("first method failed but got this is inner page btn replaced func");
            window.eval(`document.querySelector('#btn-next').onclick = ${btnNext.onclick.toString().replace("alert('영상을 다 보셔야 합니다.');", '')}`);
            window.eval(`document.querySelector('#btn-next').onclick = ${btnNext.onclick.toString().replace("alert('마지막 페이지입니다.');", '')}`);
            }
            // interval 하나에서 모든 프레임 순회 처리
            setInterval(() => {
                let iframes = [...document.querySelectorAll('iframe'), ...document.querySelectorAll('frame')];
                iframes.forEach(ele => {
                    try {
                        // 메인 frame(window) 처리
                        if (ele.name === 'main' && ele.contentWindow) {
                            ele.contentWindow.eval(hooking_fn(ele.contentWindow?.fnPlayEnd?.toString()));
                            let btnNext = ele.contentWindow.document.querySelector('#btn-next');
                            if (btnNext && btnNext.onclick) {
                                ele.contentWindow.eval(`document.querySelector('#btn-next').onclick = ${btnNext.onclick.toString().replace("alert('영상을 다 보셔야 합니다.');", '')}`);
                                ele.contentWindow.eval(`document.querySelector('#btn-next').onclick = ${btnNext.onclick.toString().replace("alert('마지막 페이지입니다.');", '')}`);
                            }
                            if (typeof ele.contentWindow.fn_SpeedUp === "function") {
                                ele.contentWindow.fn_SpeedUp();
                            }
                            if (typeof ele.contentWindow.jwplayer === "function") {
                                ele.contentWindow.jwplayer('video').onPlay(() => {
                                    ele.contentWindow.fn_SpeedUp();
                                    console.log("speeed up!!");
                                });
                            }
                        }
                    } catch (e) {}
                    try {
                    	
                    	
                    	let btnNext = ele.contentWindow.document.querySelector('#btn-next');
                        if (btnNext && btnNext.onclick) {
                            ele.contentWindow.eval(`document.querySelector('#btn-next').onclick = ${btnNext.onclick.toString().replace("alert('영상을 다 보셔야 합니다.');", '')}`);
                            ele.contentWindow.eval(`document.querySelector('#btn-next').onclick = ${btnNext.onclick.toString().replace("alert('마지막 페이지입니다.');", '')}`);
                        }
                        // Old flash type 처리
                        if (ele.name === 'main' && ele.contentWindow && ele.contentWindow.movieEnd !== undefined) {
                            let cw = ele.contentWindow;
                            if (cw.movieEnd) {
                                cw.document.querySelector('#btn-next').click();
                            }
                            if (cw.movieEnd === false && cw.document.querySelector('.pager .current') !== null) {
                                cw.document.querySelector('#btn-next').click();
                            }
                            if (cw.movieEnd === false && cw.document.querySelector('#hidQuizSeq') !== null) {
                                cw.document.querySelector('#btn-next').click();
                            }
                            if (cw.movieEnd === false && cw.document.querySelector('a[onclick="SaveOipinion();"]') !== null) {
                                cw.document.querySelector('#btn-next').click();
                            }
                            if (cw.movieEnd === false && cw.totalImgCnt !== undefined) {
                                cw.document.querySelector('#btn-next').click();
                            }
                            if (cw.movieEnd === false && cw.document.querySelector('video') === null) {
                                cw.document.querySelector('#btn-next').click();
                            }
                            if (cw.movieEnd === false && cw.document.querySelector('a[onclick="Click_MoveNextChapter();"]') !== null) {
                                cw.eval(hooking_fn
                                (cw.fnStudyStart?.toString()));
                                cw.document.querySelector('a[onclick="Click_MoveNextChapter();"]').click();
                            }
                        }
                    } catch (e) {}
                });
            }, 1000); // 1초 간격 반복

        }, 2000);
    });

    const hooking_fn = (str) => {
        try{
        let temp = str.replace("confirm('다음 차시를 학습하시겠습니까?')", "true");
        temp = temp.replace("'', '');", "'', '');\n} else{\n window.parent.close(); window.close();");
        temp = temp.replace("confirm(confirmMsg)", "true");
        temp = temp.replace("alert('영상을 다 보셔야 합니다.');", "");
        return temp;
        }catch{}
    };
})();
