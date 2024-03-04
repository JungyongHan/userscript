// ==UserScript==
// @name          KOROAD LEARNING HELPER
// @namespace     KOROAD LEARNING
// @description   AUTO SKIPPING VIDEO
// @author        Absolute
// @version       1.95
// @include       *://study.labs.hunet.co.kr/learning/*
// @compatible    Chrome Google Chrome + Tampermonkey
// @license       MIT
// @downloadURL  https://raw.githubusercontent.com/JungyongHan/userscript/main/koroad.js
// @updateURL    https://raw.githubusercontent.com/JungyongHan/userscript/main/koroad.js
// @copyright     Absolute, 2024-Mar-04
// ==/UserScript==


(function() {
    const scri_version = 1.95
    let number_id = '';
    const ended_event = (e) => {
      if(typeof pageObj !== 'undefined'){
        var indexSeq = $("#openInfo input[name=indexSeq]").val();
        var config = {
          siteNm: GL_LMS_API,
          url: "/lms-api/v1/learnings/indexes/learning-item/" + GL_openConfig.learningItemSeq + "/cms-index-seq/" + indexSeq,
          method: "GET"
        };

        GL_ajax.callApi(config).done(function (data, status, jqXHR) {
          if(data.passYn){
            var strNextItemIndex = $("#indexItemInfo input[name=nextIndexInfo]").val();
            if(strNextItemIndex === ''){
              window.close();
            } 
            var nextLearningIndexSeq = $("#indexItemInfo input[name=nextLearningIndexSeq]").val();
            var nextRunSubjectItemIndexSeq = $("#indexItemInfo input[name=nextRunSubjectItemIndexSeq]").val();
            var nextItemIndex = JSON.parse(strNextItemIndex);
            pageObj.goIndex(nextLearningIndexSeq, nextRunSubjectItemIndexSeq, nextItemIndex.indexSeq);
          }else{
            pageObj.movePage('next');
          }
        }).fail(function (data, status, jqXHR) {
            GLF_failAfterProcess(this, data, status, jqXHR);
        });              
      }
    };

    const video_checker = (vid) => {
        document.title = `${number_id} ${parseInt(vid.currentTime)}/${parseInt(vid.duration)} ${scri_version}`
        vid.muted = true;
        if(vid.paused){
            vid.play();
        }
        vid.removeEventListener('ended', ended_event);
        vid.addEventListener('ended', ended_event ,false);
    };

    window.addEventListener('load', function(){
    try{
      console.log('machine running');
      number_id = document.querySelector('#openInfo [name="accountLoginId"]').value;
      this.setInterval(()=>{
        window.resizeTo(380,200);
      },10000);

      this.setInterval(()=>{
        try{
          let iframes = this.document.querySelectorAll('iframe');
          if(iframes.length > 0){
            iframes.forEach((ele) => {
              let contentWindow = ele.contentWindow;
              try{
                contentWindow.document.querySelector('#mediaPlay').click();
              }catch{}
                let vids = contentWindow.document.querySelectorAll('video');
                if(vids.length > 0){
                  vids.forEach((vid) => {
                    video_checker(vid);
                  });
                }else{
                  this.document.querySelector('.btn-play-type02').click();
                }
            });
          }else{
            let vid = this.document.querySelector('video');
            if(!vid){
                this.document.querySelector('.btn-play-type02').click();
            }else{
                video_checker(vid);
            }

          }
        }catch{}

      }, 1000);
    }catch{}
  }, false);


})();
