declare module '*.json' {
  const value: any
  export default value
}

declare module 'topojson-client' {
  export function feature(topology: any, object: any): any
}
