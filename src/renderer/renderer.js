const temp = window.ipc.getVersion();
const version = document.getElementById('version');
version.innerHTML = temp;

const btn = document.getElementById('check-update');
btn.addEventListener('click', () => {
  window.ipc?.checkUpdate();
});
(async () => {
  const res = await window.ipc?.setConfig({
    key: 'test_key',
    value: '测试',
  });
  console.log(res, 'upsert res 插入数据库res');

  const res2 = await window.ipc?.getConfig('test_key');
  console.log(res2, 'getConfig res2');

  const res3 = await window.ipc?.deleteConfig('test_key');
  console.log(res3, 'deleteConfig res3');
})();
