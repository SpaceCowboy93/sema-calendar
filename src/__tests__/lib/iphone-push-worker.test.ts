import { it, expect, vi } from 'vitest'
// Execute the actual worker with fake clients; never send a real push.
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

async function tap(url: string, existing = true) {
  const handlers: Record<string, (event: unknown) => void> = {}
  const focus = vi.fn().mockResolvedValue(undefined)
  const navigate = vi.fn().mockResolvedValue({ focus })
  const clients = { matchAll: vi.fn().mockResolvedValue(existing ? [{ url: 'https://sema.test/together', focus, navigate }] : []), openWindow: vi.fn() }
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    URL, clients,
    self: { location: { origin: 'https://sema.test' }, addEventListener: (name: string, fn: (e: unknown) => void) => { handlers[name] = fn } },
  })
  let done: Promise<unknown> | undefined
  handlers.notificationclick({ notification: { close: vi.fn(), data: { url } }, waitUntil: (promise: Promise<unknown>) => { done = promise } })
  await done
  return { navigate, focus, clients }
}

it('navigates an existing app window to the notification deep link before focusing', async () => {
  const { navigate, focus } = await tap('/planner?event=fixture')
  expect(navigate).toHaveBeenCalledWith('https://sema.test/planner?event=fixture')
  expect(focus).toHaveBeenCalledOnce()
})
it.each(['https://evil.test/path', '//evil.test', 'javascript:alert(1)', 'http://['])('contains unsafe or invalid tap target %s', async target => {
  const { clients } = await tap(target, false)
  expect(clients.openWindow).toHaveBeenCalledWith('https://sema.test/')
})
