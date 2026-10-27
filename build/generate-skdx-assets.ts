/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(root, 'resources/skdx/assets.json');
const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
if (process.argv.includes('--check')) {
	const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
	for (const [file, expected] of Object.entries(manifest)) {
		if (hash(await fs.readFile(path.join(root, file))) !== expected) {
			throw new Error(`Stale SKDX asset: ${file}; run npm run generate-branding`);
		}
	}
	console.log('SKDX branding assets verified');
} else {
	const manifest: Record<string, string> = {};
	async function write(file: string, bytes: string | Uint8Array) {
		await fs.writeFile(path.join(root, file), bytes);
		manifest[file] = hash(bytes);
	}
	const mark = await fs.readFile(path.join(root, 'resources/skdx/mark.svg'), 'utf8');
	manifest['resources/skdx/mark.svg'] = hash(mark);
	manifest['resources/skdx/logo.svg'] = hash(await fs.readFile(path.join(root, 'resources/skdx/logo.svg')));
	// The site's compact mark is designed for 16px. Fixed ink makes desktop raster assets independent of OS theme.
	const svg = mark.replace(/<style>[\s\S]*?<\/style>/, '<style>.ink { stroke: #607d9f }</style>').replace('aria-label="SkandaDX"', 'aria-label="SKDX Code"');
	await write('src/vs/workbench/browser/media/code-icon.svg', svg);
	const strokes = [...mark.matchAll(/<polyline points="([^"]+)"/g)].map(match => match[1].split(' ').map((point, index) => {
		const [x, y] = point.split(',').map(Number);
		return `${index === 0 ? 'M' : 'L'}${((x * 0.62 - 1.02) * 3.5 + 6).toFixed(3)} ${((y * 0.62 + 4.56) * 3.5 + 6).toFixed(3)}`;
	}).join(''));
	if (strokes.length !== 6) {
		throw new Error('The compact SKDX mark must contain its six original polylines.');
	}
	await write('src/vs/workbench/contrib/chat/browser/widget/skdxLogoPaths.ts', `/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Generated from SkandaDX artwork in resources/skdx/mark.svg. Run npm run generate-branding.
export const skdxLogoPaths = ${JSON.stringify([strokes[0] + strokes[1] + strokes[2], strokes[3], strokes[4] + strokes[5]], null, '\t').replace(/"/g, '\'')} as const;
`);

	for (const [theme, ink] of Object.entries({ light: '#b5b5b5', dark: '#404040', hcLight: '#292929', hcDark: '#ffffff' })) {
		await write(`src/vs/workbench/browser/parts/editor/media/letterpress-${theme}.svg`, svg.replace('#607d9f', ink));
	}
	// ponytail: this rasterizer supports the site's polyline/translate/scale mark; use a full SVG renderer if the artwork changes.
	async function raster(width: number, height = width) {
		const result = execFileSync('python3', ['-c', `
import sys,json,re,base64,io,xml.etree.ElementTree as ET
from PIL import Image,ImageDraw
args=json.load(sys.stdin); root=ET.fromstring(args['svg'])
w,h=args['width'],args['height']; aa=4; size=min(w,h)
image=Image.new('RGBA',(w*aa,h*aa)); draw=ImageDraw.Draw(image)
for group in root.iter('{http://www.w3.org/2000/svg}g'):
	if 'transform' not in group.attrib: continue
	transform=group.attrib['transform']
	match=re.fullmatch(r'translate\\(([-0-9.]+) ([-0-9.]+)\\) scale\\(([-0-9.]+)\\)',transform)
	if not match: raise ValueError('Unsupported SVG transform: '+transform)
	tx,ty,scale=map(float,match.groups()); stroke=2.8*scale*size/24*aa
	for line in group:
		if not line.tag.endswith('polyline'): raise ValueError('Unsupported SVG element: '+line.tag)
		points=[tuple(map(float,p.split(','))) for p in line.attrib['points'].split()]
		points=[(((x*scale+tx)*size/24+(w-size)/2)*aa,((y*scale+ty)*size/24+(h-size)/2)*aa) for x,y in points]
		draw.line(points,fill=(96,125,159,255),width=round(stroke),joint='curve')
		for x,y in points: draw.ellipse((x-stroke/2,y-stroke/2,x+stroke/2,y+stroke/2),fill=(96,125,159,255))
image=image.resize((w,h),Image.Resampling.LANCZOS)
output=io.BytesIO(); image.save(output,format='PNG')
print(json.dumps({'png':base64.b64encode(output.getvalue()).decode(),'rgba':list(image.tobytes())}))
`], { input: JSON.stringify({ svg, width, height }), maxBuffer: 32 * 1024 * 1024 });
		return JSON.parse(result.toString()) as { png: string; rgba: number[] };
	}
	const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
	const pngs = new Map<number, Buffer>();
	for (const size of sizes) { pngs.set(size, Buffer.from((await raster(size)).png, 'base64')); }
	// PNG-backed ICO and ICNS containers preserve transparency at every resolution.
	const icoSizes = sizes.filter(size => size <= 256);
	let offset = 6 + icoSizes.length * 16;
	const icoHeader = Buffer.alloc(offset);
	icoHeader.writeUInt16LE(1, 2); icoHeader.writeUInt16LE(icoSizes.length, 4);
	icoSizes.forEach((size, index) => {
		const start = 6 + index * 16;
		icoHeader[start] = icoHeader[start + 1] = size === 256 ? 0 : size;
		icoHeader.writeUInt16LE(1, start + 4); icoHeader.writeUInt16LE(32, start + 6);
		icoHeader.writeUInt32LE(pngs.get(size)!.length, start + 8); icoHeader.writeUInt32LE(offset, start + 12);
		offset += pngs.get(size)!.length;
	});
	const ico = Buffer.concat([icoHeader, ...icoSizes.map(size => pngs.get(size)!)]);
	const chunks = Object.entries({ icp4: 16, icp5: 32, icp6: 64, ic07: 128, ic08: 256, ic09: 512, ic10: 1024 }).map(([type, size]) => {
		const header = Buffer.alloc(8); header.write(type); header.writeUInt32BE(8 + pngs.get(size)!.length, 4);
		return Buffer.concat([header, pngs.get(size)!]);
	});
	const icnsHeader = Buffer.alloc(8); icnsHeader.write('icns'); icnsHeader.writeUInt32BE(8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4);
	await write('resources/darwin/code.icns', Buffer.concat([icnsHeader, ...chunks]));
	await write('resources/win32/code.ico', ico);
	await write('resources/win32/sessions.ico', ico);
	await write('resources/server/favicon.ico', ico);
	await write('resources/linux/code.png', pngs.get(512)!);
	for (const [file, size] of Object.entries({ 'resources/server/code-192.png': 192, 'resources/server/code-512.png': 512, 'resources/win32/code_70x70.png': 70, 'resources/win32/code_150x150.png': 150 })) {
		await write(file, Buffer.from((await raster(size)).png, 'base64'));
	}
	for (const file of (await fs.readdir(path.join(root, 'resources/win32'))).filter(file => /^inno-.*\.bmp$/.test(file))) {
		const previous = await fs.readFile(path.join(root, 'resources/win32', file));
		const width = previous.readInt32LE(18), height = Math.abs(previous.readInt32LE(22));
		const { rgba } = await raster(width, height);
		const stride = Math.ceil(width * 3 / 4) * 4;
		const bmp = Buffer.alloc(54 + stride * height, 255);
		bmp.fill(0, 0, 54); bmp.write('BM'); bmp.writeUInt32LE(bmp.length, 2); bmp.writeUInt32LE(54, 10); bmp.writeUInt32LE(40, 14);
		bmp.writeInt32LE(width, 18); bmp.writeInt32LE(height, 22); bmp.writeUInt16LE(1, 26); bmp.writeUInt16LE(24, 28); bmp.writeUInt32LE(stride * height, 34);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const source = (y * width + x) * 4, target = 54 + (height - y - 1) * stride + x * 3;
				for (let c = 0; c < 3; c++) { bmp[target + c] = Math.round(rgba[source + 2 - c] * rgba[source + 3] / 255 + 255 - rgba[source + 3]); }
			}
		}
		await write(`resources/win32/${file}`, bmp);
	}
	await fs.writeFile(manifestPath, JSON.stringify(manifest, null, '\t') + '\n');
}
