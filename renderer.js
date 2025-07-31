

const temp = window.api.v();
const v = document.getElementById('version');
v.innerHTML = temp;


const btn = document.getElementById('check-update');
btn.addEventListener('click', () => {
  window.api.send('check-update');
});