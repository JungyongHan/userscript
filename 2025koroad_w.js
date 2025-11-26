// ==UserScript==
// @name         NEW KOROAD LEARNING HELPER_WMain
// @version      1.0.1
// @include      *://study.hunet.co.kr/Study/WMain.aspx*
// @downloadURL  https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad_w.js
// @updateURL    https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad_w.js
// ==/UserScript==
(function () {
    console.log("hook1.0.1", location.href);
    window.addEventListener('load', function () {
        setTimeout(() => {
            // interval 하나에서 모든 프레임 순회 처리
            setInterval(() => {
            let ele = main;
            if(main?.contentWindow){
            	ele = main.contentWindow;
            }
            
	         if(ele.document.getElementById("video").querySelector("video").playbackRate < 2.0)
			{
				ele.document.getElementById("video").querySelector("video").playbackRate = 2.0;
				let next_call_func = ele.fnPlayEnd.toString().match(/fnStudyStart\s*\(([^)]*)\);/)[0];
				ele.eval("function fnPlayEnd(){" + next_call_func + "}");
			}
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
