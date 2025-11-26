// ==UserScript==
// @name         NEW KOROAD LEARNING HELPER_LMain
// @version      1.1.4
// @include      *://study.hunet.co.kr/Study/LMain.aspx*
// @downloadURL  https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad_l.js
// @updateURL    https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad_l.js
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    console.log("hook1.1.4", location.href);

    window.addEventListener('load', function () {
        setTimeout(() => {
            setInterval(() => { 
                let iframes = [...document.querySelectorAll('iframe'), ...document.querySelectorAll('frame')];
                iframes.forEach(ele => { 
                    try {
                        let multiple_x = ele.contentWindow.document.querySelector('#rate-3');
                        if (multiple_x && multiple_x.style.color !== 'rgb(114, 88, 87)') { // null 체크 추가
                            multiple_x.click();
                        }
                    } catch (e) {
                        console.error("Error in multiple_x logic:", e); // 오류 로깅 추가
                    }
                    try {
                        let video = ele.contentWindow.document.querySelector('video');
                        if (video && video.duration > 0) { // null 체크 추가
                            let current = video.currentTime;
                            if (current === video.duration) {
                            	if(ele.contentWindow.now_page == ele.contentWindow.total_page){
                            		moveNextChapter();
                            	}else{
                                	ele.contentWindow.document.querySelector('#next').click();
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Error in video logic:", e); // 오류 로깅 추가
                    }
                });
            }, 1000);
        }, 2000);
    });
	function moveNextChapter() {
	    // 1. 현재 URL 가져오기
	    var currentUrl = window.location.href;
	    console.log("현재 URL:", currentUrl);
	
	    // 2. URLSearchParams 객체를 사용하여 매개변수 파싱 (최신 브라우저 지원)
	    var urlParams = new URLSearchParams(window.location.search);
	
	    // 3. chapterNo 값 가져오기
	    var chapterNo = urlParams.get('chapterNo');
	
	    if (chapterNo && chapterNo.length === 4) {
	        // 4. 현재 챕터 번호의 마지막 두 자리 추출 및 숫자로 변환
	        var currentChapterNum = parseInt(chapterNo.substring(2, 4), 10); // "03" -> 3
	
	        if (!isNaN(currentChapterNum)) {
	            // 5. 챕터 번호 1 증가
	            var nextChapterNum = currentChapterNum + 1;
	
	            // 6. 증가된 숫자를 다시 두 자리 문자열로 포맷팅 (예: 3 -> "03", 10 -> "10")
	            var nextChapterNumStr = nextChapterNum.toString().padStart(2, '0');
	
	            // 7. 새로운 chapterNo 생성 (예: "0103" -> "0104")
	            var nextChapterNo = chapterNo.substring(0, 2) + nextChapterNumStr;
	
	            // 8. URLSearchParams 객체의 chapterNo 업데이트
	            urlParams.set('chapterNo', nextChapterNo);
	
	            // 9. 새로운 전체 URL 생성
	            // search 속성을 직접 변경하면 자동으로 페이지가 새로고침됩니다.
	            // 또는 history.pushState를 사용하여 주소만 변경할 수도 있습니다.
	            // 여기서는 location.href를 직접 조작하여 확실하게 이동시킵니다.
	            var newUrl = window.location.origin + window.location.pathname + '?' + urlParams.toString() + window.location.hash;
	
	            console.log("다음 챕터 URL:", newUrl);
	            
	            // 10. 페이지 이동
	            window.location.href = newUrl;
	
	        } else {
	            console.error("chapterNo의 숫자 부분을 파싱할 수 없습니다.");
	        }
	    } else {
	        console.error("URL에서 chapterNo 매개변수를 찾거나 형식이 올바르지 않습니다.");
	    }
	}
    const hooking_fn = (str) => { // 수정된 부분: 화살표 함수 구문 수정
        try {
            let temp = str.replace("confirm('다음 차시를 학습하시겠습니까?')", "true");
            temp = temp.replace("'', '');", "'', '');\n} else{\n window.parent.close(); window.close();");
            temp = temp.replace("confirm(confirmMsg)", "true");
            temp = temp.replace("alert('영상을 다 보셔야 합니다.');", "");
            return temp;
        } catch (e) {
            console.error("Error in hooking_fn:", e); // 오류 로깅 추가
            return str; // 오류 발생 시 원본 문자열 반환
        }
    };
    

})();
