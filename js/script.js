const checkbox = document.querySelector('.theme-switch__checkbox');

const mmToPt = (mm) => mm * (72 / 25.4);

const parseRgb = (color) => {
  const m = color && color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return [51, 51, 51];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  return btoa(binary);
};

let ubuntuFontPromise;
const ensureUbuntuFonts = async (pdf) => {
  if (!ubuntuFontPromise) {
    ubuntuFontPromise = (async () => {
      const regularUrl = 'https://raw.githubusercontent.com/google/fonts/main/ufl/ubuntu/Ubuntu-Regular.ttf';
      const boldUrl = 'https://raw.githubusercontent.com/google/fonts/main/ufl/ubuntu/Ubuntu-Bold.ttf';

      const [regularRes, boldRes] = await Promise.all([fetch(regularUrl), fetch(boldUrl)]);
      if (!regularRes.ok || !boldRes.ok) {
        throw new Error('Failed to load Ubuntu font files for PDF export');
      }

      const [regularBuf, boldBuf] = await Promise.all([regularRes.arrayBuffer(), boldRes.arrayBuffer()]);

      return {
        regularB64: arrayBufferToBase64(regularBuf),
        boldB64: arrayBufferToBase64(boldBuf)
      };
    })();
  }

  const fonts = await ubuntuFontPromise;
  pdf.addFileToVFS('Ubuntu-Regular.ttf', fonts.regularB64);
  pdf.addFont('Ubuntu-Regular.ttf', 'Ubuntu', 'normal');
  pdf.addFileToVFS('Ubuntu-Bold.ttf', fonts.boldB64);
  pdf.addFont('Ubuntu-Bold.ttf', 'Ubuntu', 'bold');
};

const transition = () => {
  document.documentElement.classList.add('transition');
  setTimeout(() => document.documentElement.classList.remove('transition'), 250);
};

const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  checkbox.checked = savedTheme === 'dark';
}

const finalizeFontInit = () => {
  document.documentElement.classList.remove('fonts-loading');
  document.documentElement.classList.add('fonts-ready');
};

if (document.fonts?.ready) {
  document.fonts.ready.then(finalizeFontInit).catch(finalizeFontInit);
} else {
  finalizeFontInit();
}

setTimeout(() => {
  document.documentElement.classList.add('theme-ready');
  document.documentElement.classList.remove('theme-init');
}, 50);

checkbox.addEventListener('change', function () {
  transition();
  const theme = this.checked ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
});

