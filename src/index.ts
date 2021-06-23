import BinaryFile from "binary-file"
import {Parser} from "binary-parser"
import Struct from "struct"
import Jimp from "jimp"
//import palette from "./palette"
import cliProgress from "cli-progress"
import _ from "lodash"
import palette from "./palette"
import fs from "fs"
import wavefile, { WaveFile } from "wavefile"

import Room from "./Room"
import { RoomData, workspaceArr } from "./data"



const kFrameBlocksize = 2080
const kGraphicsFileFrameSize = 347

const ROOMPATHS_SIZE = 36 * 144

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const uint16 = (a: Uint8Array, b: Uint8Array) => {
	let arr16 = new Uint16Array(a.length)
	for(let i=0; i< arr16.length; ++i)
		arr16[i] = (a[i] << 8) + b[i]
		
	return arr16
}

const getGraphicsSegment = (no: number) => {
	return {
		type: new Parser()
			.buffer("frames", {
				type: "uint8",
				length: kFrameBlocksize,
				//@ts-ignore
				formatter: arr => {
					
					const STRUCT2 = Struct()
						.word8("width")
						.word8("height")
						.word16Ule("ptr")
						.word8("x")
						.word8("y")
						
					const STRUCT = Struct()
						.array("data", 346, STRUCT2)
					STRUCT.setBuffer(arr)
					
					//Just to make Typescript play nice
					const fields = STRUCT.fields as any				
					
					return  Object.entries(fields.data).map( data => {		
						return JSON.parse(JSON.stringify(data[1]))
					}).filter(item => {
						return item.width > 0 && item.height > 0
					})	
				}
			})
			.array("data", {
				length: item => item.len[no] - kFrameBlocksize,
				type: "uint8"
			})				
	}
}

const getTextSegment = (no: number) => {
	return {
		type: new Parser()
			.buffer("offsets", {
				length: 2052
			})
			.string("text", {
				length: item => item.len[no] - 2052
			})
	}
}

const readRoomData = async(filename: string) => {
	
	const file = new BinaryFile(`./data/DREAMWEB.${filename}`, "r", true)
	await file.open()
	
	const BackdropBlocksSchema = new Parser().array("data", { length: 256, type: "uint8" })
	
	const DynamicObjectStructure = new Parser()
		.uint8("currentLocation")
		.uint8("index")
		.array("mapad", { type: "uint8", length: 5})
		.uint8("slotSize")		
		.uint8("slotCount")
		.uint8("objectSize")
		.uint8("turnedOn")
		.uint8("initialLocation")
		.array("objId", { type: "uint8", length: 4})
	
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

		.array("backdropFlags", {
			lengthInBytes: 192,
			type: new Parser()
				.uint8("flag")
				.uint8("flagEx")
		})
		.array("backdropBlocks", {
			length: item => (item.len[0] - 192) / 256,
			type: BackdropBlocksSchema
		})
		
		//Actually workspace() in c++ // Don't think it'll be used
		.array("workspace", {
			length: item => item.len[1],
			type: "uint8"
		})
		
		//Graphics segment
		.nest("setFrames", getGraphicsSegment(2))
		
		//setDat = Skip for now
		.buffer("setDat", {
			length: item => item.len[3],
			type: "uint8"
		})
		
		//Graphics segments
		.nest("reel1", getGraphicsSegment(4))
		.nest("reel2", getGraphicsSegment(5))
		.nest("reel3", getGraphicsSegment(6))
		
		//Read room paths
		.array("pathData", {
			lengthInBytes: item => item.len[7] <= ROOMPATHS_SIZE ? item.len[7] : ROOMPATHS_SIZE,
			type: new Parser()
				.array("nodes", { length: 12, type: new Parser()
					.uint8("x")
					.uint8("y")	
					.uint8("x1")	
					.uint8("y1")				
					.uint8("x2")	
					.uint8("y2")	
					.uint8("on")	
					.uint8("dir")	
				})
				.array("segments", { length: 24, type: new Parser()
					.uint8("b0")
					.uint8("b1")
				})
		})
		
		.buffer("reelList", {
			length: item => {
				if(item.len[7] <= ROOMPATHS_SIZE) return 0
				
				//console.log("item.len[7]", item.len[7], ROOMPATHS_SIZE)
				const reelLen = item.len[7] - ROOMPATHS_SIZE
				//console.log("reelLen", reelLen)
				const reelCount = (reelLen + 4) / 5
				//console.log(reelCount)
				
				return item.len[7] - ROOMPATHS_SIZE
			},
			type: "uint8",
			//@ts-ignore
			formatter: arr => {
				
				const STRUCT2 = Struct()
					.word8("frame_lo")
					.word8("frame_hi")
					.word8("x")
					.word8("y")
					.word8("b4")
					
				//@ts-ignore
				const reelLen = arr.length
				const reelCount = (reelLen + 4) / 5
					
				const STRUCT = Struct()
					.array("data", reelCount/5, STRUCT2)
				STRUCT.setBuffer(arr)
				
				//Just to make Typescript play nice
				const fields = STRUCT.fields as any
				
				return  Object.entries(fields.data).map( data => {		
					return JSON.parse(JSON.stringify(data[1]))
				})
				
			}
		})
		
		//Person frames
		.array("personFrames", {
			length: 12,
			type: "uint16le"
		})
		
		//Extract text segments
		.nest("personText", {
			type: new Parser()
				.array("offsets", {
					lengthInBytes: 2052,
					type: "uint16le"
				})
				// .string("text", {
				// 	length: item => item.len[8] - 24 - 2052
				// })
				.buffer("text", {
					length: item =>  item.len[8] - 24 - 2052
				})
		})
		
		//TODO: Check all text segments ---
		
		.nest("setDesc", getTextSegment(9))
		.nest("blockDesc", getTextSegment(10))
		.nest("roomDesc", getTextSegment(11))
		
		.nest("freeFrames", getGraphicsSegment(12))
		
		//Unsure what this is for
		// .buffer("freeDat", {
		// 	//length: 79, // item => item.len[13]
		// 	lengthInBytes: 1,
		// 	type: DynamicObjectStructure
		// })
		.buffer("freeDat", {
			//length: 79, // item => item.len[13]
			length: item => item.len[13],
			type: "uint8" //DynamicObjectStructure
		})
		
		.nest("freeDesc", getTextSegment(14))
	
	const contents = schema.parse(await file.read(await file.size()))
	return await contents

}

