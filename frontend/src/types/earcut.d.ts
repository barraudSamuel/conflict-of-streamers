declare module 'earcut' {
  type EarcutCalculation = (
    data: ReadonlyArray<number>,
    holeIndices?: ReadonlyArray<number>,
    dim?: number
  ) => number[]

  interface EarcutStatic extends EarcutCalculation {
    default: EarcutStatic
    flatten(
      data: {
        vertices: number[]
        holes: number[]
        dimensions: number
      },
      dim?: number
    ): {
      vertices: number[]
      holes: number[]
      dimensions: number
    }
  }

  const earcut: EarcutStatic
  export default earcut
}
