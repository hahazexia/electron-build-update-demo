const temp = window.ipc.getVersion();
const version = document.getElementById('version');
version.innerHTML = temp;

const btn = document.getElementById('check-update');
btn.addEventListener('click', () => {
  window.ipc?.checkUpdate();
});
(async () => {
  const res = await window.ipc?.setConfig({
    key: 'test',
    value: JSON.stringify({
      a: 1,
      b: 2,
    }),
  });
  console.log(res, 'upsert res 插入数据库res');
})();
