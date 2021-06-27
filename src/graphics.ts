import cliProgress from "cli-progress"
import BinaryFile from "binary-file"
import { Parser } from "binary-parser"
import { getGraphicsSegment, saveFrame } from "./segments"

const readGraphicsData = async(filename: string) => {
	
	const file = new BinaryFile(`./data/DREAMWEB.${filename}`, "r", true)
	await file.open()
	
	const schema = new Parser()
		.endianess("little")
		
		//
		// ─── START HEADER ────────────────────────────────────────────────
		.string("desc", {
			length: 50
		})
		.array("len", {
			type: "uint16le",
			length: 20
		})
		.array("padding", {
			type: "uint8",
			length: 6
		})
		// ─── END HEADER ──────────────────────────────────────────────────
		//
		
		.nest("gfx", getGraphicsSegment(0))
	
	
	const contents = schema.parse(await file.read(await file.size()))
	return await contents
}


const extractGraphicsFile = async(name: string, blocks: any) => {
	
	console.log(`Trying to extract ${blocks.frames.length} from gfx file ${name}`)
	//const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
	//progress.start(blocks.frames.length, 0)
	
	for(let i=0; i<blocks.frames.length; i++){
		//progress.update(i)
		await saveFrame(blocks, i, `./assets/gfx/${name}`)		
	}	
	
	//progress.stop()
}




export const extractGfx = async() => {
	const gfx = ["G00", "G01", "G02", "G03", "G04", "G05", "G06", "G07", "G08", "G09", "G10", "G11", "G12", "G13", "G14", "G15", "C00", "C01", "C02", "S00", "S02"]
	
	for(const g in gfx){
		const gfxData = await readGraphicsData(gfx[g])
		await extractGraphicsFile(gfx[g], gfxData.gfx)
	}
	
	// gfx.forEach( async(gfx) => {
	// 	const gfxData = await readGraphicsData(gfx)
	// 	//console.log(gfxData.gfx.offsets)
	// 	await extractGraphicsFile(gfx, gfxData.gfx)
	// })
}