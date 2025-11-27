// ==UserScript==
// @name         NEW KOROAD LEARNING HELPER_LearningModule
// @version      1.0.3
// @include      *://smartlearning.hunet.co.kr/LearningModule*
// @downloadURL  https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad_lm.js
// @updateURL    https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad_lm.js
// ==/UserScript==
(function () {
    console.log("hook1.0.3", location.href);
    window.addEventListener('load', function () {
        setTimeout(() => {
            // interval 하나에서 모든 프레임 순회 처리
            setInterval(() => {
            	if(document.querySelector('.main video').playbackRate < 2){
            		document.querySelector('.main video').playbackRate = 2;
            	}
            	if(document.querySelector('.main #btn-next-chapter').style.display === ''){
            		document.querySelector('.main #btn-next-chapter').click();
            	}
            	if(document.querySelector('.main video').paused){
            		document.querySelector('.main video').play();
            	}
            
            }, 1000); // 1초 간격 반복

        }, 2000);
    });
})();
