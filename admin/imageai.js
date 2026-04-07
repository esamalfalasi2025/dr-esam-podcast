
// ── IMAGE AI TAB ────────────────────────────────────────────────
(function() {
  var $ = function(id){ return document.getElementById(id); };
  var imgData = { a: null, b: null, aMime: 'image/jpeg', bMime: 'image/jpeg' };

  function setupZone(zoneId, fileId, previewId, imgId, phId, key) {
    var fileInput = $(fileId);
    fileInput.addEventListener('change', function() {
      if (fileInput.files[0]) loadFile(fileInput.files[0], key, previewId, imgId, phId);
    });
    var zone = $(zoneId);
    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.style.borderColor='var(--gold)'; });
    zone.addEventListener('dragleave', function() { zone.style.borderColor=''; });
    zone.addEventListener('drop', function(e) {
      e.preventDefault(); zone.style.borderColor='';
      if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0], key, previewId, imgId, phId);
    });
  }

  function loadFile(file, key, previewId, imgId, phId) {
    imgData[key + 'Mime'] = file.type || 'image/jpeg';
    var reader = new FileReader();
    reader.onload = function(ev) {
      imgData[key] = ev.target.result.split(',')[1];
      $(imgId).src = ev.target.result;
      $(previewId).style.display = 'block';
      $(phId).style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  setupZone('img-zone-a','img-file-a','img-prev-a','img-img-a','img-ph-a','a');
  setupZone('img-zone-b','img-file-b','img-prev-b','img-img-b','img-ph-b','b');

  window.clearZone = function(key, e) {
    e.stopPropagation();
    imgData[key] = null;
    $('img-prev-' + key).style.display = 'none';
    $('img-ph-'   + key).style.display = 'block';
    $('img-file-' + key).value = '';
  };

  var progInterval = null;
  function startProgress(hasPhoto) {
    $('img-status-bar').style.display = 'block';
    $('img-progress-fill').style.width = '0%';
    var pct = 0;
    var msgs = hasPhoto
      ? ['Uploading images…','Analyzing scene…','Swapping character…','Rendering result…','Finalizing…']
      : ['Sending prompt…','Generating image…','Rendering…','Finalizing…'];
    var msgIdx = 0;
    progInterval = setInterval(function() {
      pct = Math.min(pct + (pct < 50 ? 2 : pct < 85 ? 0.8 : 0.2), 94);
      $('img-progress-fill').style.width = pct + '%';
      var newIdx = Math.min(Math.floor(pct / (100 / msgs.length)), msgs.length - 1);
      if (newIdx !== msgIdx) { msgIdx = newIdx; $('img-status-text').textContent = msgs[msgIdx]; }
    }, 350);
  }
  function stopProgress(ok) {
    clearInterval(progInterval);
    $('img-progress-fill').style.width = ok ? '100%' : '0%';
    setTimeout(function() { $('img-status-bar').style.display = 'none'; }, 900);
  }

  $('img-generate-btn').addEventListener('click', async function() {
    var episodeTitle = $('img-episode-name').value.trim();
    var extraPrompt  = $('img-prompt').value.trim();
    var model        = $('img-model').value;
    var aspectRatio  = $('img-aspect').value;

    var finalPrompt = '';
    if (imgData.a && imgData.b) {
      finalPrompt = 'I am giving you two images. Image 1 is the scene. Image 2 contains the replacement character. ' +
        'Replace the person/character in Image 1 with the person/character from Image 2. ' +
        'Keep 100% of the scene, background, lighting, shadows, objects, and composition of Image 1 completely unchanged. ' +
        'Only swap the character. Make it photorealistic and seamless. ' +
        (extraPrompt ? extraPrompt : 'Ultra-realistic, 8K quality, natural integration.');
    } else if (imgData.a) {
      if (!extraPrompt && !episodeTitle) { showErr('Please add instructions or an episode title describing what to change in the scene.'); return; }
      var editInstr = [episodeTitle, extraPrompt].filter(Boolean).join('. ');
      finalPrompt = 'Edit this image as follows: ' + editInstr + '. Keep everything else unchanged.';
    } else {
      // Text-to-image: episode title is the main subject, extra prompt adds detail
      if (!episodeTitle && !extraPrompt) { showErr('Please enter an episode title or prompt, or upload an image.'); return; }
      finalPrompt = [episodeTitle, extraPrompt].filter(Boolean).join('. ');
    }

    var storedKey = '';
    try {
      // Read from localStorage directly (loadContent may not be globally accessible)
      var _raw = localStorage.getItem('drEsamContent');
      if (_raw) storedKey = (JSON.parse(_raw).settings || {}).googleKey || '';
      // Fallback: read from the visible input field
      if (!storedKey) { var _inp = document.getElementById('s-google-key'); if (_inp) storedKey = _inp.value.trim(); }
    } catch(e) {}

    $('img-generate-btn').disabled = true;
    $('img-btn-text').style.display = 'none';
    $('img-btn-spinner').style.display = 'inline';
    $('img-error').style.display = 'none';
    $('img-results').style.display = 'none';
    startProgress(!!(imgData.a || imgData.b));

    try {
      var payload = { prompt: finalPrompt, model: model, aspectRatio: aspectRatio };
      if (storedKey)  payload.apiKey = storedKey;
      if (imgData.a)  { payload.imageB64 = imgData.a; payload.imageMimeType = imgData.aMime; }
      if (imgData.b)  { payload.image2B64 = imgData.b; payload.image2MimeType = imgData.bMime; }

      var res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      var data;
      try { data = await res.json(); } catch(e) { throw new Error('Server returned no response. The request may have timed out — try a simpler prompt.'); }
      if (!res.ok || data.error) { showErr(data.error || 'Generation failed.'); stopProgress(false); return; }

      stopProgress(true);
      renderResults(data.images);
    } catch(err) {
      stopProgress(false);
      showErr(err.message);
    } finally {
      $('img-generate-btn').disabled = false;
      $('img-btn-text').style.display = 'inline';
      $('img-btn-spinner').style.display = 'none';
    }
  });

  function showErr(msg) {
    $('img-error').textContent = String.fromCharCode(9888) + ' ' + msg;
    $('img-error').style.display = 'block';
  }

  var currentSrc = null;
  var currentExt = 'jpg';

  function renderResults(images) {
    if (!images || !images.length) { showErr('No image was returned. Try a different prompt or model.'); return; }

    var first = images[0];
    currentSrc = 'data:' + first.mimeType + ';base64,' + first.base64;
    currentExt = first.mimeType.includes('png') ? 'png' : 'jpg';

    // Show large preview
    $('img-result-img').src = currentSrc;
    $('img-grid').innerHTML = '';

    // If multiple images, show extras in grid below
    if (images.length > 1) {
      images.slice(1).forEach(function(img, i) {
        var src = 'data:' + img.mimeType + ';base64,' + img.base64;
        var ext = img.mimeType.includes('png') ? 'png' : 'jpg';
        var epName = ($('img-episode-name').value || '').trim();
        var baseName = epName ? epName.replace(/[^a-zA-Z0-9\u0600-\u06FF _\-]/g, '').trim().replace(/\s+/g, '-') : 'drEsam';
        var card = document.createElement('div');
        card.className = 'img-card';
        card.innerHTML = '<img src="' + src + '" alt="Result ' + (i+2) + '" style="cursor:pointer" onclick="useAsMain(\'' + src + '\',\'' + ext + '\')" />' +
          '<div class="img-card-footer"><button class="img-dl-btn" onclick="dlImg(\'' + src + '\',\'' + baseName + '-' + (i+2) + '.' + ext + '\')">&#11015; Save</button></div>';
        $('img-grid').appendChild(card);
      });
    }

    $('img-results').style.display = 'block';
    $('img-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Save button
  $('img-save-btn').addEventListener('click', function() {
    if (!currentSrc) return;
    var ep = ($('img-episode-name').value || '').trim();
    var name = ep ? ep.replace(/[^a-zA-Z0-9\u0600-\u06FF _\-]/g, '').trim().replace(/\s+/g, '-') : 'drEsam-image';
    dlImg(currentSrc, name + '.' + currentExt);
  });

  // New generation button — scroll back to top of tab
  $('img-new-btn').addEventListener('click', function() {
    $('img-results').style.display = 'none';
    $('img-error').style.display = 'none';
    $('tab-imageai').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

function dlImg(src, name) {
  var a = document.createElement('a');
  a.href = src; a.download = name; a.click();
}
function useAsMain(src, ext) {
  document.getElementById('img-result-img').src = src;
  // update save target
  window._imgMainSrc = src; window._imgMainExt = ext;
}
