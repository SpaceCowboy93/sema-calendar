import type { BrowserContext } from '@playwright/test'

/** Synthetic auth and data responses; no real account, cache or backend writes. */
export async function isolateShoppingPreview(context: BrowserContext, baseURL: string) {
  const blockedWrites: string[] = []
  await context.addInitScript(() => {
    const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated',
      role: 'authenticated', email: 'qa@example.invalid' }
    const session = {
      access_token: 'eyJhbGciOiJIUzI1NiJ9.' + btoa(JSON.stringify({ sub: user.id, exp: 4102444800 })) + '.fixture',
      refresh_token: 'fixture', expires_at: 4102444800, expires_in: 999999,
      user, token_type: 'bearer',
    }
    for (const ref of ['wwxdinkdjkjiqzynfbdk', 'placeholder']) {
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session))
    }
  })
  await context.routeWebSocket('**/*', socket => socket.close())
  await context.route('**/*', route => {
    const request = route.request()
    const url = new URL(request.url())
    // This gate precedes even the fixture handlers: no mutation can reach a server.
    if (request.method() !== 'GET') {
      blockedWrites.push(`${request.method()} ${url.pathname}`)
      return route.abort()
    }
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: {
      id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', email: 'qa@example.invalid',
    } })
    if (url.pathname === '/rest/v1/profiles') return route.fulfill({ json: { app_user_name: 'mateo' } })
    if (url.pathname === '/rest/v1/couple_members') return route.fulfill({ json: { couple_id: 'qa-isolated' } })
    if (url.pathname === '/rest/v1/couple_state') return route.fulfill({ json:
      url.searchParams.get('select') === 'id' ? { id: 'sema' } : {
        state: { shoppingLists: [{
          id: 'qa-list', name: 'Isolated Shopping QA', createdBy: 'mateo', isCompleted: false,
          createdAt: '2099-01-01', updatedAt: '2099-01-01',
          items: [{ id: 'qa-existing', name: 'Existing fixture item', quantity: 2,
            isChecked: false, createdAt: '2099-01-01' }],
        }] }, updated_at: '2099-01-01T00:00:00Z',
      },
    })
    if (url.origin === new URL(baseURL).origin && !url.pathname.startsWith('/api/')) return route.continue()
    return route.abort()
  })
  return blockedWrites
}
