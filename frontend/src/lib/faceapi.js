// Lazy-loads face-api.js from CDN and provides a simple detect() helper.
// Demo-grade only: we just want "is a human face present?"

const FACEAPI_CDN = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

let _loadPromise = null;

function injectScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export async function loadFaceApi() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    await injectScript(FACEAPI_CDN);
    // eslint-disable-next-line no-undef
    const fa = window.faceapi;
    if (!fa) throw new Error("face-api.js failed to initialize");
    await fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    return fa;
  })();
  return _loadPromise;
}

export async function detectFace(imgOrVideo) {
  const fa = await loadFaceApi();
  const opts = new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const detections = await fa.detectAllFaces(imgOrVideo, opts);
  return detections; // array of detections with box and score
}
