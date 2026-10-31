import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import fraunces from '~/assets/og/fraunces-600.ttf.bin';
import outfit from '~/assets/og/outfit-500.ttf.bin';

let ready: Promise<void> | null = null;

/** Rasterizes share-image SVG to PNG. Load this module only when you need it. */
export async function renderPng(svg: string): Promise<Uint8Array> {
  ready ??= initWasm(resvgWasm);
  await ready;
  const resvg = new Resvg(svg, {
    font: {
      fontBuffers: [new Uint8Array(fraunces), new Uint8Array(outfit)],
      defaultFontFamily: 'Outfit Medium',
      loadSystemFonts: false
    }
  } as ConstructorParameters<typeof Resvg>[1]);
  const image = resvg.render();
  const png = image.asPng();
  image.free();
  resvg.free();
  return png;
}
