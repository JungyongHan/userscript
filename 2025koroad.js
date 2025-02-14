/*==UserScript==
@name         NEW KOROAD LEARNING HELPER
@version      1.0.2
@include      *://study.hunet.co.kr/Study/*
@downloadURL  https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad.js
@updateURL    https://raw.githubusercontent.com/JungyongHan/userscript/main/2025koroad.js
==/UserScript== */

(function() {
    console.log("hook", location.href);

    window.addEventListener('load', function(){
	    setTimeout(()=>{
	    try{
	    	setTimeout(()=>{
	    		fn_SpeedUp();
	    	}, 5000);
		  	fn_SpeedUp();
		  	console.log("speeed up!!");
	  	}catch{
		  let iframes = [this.document.querySelectorAll('iframe'), ...this.document.querySelectorAll('frame')];
		  if(iframes.length > 0){
		  	iframes.forEach((ele) => {
		  		try{
		  		if(ele.id === 'main' && ele.contentWindow?.edited !== true){
		  			ele.contentWindow.eval(hooking_fn(ele.contentWindow.fnPlayEnd.toString()));
			  		setTimeout(()=>{
			  			ele.contentWindow.fn_SpeedUp();
			  		}, 5000);
		  			ele.contentWindow.jwplayer('video').onPlay(()=>{
		  				ele.contentWindow.fn_SpeedUp();
		  				console.log("speeed up!!");
		  			});
		  			ele.contentWindow.edited = true;
		  		}
		  		
		  		}catch{}
		  		
		  		try{
		  		if(ele.name === 'main' && ele.contentWindow.movieEnd !== undefined){
		  			console.log('detctive old flash type');
		  			let startNum = 1;
		  			setInterval(()=>{
		  				if(ele.contentWindow.movieEnd){
		  					ele.contentWindow.document.querySelector('#btn-next').click();
		  				}
		  				
		  				if(ele.contentWindow.movieEnd === false && ele.contentWindow.document.querySelector('.pager .current') !== null){
		  					ele.contentWindow.document.querySelector('#btn-next').click();
		  				}
		  				if(ele.contentWindow.movieEnd === false && ele.contentWindow.document.querySelector('#hidQuizSeq') !== null){
		  					ele.contentWindow.document.querySelector('#btn-next').click();
		  				}
		  				if(ele.contentWindow.movieEnd === false && ele.contentWindow.document.querySelector('a[onclick="SaveOipinion();"]') !== null){
		  					ele.contentWindow.document.querySelector('#btn-next').click();
		  				}
		  				if(ele.contentWindow.movieEnd === false && ele.contentWindow.totalImgCnt !== undefined ){
		  					ele.contentWindow.document.querySelector('#btn-next').click();
		  				}
		  				if(ele.contentWindow.movieEnd === false && ele.contentWindow.document.querySelector('video') === null && startNum > 10){
		  					ele.contentWindow.document.querySelector('#btn-next').click();
		  				}
		  				if(ele.contentWindow.movieEnd === false && ele.contentWindow.document.querySelector('a[onclick="Click_MoveNextChapter();"]') !== null){
		  					ele.contentWindow.eval(hooking_fn(ele.contentWindow.fnStudyStart.toString()))
		  					ele.contentWindow.document.querySelector('a[onclick="Click_MoveNextChapter();"]').click();
		  				}
		  				startNum++;
		  			}, 1000);
		  		}
		  		}catch{}

		  	});
	  	   }
	  	}
	  	}, 2000);
    });
	const hooking_fn = (str) => {
		let temp = str.replace("confirm('다음 차시를 학습하시겠습니까?')", "true");
		temp = temp.replace("'', '');", "'', '');\n} else{\n window.parent.close(); window.close();");
		temp = temp.replace("confirm(confirmMsg)", "true");
		return temp;
	};
	    
	setTimeout(()=>{
	try{
		if(window?.edited !== true){
	  		window.eval(hooking_fn(fnPlayEnd.toString()));
	  		window.edited === true;
	  	}
	}catch(e){
		console.log(e)
	}
	}, 1000);
  

})();