document.getElementById('downloadPdf').addEventListener('click', async () => {
  const element  = document.querySelector('.cv');
  const isDark   = document.documentElement.getAttribute('data-theme') === 'dark';
  const useTextOverlay = true;
  const bgColor  = isDark ? '#202020' : '#ffffff';
  const renderScale = 2;

  let linkData = [];
  let clonedCvSize = { width: 0, height: 0 };
  let mobileTextData = [];

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(element, {
      scale: renderScale,
      useCORS: true,
      windowWidth: 900,
      backgroundColor: bgColor,
      logging: false,
      onclone: (clonedDoc) => {
        clonedDoc.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        clonedDoc.documentElement.setAttribute('data-pdf', 'true');
        clonedDoc.documentElement.style.overflow = 'visible';
        clonedDoc.documentElement.style.webkitTextSizeAdjust = 'none';
        clonedDoc.documentElement.style.textSizeAdjust = 'none';
        clonedDoc.documentElement.style.backgroundColor = bgColor;
        clonedDoc.body.style.overflow = 'visible';
        clonedDoc.body.style.margin = '0';
        clonedDoc.body.style.backgroundColor = bgColor;

        const clonedCV   = clonedDoc.querySelector('.cv');
        const clonedView = clonedDoc.defaultView;

        clonedDoc.querySelectorAll('.cv-controls, .scroll-top').forEach((el) => {
          el.style.display = 'none';
        });

        // Force desktop canvas layout no matter the current viewport width.
        clonedCV.style.width = '900px';
        clonedCV.style.maxWidth = '900px';
        clonedCV.style.backgroundColor = bgColor;
        const clonedRect = clonedCV.getBoundingClientRect();
        clonedCvSize = { width: clonedRect.width, height: clonedRect.height };

        clonedCV.querySelectorAll('h1, h2, .experience__name').forEach((el) => {
          el.style.setProperty('letter-spacing', '0', 'important');
          el.style.setProperty('word-spacing', '0', 'important');
          el.style.fontKerning = 'normal';
          el.style.fontVariantLigatures = 'normal';

          if (useTextOverlay) {
            // Keep required font while preserving spacing fixes in PDF exports.
            el.style.setProperty('font-family', 'Ubuntu, sans-serif', 'important');
            el.style.setProperty('font-stretch', 'normal', 'important');
            el.style.setProperty('font-variant-ligatures', 'none', 'important');
            el.style.setProperty('font-kerning', 'none', 'important');
          }
        });

        if (useTextOverlay) {
          clonedCV.querySelectorAll('.header-content h1, .header-content h2, .experience__name').forEach((el) => {
            if (el.querySelector('a')) return;

            const text = (el.textContent || '').trim();
            if (!text) return;

            const style = clonedView.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            mobileTextData.push({
              text,
              left: rect.left - clonedRect.left,
              top: rect.top - clonedRect.top,
              color: style.color,
              fontSizePx: parseFloat(style.fontSize) || 16,
              fontWeight: style.fontWeight || '400'
            });

            // Hide these nodes in canvas and redraw as vector text in PDF.
            el.style.setProperty('color', 'transparent', 'important');
            el.style.setProperty('text-shadow', 'none', 'important');
          });
        }

        // html2canvas may drop native list markers, so inject explicit bullets.
        clonedCV.querySelectorAll('li').forEach((li) => {
          if (li.querySelector('.pdf-bullet-marker')) return;

          const marker = clonedDoc.createElement('span');
          marker.className = 'pdf-bullet-marker';
          marker.textContent = '•';
          marker.setAttribute('aria-hidden', 'true');

          const markerColor = clonedView.getComputedStyle(li).color;
          li.style.listStyle = 'none';
          li.style.position = 'relative';
          li.style.paddingLeft = '1rem';

          marker.style.position = 'absolute';
          marker.style.left = '0';
          marker.style.top = '0';
          marker.style.lineHeight = '1.2';
          marker.style.fontWeight = '700';
          marker.style.color = markerColor;

          li.prepend(marker);
        });

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

    const scaleX = clonedCvSize.width > 0 ? (imgW / clonedCvSize.width) : (imgW / (canvas.width / renderScale));
    const scaleY = clonedCvSize.height > 0 ? (imgH / clonedCvSize.height) : (imgH / (canvas.height / renderScale));

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    if (isDark) {
      pdf.setFillColor(32, 32, 32);
      pdf.rect(0, 0, A4_W, A4_H, 'F');
    }

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', MARGIN, MARGIN, imgW, imgH);

    if (useTextOverlay && mobileTextData.length > 0) {
      try {
        await ensureUbuntuFonts(pdf);
      } catch (e) {
        console.warn('Ubuntu font embedding failed for PDF overlay:', e);
      }

      mobileTextData.forEach((item) => {
        const [r, g, b] = parseRgb(item.color);
        const fontStyle = Number(item.fontWeight) >= 600 ? 'bold' : 'normal';
        const x = MARGIN + item.left * scaleX;
        const y = MARGIN + item.top * scaleY + (item.fontSizePx * 0.82 * scaleY);

        try {
          pdf.setFont('Ubuntu', fontStyle);
        } catch {
          pdf.setFont('helvetica', fontStyle);
        }

        pdf.setTextColor(r, g, b);
        pdf.setFontSize(mmToPt(item.fontSizePx * scaleY));
        pdf.text(item.text, x, y, { baseline: 'alphabetic' });
      });
    }

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

  } finally {}
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