import mime from 'mime/lite'

type ENV = {
  Mastodon: R2Bucket
}

export default {
  async fetch(
    request: Request,
    env: ENV,
    context: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url)
    const key = url.pathname.slice(1)

    if (!key || !key.length) {
      return new Response(null, { status: 404 })
    }

    switch (request.method) {
      case 'GET':
        const cache = caches.default
        let response = await cache.match(request)

        if (!response) {
          const object = await env.Mastodon.get(key)

          if (!object) {
            return new Response(null, { status: 404 })
          }

          const mimeType = object.httpMetadata.contentType || mime.getType(key)
          response = new Response(object.body, {
            headers: {
              ...(mimeType && { 'content-type': mimeType }),
              'content-length': object.size.toString(),
              'cache-control': 'public, max-age=31104000'
            }
          })
          context.waitUntil(cache.put(request, response.clone()))
        }

        return response
      default:
        return new Response(null, { status: 405 })
    }
  }
}
