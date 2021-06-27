import fs from "fs"
import palette from "./palette";

export const ensurePath = (path: string) => {
	if (!fs.existsSync(path)) fs.mkdirSync(path);
}

export const dumpData = (data: string, file: string) => {
	fs.writeFileSync(file, data)
}

export const getColour = (pixel: number) => {
	return palette[pixel]
		.map( col => {
			if(col == 0) return col
			col = col + (col/2) + (col/4)
			if(col > 255) col = 255
			return col
		})
}



export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const uint16 = (a: Uint8Array, b: Uint8Array) => {
	let arr16 = new Uint16Array(a.length)
	for(let i=0; i< arr16.length; ++i)
		arr16[i] = (a[i] << 8) + b[i]
		
	return arr16
}