// ==UserScript==
// @name         NEW KOROAD LEARNING HELPER_LMain
// @version      1.0.1
// @include      *://study.hunet.co.kr/Study/LMain.aspx*
// @downloadURL  https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad_l.js
// @updateURL    https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad_l.js
// ==/UserScript==
(function () {
    console.log("hook1.0.1", location.href);
    window.addEventListener('load', function () {
        setTimeout(() = >{ 
            setInterval(() = >{
                let iframes = [...document.querySelectorAll('iframe'), ...document.querySelectorAll('frame')];
                iframes.forEach(ele = >{
                    try {
                        let multiple_x = ele.contentWindow.document.querySelector('#rate-3');
                        if (multiple_x.style.color !== 'rgb(114, 88, 87)') {
                            multiple_x.click();
                        }
                    } catch {}
                    try {
                        let video = ele.contentWindow.document.querySelector('video');
                        if (video && video.duration > 0) {
                            let current = ele.contentWindow.document.querySelector('video').currentTime;
                            if (current === video.duration) {
                                ele.contentWindow.document.querySelector('#next').click();
                            }
                        }
                    }
                } catch(e) {}
            });
        },
        1000); // 1초 간격 반복
    },
    2000);
}); const hooking_fn = (str) = >{
    try {
        let temp = str.replace("confirm('다음 차시를 학습하시겠습니까?')", "true");
        temp = temp.replace("'', '');", "'', '');\n} else{\n window.parent.close(); window.close();");
        temp = temp.replace("confirm(confirmMsg)", "true");
        temp = temp.replace("alert('영상을 다 보셔야 합니다.');", "");
        return temp;
    } catch {}
};
})();