const readSoundData = async(filename: string) => {
	
	const file = new BinaryFile(`./data/DREAMWEB.${filename}`, "r", true)
	await file.open()
	
	const TABLESIZE = 72
	
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
		
		.array("samples", {			
			lengthInBytes: (item) => {
				//console.log(">>>", item.len[0])
				console.log("--", item.len[0])
				return item.len[0] * 6 // TABLESIZE
			},
			type: "uint8",
			//@ts-ignore
			formatter: (buffer: number[])  => {
				
				const TABLESIZE = buffer.length / 6
				//console.log(TABLESIZE)
				
				//offset, size				
				let output = []				
				for(let i=0; i<TABLESIZE; i=i+6){
					const line = buffer.splice(0, 6)
					const offset = line[0] * 16384 + ((line[2] << 8) | 0) // (1 * 16384) + (8<<8 | 1)
					const size = ((line[3] << 8) | 0) * 8 //* 2048
					output.push({ offset, size })
				}
				console.log(output)		
				return output
			}	
			
		})
		.buffer("data", {
			readUntil: "eof"
		})

	const contents = schema.parse(await file.read(await file.size()))	
	return await contents
	
}

const readTextData = async(filename: string) => {
	
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
		
		//Extract text segments
		.nest("text", {
			type: new Parser()
				.array("offsets", {
					lengthInBytes: 2 * 66,
					type: "uint16le"
				})
				.string("text", {
					greedy: true
				})
				// .buffer("text", {
				// 	length: item =>  item.len[8] - 24 - 2052
				// })
		})
		
		
		
	const contents = schema.parse(await file.read(await file.size()))
	return await contents
	
}

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


const extractBackdropBlocks = async(name: string, blocks: any) => {
	
	new Jimp(256, (Math.ceil(blocks.length / 16) * 16), (err, image) => {
		blocks.forEach( (block: any, idx1: number) => {
			block.data.forEach( (element: number, idx2: number) => {
				
				const colour = palette[element]
					.map( col => {
						if(col == 0) return col
						col = col + (col/2) + (col/4)
						if(col > 255) col = 255
						return col
					})
					
				image.setPixelColor(Jimp.rgbaToInt(
					colour[0], 
					colour[1],
					colour[2], 
					255), 
					(idx2 % 16) + ((idx1 % 16) * 16),
					(idx2/16 | 0) + ((idx1/16 |0) * 16)
				)
				
			})
		})
		
		image.write(`./assets/rooms/${name}/back-tiles.png`);
		console.log("Back tiles extracted")		
	})
	
}

