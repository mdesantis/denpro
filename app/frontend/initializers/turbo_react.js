import TurboReact from '~/lib/turbo_react'

const components = import.meta.glob('~/components/**/*.(j|t)sx')
const turboReact = new TurboReact(components)

turboReact.start()
