
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const KOREAN_FONT_PATH = '/fonts/NanumBarunGothicLight.ttf';
const KOREAN_FONT_NAME = 'NanumBarunGothicLight';

let koreanFontArrayBuffer: ArrayBuffer | null = null;

async function loadKoreanFont(): Promise<ArrayBuffer | null> {
  if (koreanFontArrayBuffer) return koreanFontArrayBuffer;
  try {
    const response = await fetch(KOREAN_FONT_PATH);
    if (!response.ok) {
      console.error(`Korean font not found at ${KOREAN_FONT_PATH}. Make sure the font file exists in the public/fonts directory.`);
      return null;
    }
    koreanFontArrayBuffer = await response.arrayBuffer();
    return koreanFontArrayBuffer;
  } catch (error) {
    console.error("Failed to load Korean font:", error);
    return null;
  }
}

interface OriginalStyle {
  element: HTMLElement;
  property: string;
  value: string | null;
  priority: string | null;
}

const temporarilyModifyStyles = (element: HTMLElement, stylesToApply: Record<string, string>): OriginalStyle[] => {
  const originalStyles: OriginalStyle[] = [];
  Object.entries(stylesToApply).forEach(([property, value]) => {
    originalStyles.push({
      element,
      property,
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property)
    });
    element.style.setProperty(property, value, 'important');
  });
  return originalStyles;
};

const restoreStyles = (styles: OriginalStyle[]) => {
  styles.forEach(s => {
    if (s.value !== null && s.value !== '') {
      s.element.style.setProperty(s.property, s.value, s.priority || undefined);
    } else {
      s.element.style.removeProperty(s.property);
    }
  });
};

const addElementToPdf = async (
    element: HTMLElement,
    doc: jsPDF,
    currentY: { y: number },
    pageConstants: { A4_WIDTH: number, A4_HEIGHT: number, MARGIN: number, MAX_WIDTH: number, MAX_HEIGHT: number },
    sectionTitle?: string,
    forceRiskFilter?: boolean // New parameter
) => {
    // If the element is not rendered or has no height, skip it.
    if (!element || element.offsetHeight === 0) {
        return;
    }

    const { A4_WIDTH, A4_HEIGHT, MARGIN, MAX_WIDTH } = pageConstants;
    const allStyleRestorers: OriginalStyle[] = [];

    try {
        let elementsToRestoreVisibility: HTMLElement[] = [];
        let currentAncestor: HTMLElement | null = element;
        while (currentAncestor && currentAncestor.tagName !== 'BODY') {
            const computedStyle = window.getComputedStyle(currentAncestor);
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
                 elementsToRestoreVisibility.push(currentAncestor);
            }
            currentAncestor = currentAncestor.parentElement;
        }
        elementsToRestoreVisibility.forEach(el => {
            allStyleRestorers.push(...temporarilyModifyStyles(el, { display: 'block', visibility: 'visible', opacity: '1' }));
        });
        
        const elementStyle = window.getComputedStyle(element);
         if (elementStyle.display === 'none' || elementStyle.visibility === 'hidden' || elementStyle.opacity === '0') {
            allStyleRestorers.push(...temporarilyModifyStyles(element, { display: 'block', visibility: 'visible', opacity: '1'}));
        }
        
        const elementsToExpandQuery = 'div[class*="overflow-auto"], div[class*="overflow-y-auto"], div[class*="max-h-"], div[style*="overflow: auto"], div[style*="overflow-y: auto"], table';
        const elementsToExpand = Array.from(element.querySelectorAll<HTMLElement>(elementsToExpandQuery));
        if (element.matches(elementsToExpandQuery.split(',').map(s => s.trim()).join(','))) {
            elementsToExpand.push(element);
        }
        
        elementsToExpand.forEach(container => {
            allStyleRestorers.push(...temporarilyModifyStyles(container, {
                'overflow': 'visible',
                'height': 'auto',
                'max-height': 'none'
            }));
        });
        
        if (sectionTitle) {
            if (currentY.y + 20 > A4_HEIGHT - MARGIN && currentY.y > pageConstants.MARGIN) { 
                doc.addPage();
                currentY.y = MARGIN;
            }
            doc.setFontSize(14); 
            doc.text(sectionTitle, MARGIN, currentY.y);
            currentY.y += 10; 
        }
        
        const canvas = await html2canvas(element, {
            scale: 2, 
            useCORS: true,
            logging: false, 
            backgroundColor: '#ffffff', 
            onclone: (clonedDoc) => {
                clonedDoc.documentElement.lang = 'ko';
                let metaCharset = clonedDoc.querySelector('meta[charset]');
                if (!metaCharset) {
                    metaCharset = clonedDoc.createElement('meta');
                    (metaCharset as HTMLMetaElement).setAttribute('charset', 'UTF-8');
                    clonedDoc.head.insertBefore(metaCharset, clonedDoc.head.firstChild);
                } else {
                    (metaCharset as HTMLMetaElement).setAttribute('charset', 'UTF-8');
                }

                const style = clonedDoc.createElement('style');
                style.innerHTML = `
                  html, body {
                    font-family: '${KOREAN_FONT_NAME}', 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', Dotum, '돋움', sans-serif !important;
                    background-color: #ffffff !important; 
                    color: hsl(var(--foreground)) !important; 
                    text-rendering: geometricPrecision !important; 
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                  }
                  i, [data-lucide], .sr-only, [aria-hidden="true"] {
                      display: none !important;
                      visibility: hidden !important;
                      width: 0 !important;
                      height: 0 !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      border: none !important;
                      line-height: 0 !important;
                      font-size: 0 !important;
                      opacity: 0 !important;
                  }
                  *:before, *:after { 
                    display: none !important;
                    content: "" !important; 
                    visibility: hidden !important; 
                  }
                  ::placeholder {
                    color: hsl(var(--muted-foreground)) !important;
                    opacity: 1 !important;
                  }
                `;
                clonedDoc.head.appendChild(style);

                if (forceRiskFilter) {
                    const tableBody = clonedDoc.querySelector('.sticky-header > tbody');
                    if (tableBody) {
                        const rows = Array.from(tableBody.querySelectorAll('tr'));
                        rows.forEach(row => {
                            if (!row.classList.contains('bg-accent')) {
                                (row as HTMLElement).style.display = 'none';
                            }
                        });
                    }
                }
            }
        });

        const imgData = canvas.toDataURL('image/png');
        const imgProps = doc.getImageProperties(imgData);
        let pdfImgWidth = imgProps.width / (96 / 25.4); 
        let pdfImgHeight = imgProps.height / (96 / 25.4);

        const ratio = pdfImgWidth / pdfImgHeight;

        if (pdfImgWidth > MAX_WIDTH) {
            pdfImgWidth = MAX_WIDTH;
            pdfImgHeight = pdfImgWidth / ratio;
        }
        
        const spaceForTitleAdjustment = sectionTitle ? 12 : 0; 
        if (currentY.y + pdfImgHeight > A4_HEIGHT - MARGIN && currentY.y > MARGIN + spaceForTitleAdjustment) {
            doc.addPage();
            currentY.y = MARGIN;
        }

        doc.addImage(imgData, 'PNG', MARGIN, currentY.y, pdfImgWidth, pdfImgHeight);
        currentY.y += pdfImgHeight;

        if (pdfImgHeight > 0) { 
           currentY.y += 5; 
        }

    } catch (error) {
        console.error("Error capturing element for PDF:", sectionTitle || "Untitled Section", error);
    } finally {
        restoreStyles(allStyleRestorers.reverse()); 
    }
};

