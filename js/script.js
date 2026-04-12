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
  const controls = document.querySelector('.cv-controls');
  const element  = document.querySelector('.cv');
  const isDark   = document.documentElement.getAttribute('data-theme') === 'dark';
  const bgColor  = isDark ? '#202020' : '#ffffff';

  controls.style.display = 'none';
  let linkData = [];

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      windowWidth: 900,
      backgroundColor: bgColor,
      logging: false,
      onclone: (clonedDoc) => {
        clonedDoc.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

        const clonedCV   = clonedDoc.querySelector('.cv');
        const clonedRect = clonedCV.getBoundingClientRect();

        clonedCV.querySelectorAll('a[href]').forEach((link) => {
          const r = link.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;

          // Спочатку вимірюємо — потім міняємо колір
          linkData.push({
            href:   link.href,  // link.href вже абсолютний URL — без індексів
            left:   r.left   - clonedRect.left,
            top:    r.top    - clonedRect.top,
            width:  r.width,
            height: r.height
          });

          link.style.color = '#f2b666';
        });
      }
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

    const scaleX = imgW / (canvas.width  / 2);
    const scaleY = imgH / (canvas.height / 2);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    if (isDark) {
      pdf.setFillColor(32, 32, 32);
      pdf.rect(0, 0, A4_W, A4_H, 'F');
    }

    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN, MARGIN, imgW, imgH);

    linkData.forEach(({ href, left, top, width, height }) => {
      pdf.link(
        MARGIN + left   * scaleX,
        MARGIN + top    * scaleY,
        width  * scaleX,
        height * scaleY,
        { url: href }
      );
    });

    pdf.save('CV_Volodymyr_Semenko.pdf');

  } finally {
    controls.style.display = '';
  }
});

// Scroll to top
const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
  const scrolled  = window.scrollY + window.innerHeight;
  const threshold = document.documentElement.scrollHeight * 0.6;
  scrollTopBtn.classList.toggle('visible', scrolled >= threshold);
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});