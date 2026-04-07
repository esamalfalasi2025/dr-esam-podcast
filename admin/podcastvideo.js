(function () {
  'use strict';

  var pvData = { hostImg: null, hostAudio: null, guestImg: null, guestAudio: null };

  function $(id) { return document.getElementById(id); }

  function pvReadFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload  = function (e) { resolve(e.target.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function pvCompressImage(dataUrl) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var MAX = 768, w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else       { w = Math.round(w * MAX / h); h = MAX; }
        }
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = dataUrl;
    });
  }

  function pvB64(dataUrl)  { return dataUrl.split(',')[1]; }
  function pvMime(dataUrl) { return dataUrl.split(';')[0].replace('data:', ''); }

  function pvSetupUpload(fileInputId, phId, prevId, previewElId, key, isAudio) {
    var input = $(fileInputId);
    if (!input) return;
    input.addEventListener('change', async function () {
      var file = input.files[0];
      if (!file) return;
      var dataUrl = await pvReadFile(file);
      if (!isAudio) dataUrl = await pvCompressImage(dataUrl);
      pvData[key] = { dataUrl: dataUrl, type: isAudio ? file.type : 'image/jpeg' };
      $(phId).style.display  = 'none';
      $(prevId).style.display = 'block';
      $(previewElId).src = dataUrl;
      input.value = '';
    });
  }

  window.pvClearZone = function (key, e) {
    if (e) e.stopPropagation();
    pvData[key] = null;
    var map = {
      'hostImg':   { ph:'pv-ph-host-img',   prev:'pv-prev-host-img',   el:'pv-img-host'    },
      'hostAudio': { ph:'pv-ph-host-audio', prev:'pv-prev-host-audio', el:'pv-audio-host'  },
      'guestImg':  { ph:'pv-ph-guest-img',  prev:'pv-prev-guest-img',  el:'pv-img-guest'   },
      'guestAudio':{ ph:'pv-ph-guest-audio',prev:'pv-prev-guest-audio',el:'pv-audio-guest' }
    };
    var m = map[key]; if (!m) return;
    $(m.ph).style.display   = 'block';
    $(m.prev).style.display = 'none';
    $(m.el).src = '';
  };

  function pvGetKey() {
    try {
      var raw = localStorage.getItem('drEsamContent');
      if (raw) { var k = (JSON.parse(raw).settings || {}).replicateKey || ''; if (k) return k; }
    } catch (_) {}
    var inp = $('s-replicate-key');
    return inp ? inp.value.trim() : '';
  }

  function pvSetStatus(msg) { if ($('pv-status-text')) $('pv-status-text').textContent = msg; }
  function pvShowErr(msg)   { var e=$('pv-error'); if(e){e.textContent='⚠ '+msg; e.style.display='block';} }
  function pvHideErr()      { var e=$('pv-error'); if(e) e.style.display='none'; }
  function pvProgress(pct)  { var e=$('pv-progress-fill'); if(e) e.style.width=pct+'%'; }
  function pvSetLoading(on) {
    var btn=$('pv-generate-btn'); if(!btn) return;
    btn.disabled = on;
    $('pv-btn-text').style.display    = on ? 'none'   : 'inline';
    $('pv-btn-spinner').style.display = on ? 'inline' : 'none';
    $('pv-status-bar').style.display  = on ? 'block'  : 'none';
    if (!on) pvProgress(0);
  }

  async function apiCall(endpoint, payload) {
    var res = await fetch('/api/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var text = await res.text();
    try { return JSON.parse(text); }
    catch (_) { return { error: 'Server error: ' + text.substring(0, 300) }; }
  }

  async function uploadImage(dataUrl) {
    var d = await apiCall('upload-image', {
      imageB64: pvB64(dataUrl), imageMimeType: pvMime(dataUrl)
    });
    if (d.error) throw new Error('Image upload: ' + d.error);
    return d.url;
  }

  async function uploadAudio(dataUrl) {
    var d = await apiCall('upload-audio', {
      audioB64: pvB64(dataUrl), audioMimeType: pvMime(dataUrl)
    });
    if (d.error) throw new Error('Audio upload: ' + d.error);
    return d.url;
  }

  async function createPrediction(imageUrl, audioUrl, apiKey) {
    var d = await apiCall('replicate-create', {
      imageUrl: imageUrl, audioUrl: audioUrl, apiKey: apiKey
    });
    if (d.error) throw new Error('Create video: ' + d.error);
    return d.id;
  }

  async function pollPrediction(id, apiKey, label) {
    var waited = 0;
    while (waited < 900000) {
      await new Promise(function (r) { setTimeout(r, 10000); });
      waited += 10000;
      var d = await apiCall('replicate-status', { id: id, apiKey: apiKey });
      if (d.status === 'done' && d.result_url) return d.result_url;
      if (d.status === 'error') throw new Error(d.error || 'Rendering failed');
      var mins = Math.floor(waited / 60000);
      var secs = Math.floor((waited % 60000) / 1000);
      pvSetStatus('Rendering ' + label + '… ' + mins + 'm ' + secs + 's (' + (d.raw_status || 'processing') + ')');
    }
    throw new Error('Timed out. Check replicate.com/predictions for your video status.');
  }

  async function pvGenerate() {
    pvHideErr();
    $('pv-results').style.display = 'none';

    var apiKey = pvGetKey();
    if (!apiKey) { pvShowErr('No Replicate API key. Go to Settings → Replicate → enter your key → Save.'); return; }
    if (!pvData['hostImg'])    { pvShowErr('Please upload the host photo.');    return; }
    if (!pvData['hostAudio'])  { pvShowErr('Please upload the host audio.');    return; }
    if (!pvData['guestImg'])   { pvShowErr('Please upload the guest photo.');   return; }
    if (!pvData['guestAudio']) { pvShowErr('Please upload the guest audio.');   return; }

    pvSetLoading(true);

    try {
      pvProgress(8);  pvSetStatus('Uploading host photo…');
      var hostImgUrl = await uploadImage(pvData['hostImg'].dataUrl);

      pvProgress(16); pvSetStatus('Uploading host audio…');
      var hostAudUrl = await uploadAudio(pvData['hostAudio'].dataUrl);

      pvProgress(24); pvSetStatus('Submitting host video to Replicate…');
      var hostId = await createPrediction(hostImgUrl, hostAudUrl, apiKey);

      pvProgress(30); pvSetStatus('Rendering host video…');
      var hostUrl = await pollPrediction(hostId, apiKey, 'host');

      pvProgress(58); pvSetStatus('Uploading guest photo…');
      var guestImgUrl = await uploadImage(pvData['guestImg'].dataUrl);

      pvProgress(66); pvSetStatus('Uploading guest audio…');
      var guestAudUrl = await uploadAudio(pvData['guestAudio'].dataUrl);

      pvProgress(74); pvSetStatus('Submitting guest video to Replicate…');
      var guestId = await createPrediction(guestImgUrl, guestAudUrl, apiKey);

      pvProgress(80); pvSetStatus('Rendering guest video…');
      var guestUrl = await pollPrediction(guestId, apiKey, 'guest');

      pvProgress(100); pvSetStatus('Done!');
      pvSetLoading(false);

      var hostName  = $('pv-host-name').value.trim()  || 'Host';
      var guestName = $('pv-guest-name').value.trim() || 'Guest';
      $('pv-host-result-name').textContent  = '🎙️ ' + hostName;
      $('pv-guest-result-name').textContent = '👤 ' + guestName;
      $('pv-video-host').src  = hostUrl;
      $('pv-video-guest').src = guestUrl;
      $('pv-dl-host').onclick  = function () { pvDownload(hostUrl,  hostName  + '-video.mp4'); };
      $('pv-dl-guest').onclick = function () { pvDownload(guestUrl, guestName + '-video.mp4'); };
      $('pv-results').style.display = 'block';
      $('pv-results').scrollIntoView({ behavior:'smooth', block:'start' });

    } catch (err) {
      pvSetLoading(false);
      pvShowErr(err.message);
    }
  }

  function pvDownload(url, name) {
    var a = document.createElement('a');
    a.href = url; a.download = name; a.target = '_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function pvInit() {
    if (!$('pv-generate-btn')) return;
    pvSetupUpload('pv-file-host-img',    'pv-ph-host-img',    'pv-prev-host-img',    'pv-img-host',    'hostImg',    false);
    pvSetupUpload('pv-file-host-audio',  'pv-ph-host-audio',  'pv-prev-host-audio',  'pv-audio-host',  'hostAudio',  true);
    pvSetupUpload('pv-file-guest-img',   'pv-ph-guest-img',   'pv-prev-guest-img',   'pv-img-guest',   'guestImg',   false);
    pvSetupUpload('pv-file-guest-audio', 'pv-ph-guest-audio', 'pv-prev-guest-audio', 'pv-audio-guest', 'guestAudio', true);
    $('pv-generate-btn').addEventListener('click', pvGenerate);
    $('pv-new-btn').addEventListener('click', function () {
      $('pv-results').style.display = 'none';
      pvHideErr();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pvInit);
  else pvInit();

})();
