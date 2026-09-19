/**
 * Minimal ambient types for `draco3dgltf`, which ships no declarations.
 *
 * Only the two factories this app calls are declared, and their results are handed
 * straight to `@gltf-transform`'s `registerDependencies` without being inspected —
 * so describing the emscripten module surface in detail would be fiction. Narrower
 * than `any`, and honest about what is actually known.
 */
declare module 'draco3dgltf' {
  /** Opaque emscripten module — only `@gltf-transform` ever touches its members. */
  export type DracoModule = object

  export function createEncoderModule(): Promise<DracoModule>
  export function createDecoderModule(): Promise<DracoModule>

  const draco3dgltf: {
    createEncoderModule: typeof createEncoderModule
    createDecoderModule: typeof createDecoderModule
  }
  export default draco3dgltf
}