interface PdfSectionInfo {
  ref: React.RefObject<HTMLElement>;
  title?: string;
  isTabbed?: boolean;
  forceRiskFilter?: boolean; // New optional property
}

export async function generatePdf(
    sections: PdfSectionInfo[]
): Promise<jsPDF | null> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const fontBuffer = await loadKoreanFont();

  if (fontBuffer) {
    const base64Font = btoa(new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
    pdf.addFileToVFS(`${KOREAN_FONT_NAME}.ttf`, base64Font);
    pdf.addFont(`${KOREAN_FONT_NAME}.ttf`, KOREAN_FONT_NAME, 'normal');
    pdf.setFont(KOREAN_FONT_NAME);
  } else {
    console.warn("Korean font could not be loaded. PDF text might not render correctly.");
  }

  const pageConstants = {
    A4_WIDTH: 210,
    A4_HEIGHT: 297,
    MARGIN: 15,
    MAX_WIDTH: 0,
    MAX_HEIGHT: 0,
  };
  pageConstants.MAX_WIDTH = pageConstants.A4_WIDTH - pageConstants.MARGIN * 2;
  pageConstants.MAX_HEIGHT = pageConstants.A4_HEIGHT - pageConstants.MARGIN * 2;

  let currentY = { y: pageConstants.MARGIN };

  for (const sectionInfo of sections) {
    const element = sectionInfo.ref.current;
    if (!element) {
      if (sectionInfo.title) {
          if (currentY.y + 20 > pageConstants.A4_HEIGHT - pageConstants.MARGIN && currentY.y > pageConstants.MARGIN) {
              pdf.addPage();
              currentY.y = pageConstants.MARGIN;
          }
          pdf.setFontSize(14);
          pdf.text(sectionInfo.title, pageConstants.MARGIN, currentY.y);
          currentY.y += 15; 
      }
      continue;
    }

    if (sectionInfo.isTabbed) {
        const tabPanels = Array.from(element.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
        
        if (tabPanels.length > 0) {
            for (let i = 0; i < tabPanels.length; i++) {
                const panel = tabPanels[i];
                await addElementToPdf(panel, pdf, currentY, pageConstants, sectionInfo.title ? sectionInfo.title : undefined, sectionInfo.forceRiskFilter);
            }
        } else {
            await addElementToPdf(element, pdf, currentY, pageConstants, sectionInfo.title, sectionInfo.forceRiskFilter);
        }
    } else {
        await addElementToPdf(element, pdf, currentY, pageConstants, sectionInfo.title, sectionInfo.forceRiskFilter);
    }
  }
  return pdf;
}
