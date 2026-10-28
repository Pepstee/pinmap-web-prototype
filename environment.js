// Mode is explicit in the iframe URL. Never infer it from saved browser state.
const PM_ENV = (() => {
  const development = new URLSearchParams(location.search).get('mode') === 'development';
  const placeholderImage = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="#F4F4F5"/><text x="200" y="125" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#6B6B70">사진 없음</text></svg>');
  return Object.freeze({development, storageKey:development?'pinmap.dev.v1':'pinmap.v3', placeholderImage});
})();
