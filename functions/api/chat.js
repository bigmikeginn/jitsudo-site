const CHAT_API_URL = 'https://jitsudo-chatbot.vercel.app/api/chat';

function proxyHeaders(source) {
  const headers = new Headers();
  const contentType = source.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('cache-control', 'no-store');
  return headers;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
      'cache-control': 'no-store',
    },
  });
}

export async function onRequestPost({ request }) {
  const upstream = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: await request.text(),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: proxyHeaders(upstream),
  });
}
