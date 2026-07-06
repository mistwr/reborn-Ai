export const exportToHTML = (html: string, filename: string): void => {
  const element = document.createElement('a')
  element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(html))
  element.setAttribute('download', `${filename}.html`)
  element.style.display = 'none'
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

export const exportToPDF = async (html: string, filename: string): Promise<void> => {
  try {
    // Dynamically import html2pdf to keep bundle small
    const html2pdf = (await import('html2pdf.js')).default
    const element = document.createElement('div')
    element.innerHTML = html
    const opt = {
      margin: 10,
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
    }
    html2pdf().set(opt).from(element).save()
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw error
  }
}

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export const exportToEPUB = async (html: string, filename: string, title: string, author: string): Promise<void> => {
  try {
    // Dynamically import JSZip (browser-compatible) to keep the bundle small.
    // An EPUB is a ZIP archive with a specific internal structure.
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    const bookId = `urn:uuid:${crypto.randomUUID()}`
    const safeTitle = escapeXml(title || 'Untitled')
    const safeAuthor = escapeXml(author || 'Unknown')

    // 1. The mimetype file MUST be first and stored uncompressed.
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

    // 2. Container descriptor pointing at the package document.
    zip.folder('META-INF')?.file(
      'container.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    )

    const oebps = zip.folder('OEBPS')

    // 3. The single chapter document.
    oebps?.file(
      'chapter1.xhtml',
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>${safeTitle}</title></head>
  <body>${html}</body>
</html>`,
    )

    // 4. The package document (metadata, manifest, spine).
    oebps?.file(
      'content.opf',
      `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${bookId}</dc:identifier>
    <dc:title>${safeTitle}</dc:title>
    <dc:creator>${safeAuthor}</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>`,
    )

    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
    const url = URL.createObjectURL(blob)
    const element = document.createElement('a')
    element.href = url
    element.download = `${filename}.epub`
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting to EPUB:', error)
    throw error
  }
}

export const generatePagesFromHTML = (html: string, chapterSize: number = 3000): string[] => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const text = doc.body.textContent || ''
  const pages: string[] = []

  for (let i = 0; i < text.length; i += chapterSize) {
    pages.push(text.substring(i, i + chapterSize))
  }

  return pages
}