const extractGraphicsSegment = async(name: string, type: string, blocks: any) => {
	
	console.log(`Trying to extract ${blocks.frames.length} frames from ${type}`)
	const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
	progress.start(blocks.frames.length, 0)
	
	for(let i=0; i<blocks.frames.length; i++){
		progress.update(i)
		await saveFrame(blocks, i, `./assets/rooms/${name}/${type}`)		
	}	
	
	progress.stop()
}

const extractGraphicsFile = async(name: string, blocks: any) => {
	
	console.log(`Trying to extract ${blocks.frames.length} from gfx file ${name}`)
	const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
	progress.start(blocks.frames.length, 0)
	
	for(let i=0; i<blocks.frames.length; i++){
		progress.update(i)
		await saveFrame(blocks, i, `./assets/gfx/${name}`)		
	}	
	
	progress.stop()
}

const extractTextSegment = async(name: string, type: string, blocks: any) => {
	// blockas has offsets and text
	//`${location}/${frame}.png`
	
	console.log(blocks.offsets)
	
	const dir = `./assets/rooms/${name}/text`
	
	try {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir);
		fs.writeFileSync(`${dir}/${type}.txt`, blocks.text)
		
	} catch (err) {
		console.error(err)
	}
}

const extractTextFile = async(name: string, blocks: any) => {
	// blockas has offsets and text
	//`${location}/${frame}.png`
	
	const logger = fs.createWriteStream(`./assets/text/${name}.txt`)
	
	//Parsing help:
	// Starts with + - This is an option
	// : = line break
	// * = end of file
	
	for(let i=0; i<blocks.offsets.length; i++){
		const line = blocks.text.substr( blocks.offsets[i], blocks.offsets[i+1] - blocks.offsets[i]) + "\n"
		logger.write(line)	
	}
	logger.end()
}


const getColour = (pixel: number) => {
	return palette[pixel]
		.map( col => {
			if(col == 0) return col
			col = col + (col/2) + (col/4)
			if(col > 255) col = 255
			return col
		})
}

const saveFrame = async(blocks: any, frame: number, location: string) => {
	const frameData = blocks.frames[frame]
	
	const width = frameData.width
	const height = frameData.height
	
	if(width==0 || height==0) return
	
	const data = _.slice(blocks.data, frameData.ptr)
	
	new Jimp(width, height, (err: any, image: any) => {
		
		if(err) console.error("AN ERROR OCCURED: ", err)
		
		for(let j=0; j<height; ++j){
			for(let i=0; i< width; ++i){
				
				const pixel = data[j*width + i] as number
				if(pixel){
					const colour = getColour(pixel)					
					
					image.setPixelColor(Jimp.rgbaToInt(
						colour[0],
						colour[1],
						colour[2],
						255), 
						i, 	//X
						j 	//Y
					)
					
				}				
			}
		}
		image.write(`${location}/${frame}.png`);
	})
	
	
	
}

const extractWorkspace = async(name: string, workspace: number[]) => {
	const kMapHeight = 60
	const kMapWidth = 66
	
	//fs.writeFileSync(`./assets/rooms/${name}/workspace.txt`, workspace.map(l => l+1).join(", "))
	
	const logger = fs.createWriteStream(`./assets/rooms/${name}/workspace.txt`)
	let outArr = _.clone(workspaceArr).map( (i, idx) => {
		if(idx < workspace.length) return workspace[idx] +1
		return i+1
	})	
	
	//logger.write(outArr.join(","))	
	//workspace.splice(0, kMapWidth)	
	
	let mainArr: number[] = []
	while(outArr.length > 0){		
		const line = outArr.splice(0, kMapWidth)
		mainArr = [...mainArr, ...line]
		//const txt = line.join(", ") + ","
		//logger.write(txt)	
		outArr.splice(0, kMapWidth)	
	}
	//Generate template
	let template = fs.readFileSync("./data/template.json", "utf8")
	template = template.replace("##DATA##", mainArr.join(","))
	template = template.replace("##PATH##", `.\/back-tiles.png`)
	fs.writeFileSync(`.\/assets\/rooms\/${name}\/map.json`, template)
		
	
	// while(workspace.length > 0){
		
	// 	const line = workspace.splice(0, kMapWidth)
	// 	const txt = line.map(l => l.toString().padStart(2)).join(",") + ",\n"
	// 	logger.write(txt)	
	// 	workspace.splice(0, kMapWidth)		
	// }	
	logger.end()
	
}

