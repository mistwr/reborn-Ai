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

export const exportToEPUB = async (html: string, filename: string, title: string, author: string): Promise<void> => {
  try {
    // Dynamically import html2epub to keep bundle small
    const { html2epub } = await import('html2epub')
    const book = html2epub.Epub({
      title,
      author,
      chapters: [
        {
          title: 'Chapter 1',
          content: html,
        },
      ],
    })
    html2epub.Download(book, `${filename}.epub`)
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
