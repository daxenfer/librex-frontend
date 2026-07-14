export function printPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  iframe.src = url
  document.body.appendChild(iframe)

  const cleanup = () => {
    document.body.removeChild(iframe)
    URL.revokeObjectURL(url)
  }

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      if (iframe.contentWindow) iframe.contentWindow.onafterprint = cleanup
    }, 400)
  }

  setTimeout(cleanup, 60000)
}