const extractRoom = async (name: string, room: any) => {
	
	console.log(`=== Extracting room: ${name} ===`)
	// await extractBackdropBlocks(name, room.backdropBlocks)
	// await extractGraphicsSegment(name, "frames", room.setFrames)
	// await extractGraphicsSegment(name, "reel1", room.reel1)
	// await extractGraphicsSegment(name, "reel2", room.reel2)
	// await extractGraphicsSegment(name, "reel3", room.reel3)
	// await extractGraphicsSegment(name, "freeFrames", room.freeFrames)
	// await extractTextSegment(name, "personText", room.personText)
	// await extractTextSegment(name, "setDesc", room.setDesc)
	// await extractTextSegment(name, "blockDesc", room.blockDesc)
	// await extractTextSegment(name, "roomDesc", room.roomDesc)
	// await extractTextSegment(name, "freeDesc", room.freeDesc)
	
	//await extractWorkspace(name, room.workspace)
	
	//console.log(roomData.workspace.join(","))
	
}

const extractRooms = async() => {
	const rooms = ["R00", "R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09", "R10", "R11", "R12", "R13", "R14", "R19", "R20", "R21", "R22", "R23", "R24", "R25", "R26", "R27", "R28", "R29", "R45", "R46", "R47", "R50", "R52", "R53", "R54", "R55"]
	
	rooms.forEach( async(roomToLoad) => {
		
		const roomData = await readRoomData(roomToLoad)
		await extractRoom(roomToLoad, roomData)
		
		//const room = new Room(RoomData[24])
		//console.log(room, room.findRoomInLoc())
	})
}

const extractText = async() => {
	const texts = ["T01", "T02", "T10", "T11", "T12", "T13", "T20", "T21", "T22", "T23", "T24", "T50", "T51", "T80", "T81", "T82", "T83", "T84"]
	texts.forEach( async(text) => {
		const textData = await readTextData(text)
		await extractTextFile(text, textData.text)
	})
	console.log("Text extracted")
}

const extractGfx = () => {
	const gfx = ["G00", "G01", "G02", "G03", "G04", "G05", "G06", "G07", "G08", "G09", "G10", "G11", "G12", "G13", "G14", "G15", "C00", "C01", "C02", "S00", "S02"]
	gfx.forEach( async(gfx) => {
		const gfxData = await readGraphicsData(gfx)
		//console.log(gfxData.gfx.offsets)
		await extractGraphicsFile(gfx, gfxData.gfx)
	})
}

const extractSfx = () => {
	const sfx = ["V01","V02","V05","V06","V08","V09","V10","V11","V12","V14", "V19", "V22", "V23", "V30", "V33", "V34", "V35", "V99"]
	sfx.forEach( async(sfx) => {
		const sfxData = await readSoundData(sfx)
		console.log(sfxData.data.length)
		
		sfxData.samples.forEach( (sample: any, i: number) => {
			
			const dir = `./assets/sfx/${sfx}`
			if (!fs.existsSync(dir)) fs.mkdirSync(dir);
			const fileName = `${dir}/${i}.wav`
			console.log(`Extracting ${fileName}`)
			
			const wav = new WaveFile()
			const data = Buffer.from(sfxData.data.slice(sample.offset, sample.offset + sample.size))
			wav.fromScratch(1, 22050, "8", data)
			fs.writeFileSync(fileName, wav.toBuffer())			
		})
	})
}

const extrator = async() => {
	
	//await extractRooms()
	//await extractText()	
	//await extractGfx()
	//await extractSfx()
	
	//console.log(uint16(new Uint8Array(8,0), new Uint8Array(0)))
	
	//console.log(Int16Array.from([0,0,0,8]))
	
}
extrator()








