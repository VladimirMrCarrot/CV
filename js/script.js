/*
 * ЗМІНИ:
 * [FIX 1] Тема зберігається в localStorage — не скидається при перезавантаженні
 * [FIX 1] Відновлення теми відбувається ДО рендеру (запобігає "flash" світлого фону)
 * [FIX 12] function transition() → const transition = () => (послідовний стиль)
 */

const checkbox = document.querySelector('.theme-switch__checkbox');

// [FIX 12] Визначено до використання (уникаємо TDZ з const)
const transition = () => {
  document.documentElement.classList.add('transition');
  setTimeout(() => document.documentElement.classList.remove('transition'), 250);
};

// [FIX 1] Відновлення збереженої теми при завантаженні
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  checkbox.checked = savedTheme === 'dark';
}

checkbox.addEventListener('change', function () {
  transition();
  const theme = this.checked ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  // [FIX 1] Зберігаємо вибір користувача
  localStorage.setItem('theme', theme);
});
