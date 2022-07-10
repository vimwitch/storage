const { nanoid } = require('nanoid')
const { getAssetFromKV } = require('@cloudflare/kv-asset-handler')

addEventListener('fetch', (event) => {
  event.respondWith(handle(event))
})

async function handle(event) {
  const url = new URL(event.request.url)
  if (event.request.method === 'POST' && url.pathname === '/create') {
    // make a new entry and return the key
    const key = nanoid()
    const data = await event.request.json()
    const existing = await STORAGE_BINDINGS.get(data.name)
    if (existing) {
      return new Response('Already used', {
        status: 422
      })
    }
    await STORAGE_BINDINGS.put(data.name, JSON.stringify({
      key,
      name: data.name,
      target: data.target || '',
    }))
    return new Response(JSON.stringify({
      key,
    }))
  } else if (event.request.method === 'POST' && url.pathname === '/update') {
    const data = await event.request.json()
    const stored = JSON.parse(await STORAGE_BINDINGS.get(data.name))
    if (stored.key !== data.key) {
      return new Response('Bad key', {
        status: 401
      })
    }
    await STORAGE_BINDINGS.put(data.name, JSON.stringify({
      ...stored,
      target: data.target || '',
    }))
    return new Response('', {
      status: 204
    })
  }

  const [name, ...p] = url.pathname.slice(1).split('/')
  const data = await STORAGE_BINDINGS.get(name)
  if (!data) {
    return new Response('Name not found', {
      status: 400
    })
  }
  const { target } = JSON.parse(data)
  return Response.redirect(`${target}${target.endsWith('/') ? '' : '/'}${p.join('/')}`, 302)
}
