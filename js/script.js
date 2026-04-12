const checkbox = document.querySelector('.theme-switch__checkbox');

const transition = () => {
  document.documentElement.classList.add('transition');
  setTimeout(() => document.documentElement.classList.remove('transition'), 250);
};

const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  checkbox.checked = savedTheme === 'dark';
}

checkbox.addEventListener('change', function () {
  transition();
  const theme = this.checked ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
});

document.getElementById('downloadPdf').addEventListener('click', async () => {
  const controls    = document.querySelector('.cv-controls');
  const element     = document.querySelector('.cv');
  const isDark      = document.documentElement.getAttribute('data-theme') === 'dark';
  const bgColor     = isDark ? '#202020' : '#ffffff';

  const parent      = element.parentNode;
  const nextSibling = element.nextSibling;

  controls.style.display = 'none';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: fixed;
    top: 0;
    left: -9999px;
    width: 900px;
    background: ${bgColor};
  `;
  document.body.appendChild(wrapper);
  wrapper.appendChild(element);
  element.style.maxWidth = 'none';
  element.style.margin   = '0';
  element.style.position = 'relative';

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      windowWidth: 900,
      backgroundColor: bgColor,
      logging: false
    });

    const A4_W     = 210;
    const A4_H     = 297;
    const MARGIN   = 8;
    const contentW = A4_W - MARGIN * 2;
    const contentH = A4_H - MARGIN * 2;

    const ratio = canvas.height / canvas.width;
    let imgW = contentW;
    let imgH = contentW * ratio;

    if (imgH > contentH) {
      imgH = contentH;
      imgW = contentH / ratio;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    if (isDark) {
      pdf.setFillColor(32, 32, 32);
      pdf.rect(0, 0, A4_W, A4_H, 'F');
    }

    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN, MARGIN, imgW, imgH);

    const scaleX = imgW / element.offsetWidth;
    const scaleY = imgH / element.offsetHeight;

    element.querySelectorAll('a[href]').forEach(link => {
      let top = 0, left = 0, el = link;
      while (el && el !== element) {
        top  += el.offsetTop;
        left += el.offsetLeft;
        el    = el.offsetParent;
      }
      if (!el) return;

      const w = link.offsetWidth;
      const h = link.offsetHeight;
      if (w === 0 || h === 0) return;

      pdf.link(
        MARGIN + left * scaleX,
        MARGIN + top  * scaleY,
        w * scaleX,
        h * scaleY,
        { url: link.href }
      );
    });

    pdf.save('CV_Volodymyr_Semenko.pdf');

  } finally {
    element.style.maxWidth = '';
    element.style.margin   = '';
    element.style.position = '';
    if (nextSibling) {
      parent.insertBefore(element, nextSibling);
    } else {
      parent.appendChild(element);
    }
    document.body.removeChild(wrapper);
    controls.style.display = '';
  }
});

// Scroll to top
const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
  const scrolled    = window.scrollY + window.innerHeight;
  const threshold   = document.documentElement.scrollHeight * 0.6;
  scrollTopBtn.classList.toggle('visible', scrolled >= threshold);
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});