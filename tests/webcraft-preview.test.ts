import test from "node:test"
import assert from "node:assert/strict"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { WebcraftPreview } from "../components/webcraft-preview"
import { hardenPreviewHtml } from "../lib/webcraft-preview"

const project = '<!DOCTYPE html><html lang="pt-PT"><head><style>body{background:#f4f1eb}</style></head><body><h1>Olá, Lumin</h1><img src="data:image/png;base64,dGVzdA=="></body></html>'

test("the first iframe render already contains the prepared document and final sandbox", () => {
  const markup = renderToStaticMarkup(createElement(WebcraftPreview, { html: project }))
  const srcdoc = markup.match(/srcDoc="([^"]*)"/)?.[1]
  assert.ok(srcdoc)
  assert.match(srcdoc, /data-lumin-safe-preview/)
  assert.ok(srcdoc.indexOf("data-lumin-safe-preview") < srcdoc.indexOf("&lt;body&gt;"))
  assert.match(srcdoc, /body\{background:#f4f1eb\}/)
  assert.match(srcdoc, /Olá, Lumin/)
  assert.match(srcdoc, /data:image\/png;base64,dGVzdA==/)
  assert.match(markup, /sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"/)
  assert.doesNotMatch(markup, /allow-same-origin/)
})

test("reopening prepared HTML does not add a second preview document or guard", () => {
  const prepared = hardenPreviewHtml(project)
  assert.equal(hardenPreviewHtml(prepared), prepared)
  assert.equal((prepared.match(/<body>/g) ?? []).length, 1)
  assert.equal((prepared.match(/<meta data-lumin-safe-preview/g) ?? []).length, 1)
})

test("preparing the iframe retains the existing navigation guards", () => {
  const prepared = hardenPreviewHtml('<html><head></head><body><a href="null">Teste</a><form action="/checkout"></form><script>location.href = "/dashboard";</script></body></html>')
  assert.match(prepared, /href="#"/)
  assert.match(prepared, /action="#\/checkout"/)
  assert.doesNotMatch(prepared, /location\.href\s*=/)
  assert.match(prepared, /navigation blocked/)
})
