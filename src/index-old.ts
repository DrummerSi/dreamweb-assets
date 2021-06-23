




import * as fs from "fs"
import BinaryFile from "binary-file"
import {Parser} from "binary-parser"

//@ts-ignore
import * as pcx from "pcx-js"
//let pcx = require('pcx-js')

import Struct from "struct"
import Jimp from "jimp"

//@ts-ignore
import AnyPalette from "anypalette"

import palette from "./palette"
import * as _ from "lodash"

//Titles
//intro

/**
loadTempText("T82");
	- loadTextFile(_textFile1, suffix);

 */


const kFrameBlocksize = 2080
const kGraphicsFileFrameSize = 347



const loadTextFile = async(filename: string) => {
	
	const file = new BinaryFile(`./data/DREAMWEB.${filename}`, "r")	
	await file.open()
	
	const schema = new Parser()
		.endianess("little")
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
		//Padding?
		.buffer("offsetsLE", {
			length: 2 * 66
		})
		//Text data -- Contains \x00 characters (null) which probably define sentences.. Maybe split these into array?
		.string("text", {
			greedy: true
		})
		
	const contents = schema.parse(await file.read(await file.size()))
	return await contents
}

const loadGraphicsFile = async(filename: string) => {
	
	const file = new BinaryFile(`./data/DREAMWEB.${filename}`, "r", true)	
	await file.open()
		
	const schema = new Parser()
		.endianess("little")
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
		//Graphics file frame size
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
					.array("data", 50, STRUCT2)
				STRUCT.setBuffer(arr)
				
				//Just to make Typescript play nice
				const fields = STRUCT.fields as any				
				
				return  Object.entries(fields.data).map( data => {		
					return JSON.parse(JSON.stringify(data[1]))
				}).filter(item => {
					return item.width > 0 && item.height > 0
				})
				
				/// OR ==============================
				
				// const STRUCT3 = Struct()
				// 	.word8("width")
				// 	.word8("height")
				// 	.word16Ule("ptr")
				// 	.word8("x")
				// 	.word8("y")	
				
				// return JSON.parse(JSON.stringify(STRUCT3.fields))				
			}
		})
		
		//new Parser().array("data", { length: 256, type: "uint8" })
		
		//Graphics data
		// .buffer("data", {
		// 	length: (item) => (item.len[0] - kFrameBlocksize),
		// })
		
		.array("data", {
			length: item => (item.len[0] - kFrameBlocksize),
			type: "uint8"
		})
	
	const contents = schema.parse(await file.read(await file.size()))
	return await contents	
}

const loadSounds = async(filename: string) => {
	
	const file = new BinaryFile(`./data/DREAMWEB.${filename}`, "r", true)	
	await file.open()
	
	//Not sure how we calculate this
	const tablesize = 72
	
	
	//TODO: This is NOT complete :: sound.cpp > loadSounds
	
	const schema = new Parser()
		.endianess("little")
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
		// //Graphics file frame size
		// .array("frames", {
		// 	type: "uint8",
		// 	lengthInBytes: 347
		// })
		// //Graphics data
		// .buffer("data", {
		// 	readUntil: "eof"
		// })
	
	const contents = schema.parse(await file.read(await file.size()))
	return await contents	
}

const loadPalFromIFF = async() => {
	
	//Not completed -- This seems to be a standard PAL (palette) file.. Perhaps find a parser
	
	const file = new BinaryFile(`./data/DREAMWEB.PAL`, "r", true)	
	await file.open()
	
	const schema = new Parser()
		.endianess("little")
		.array("main", {
			type: "uint8",
			length: 2000
		})
		
	const contents = schema.parse(await file.read(await file.size()))
	return await contents
	
}

const showPCX = async() => {
	//Not implimented at all. Filetypes starting with I are standard PCX files
}

//Just loads basic room info at present
const loadRoomData = async(filename: string) => {
	
	const file = new BinaryFile(`./data/DREAMWEB.${filename}`, "r", true)	
	await file.open()


	const ROOMPATHS_SIZE = 36 * 144
	const REEL_SIZE = 5
	
	const PATHDATA_NODE_STRUCT = Struct()
		.word8("x")
		.word8("y")
		.word8("x1")
		.word8("y1")
		.word8("x2")
		.word8("y2")
		.word8("on")
		.word8("dir")
	
	const PATHDATA_SEGMENT_STRUCT = Struct()
		.word8("b0")
		.word8("b1")
	
	const PATHDATA_STRUCT = Struct()
		.array("nodes", 12, PATHDATA_NODE_STRUCT)
		.array("segments", 24, PATHDATA_SEGMENT_STRUCT);
		
	const TextSegmentSchema = new Parser()
	
	const BackdropBlocksSchema = new Parser().array("data", { length: 256, type: "uint8" })
	
	const schema = new Parser()
		.endianess("little")
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
		
		//Requires moving to format: {_flag, _flagEx}
		.array("backdropFlags", {
			type: "uint8",
			lengthInBytes: 192
		})
		
		.array("backdropBlocks", {
			length: item => {
				console.log(">", (item.len[0] - 192) / 256)
				return (item.len[0] - 192) / 256
			},
			type: BackdropBlocksSchema // new Parser().array("data", { length: 16, type: "uint8" })
		})
		
		//Actually workspace() in c++
		.buffer("workspace", {
			length: item => item.len[1]
		})
		//sortOutMap() function omitted
		
		//Graphics segment
		// .buffer("setFrames", {
		// 	length: item => item.len[2],
		// 	//@ts-ignore
		// 	formatter: arr => {
				
		// 		const FRAME_STRUCT = Struct()
		// 			.word8("width")
		// 			.word8("height")
		// 			.word16Ule("ptr")
		// 			.word8("x")
		// 			.word8("y")
				
		// 		// const PATHDATA_SEGMENT_STRUCT = Struct()
		// 		// 	.word8("b0")
		// 		// 	.word8("b1")
				
		// 		const STRUCT = Struct()
		// 			.array("frames", 1000, FRAME_STRUCT)
		// 			//.array("data", 24, PATHDATA_SEGMENT_STRUCT);
		// 		STRUCT.setBuffer(arr)
				
		// 		return JSON.stringify(STRUCT.fields)
				
		// 		return arr
		// 	}
		// })
		
		.nest("setFrames", {
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
					length: item => item.len[2],
					type: "uint8"
				})
		})
		
		
		//This may be skipped under some circumstances :/
		.buffer("setDat", {
			length: item => item.len[3]
		})
		
		//TODO: Parse graphics
		.nest("reel1", {
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
						})/*.filter(item => {
							return item.width > 0 && item.height > 0
						})	*/			
					}
				})
				.array("data", {
					length: item => item.len[4],
					type: "uint8"
				})
		})
		
		// .buffer("reel1", {
		// 	length: item => item.len[4]
		// })
		.buffer("reel2", {
			length: item => item.len[5]
		})
		.buffer("reel3", {
			length: item => item.len[6]			
		})
		
		//Issue: See stubs.cpp : line 2046
		//May return pathdata or pathdata AND reelList -- Complicated, but can be done
		.buffer("pathData", {
			length: item => {
				return item.len[7] <= ROOMPATHS_SIZE
					? item.len[7] 
					: ROOMPATHS_SIZE
			},
			//@ts-ignore: Expects string or number - but we're returning an object without issue
			formatter: arr => {
				//console.log("/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/")
				
				//Add a structure to the binary buffer array
				PATHDATA_STRUCT.setBuffer(arr)
				
				//Just to make Typescript play nice
				const fields = PATHDATA_STRUCT.fields as any				
				
				const nodes = Object.entries(fields.nodes).map( node => {		
					return JSON.parse(JSON.stringify(node[1]))
				})
				
				const segments = Object.entries(fields.segments).map( segment => {		
					return JSON.parse(JSON.stringify(segment[1]))
				})
				
				return {
					nodes,
					segments
				}
			}
		})
		
		//This most likely needs a formatter: frame_lo, frame_hi, x, y, b4
		.buffer("reelList", {
			length: item => {				
				const reelLen = (item.len[7] - ROOMPATHS_SIZE) | 0
				const reelCount = ((reelLen + REEL_SIZE - 1) / REEL_SIZE) | 0
				return reelLen
			},
			formatter: arr => {
				
				const REELLIST_STRUCT = Struct()
					.word8("frame_lo")
					.word8("frame_hi")
					.word8("x")
					.word8("y")
					.word8("b4")
				REELLIST_STRUCT.setBuffer(arr)
				return JSON.parse(JSON.stringify(REELLIST_STRUCT.fields))				
			}
		})		
		
		.array("personFramesLE", {
			type: "uint8",
			length: 24
		})
		
		// -- VERIFIED DOWN TO HERE --
		
		//loadTextSegments - Text segments includes a header, followed by text -- Unsure of format yet
		.buffer("personText", {
			length: item => item.len[8] - 24,
			// formatter: arr => {
				
			// 	const headerSize = 2 * 1026
				
			// 	const STRUCT = Struct()
			// 		.array("offsetsLE", headerSize, "word8Sle")
					
			// 	STRUCT.setBuffer(arr)
			// 	console.log(JSON.parse(JSON.stringify(STRUCT.fields)))
				
			// 	console.log(arr)
			// 	return arr
			// }
			
			//},
			// formatter: arr => {
			// 	const headerSize = 2 * 1026
				
			// 	const STRUCT = Struct()
			// 		.array("offsetsLE", headerSize, "word8Sle")
			// 		//.array("frame_hi", (item.len[8] - 24) - headerSize, "word8Sle")
			// 	STRUCT.setBuffer(arr)
			// 	console.log(JSON.parse(JSON.stringify(STRUCT.fields)))
				
			// 	return arr
			// }
			
			// formatter: arr => {
				
			// 	const TEXTFILE_STRUCT = Struct()
			// 		.word16Sle("offsetsLE")
			// 		.word16Ube("size") //1026
			// 		.word16Sle("text") //""
			// 	TEXTFILE_STRUCT.setBuffer(arr)
			// 	return JSON.parse(JSON.stringify(TEXTFILE_STRUCT.fields))				
				
			// }
		})
		.buffer("setDesc", {
			length: item => item.len[9]
		})
		.buffer("blockDesc", {
			length: item => item.len[10]
		})
		.buffer("roomDesc", {
			length: item => item.len[11],
			// formatter: arr => {
			// 	return arr.toString("utf8") + "==="
			// }
		})
		
		//TODO: Parse graphics
		.buffer("freeFrames", {
			length: item => item.len[12]			
		})
		
		//This may be skipped under some circumstances :/
		.buffer("freeDat", {
			length: item => item.len[13]
		})
		
		.buffer("freeDesc", {
			length: item => item.len[14]
		})
		
		//Assume this should be empty
		.buffer("extra", {
			readUntil: "eof"
		})
		
		
		
		// //Graphics file frame size
		// .array("frames", {
		// 	type: "uint8",
		// 	lengthInBytes: 347
		// })
		// //Graphics data
		// .buffer("data", {
		// 	readUntil: "eof"
		// })
	
	const contents = schema.parse(await file.read(await file.size()))
	return await contents	
	
	//sortOutMap??
		
}

function exportRoomTiles(name: string, blocks: [{data: []}]){
	
	//console.log(blocks)
	
	//Extract to individual bmps
	// blocks.forEach( (block, idx1) => {
		
	// 	new Jimp(16, 16, (err, image) => {
			
	// 		block.data.forEach( (element: number, idx2) => {
				
	// 			const colour = palette[element]
	// 				.map( col => {
	// 					if(col == 0) return col
	// 					col = col + (col/2) + (col/4)
	// 					if(col > 255) col = 255
	// 					return col
	// 				})
				
					
	// 					image.setPixelColor(Jimp.rgbaToInt(
	// 						colour[0],	//	 * 256 | 0, 
	// 						colour[1], //	* 256 | 0, 
	// 						colour[2],	//	 * 256 | 0, 
	// 						255), 
	// 					(idx2 % 16), 			//X
	// 					(idx2/16 | 0) //+ (idx1) //+ ((idx1/16 | 0)*16)		//Y
	// 					)

				
	// 		})
			
	// 		image.write(`test-${idx1}.bmp`);
	// 		console.log("DONE")
			
	// 	});
	// })
	
	function round(num: number, pre = 0) {
		var pow = Math.pow(10,pre);
		return Math.round(num*pow)/pow;
	}
	
	console.log(blocks.length)
	
	new Jimp(256, (Math.ceil(blocks.length / 16) * 16), (err, image) => {
		// this image is 256 x 256, every pixel is set to 0x00000000
		
		blocks.forEach( (block, idx1) => {
			block.data.forEach( (element: number, idx2) => {
				
				const colour = palette[element]
					.map( col => {
						if(col == 0) return col
						col = col + (col/2) + (col/4)
						if(col > 255) col = 255
						return col
					})
				
				image.setPixelColor(Jimp.rgbaToInt(
					colour[0],	//	 * 256 | 0, 
					colour[1], //	* 256 | 0, 
					colour[2],	//	 * 256 | 0, 
					255), 
				(idx2 % 16) + ((idx1 % 16) * 16), 			//X
				(idx2/16 | 0) + ((idx1/16 |0) * 16) //+ (idx1) //+ ((idx1/16 | 0)*16)		//Y
				)
				
				
				
			})
		})
		
		//@ts-ignore: Inputted file names should ALWAYS be in format Rxx
		const filename = parseInt(name.match(/\d+/)[0], 10)
		
		image.write(`./assets/rooms/backdrop/${filename}.png`);
		console.log("DONE")
		
	});
	
}

const showFrame = (gfx: any, x: number, y: number, frame: number, effect: number) => {
	
	const frameData = gfx.frames[frame]
	console.log(frameData)
		
	const width = frameData.width
	const height = frameData.height
	
	//const kScreenwidth = 320
	//const stride = kScreenwidth - width
	
	let data = gfx.data
	
	//console.log(width, height)
	//console.log(`Frames: ${gfx.data.length / (width*height)}`)
	
	data.splice(0, frameData.ptr)
	
	new Jimp(width, height, (err, image) => {
		
		for(let j=0; j<height; ++j){
			for(let i=0; i< width; ++i){
				
				const pixel = data[j*width + i]
				if(pixel){
					const colour = palette[pixel] // gfx.data[j*width + i]
					.map( col => {
						if(col == 0) return col
						col = col + (col/2) + (col/4)
						if(col > 255) col = 255
						return col
					})
					//console.log(colour)
					
					image.setPixelColor(Jimp.rgbaToInt(
						colour[0],	//	 * 256 | 0, 
						colour[1], //	* 256 | 0, 
						colour[2],	//	 * 256 | 0, 
						255
						), 
					i, //X
					j //Y
					)
				}
				
			}
		}
		
		// gfx.data.forEach((element, idx) => {
			
		// 	const colour = palette[element]
		// 		.map( col => {
		// 			if(col == 0) return col
		// 			col = col + (col/2) + (col/4)
		// 			if(col > 255) col = 255
		// 			return col
		// 		})
				
		// 		image.setPixelColor(Jimp.rgbaToInt(
		// 			colour[0],	//	 * 256 | 0, 
		// 			colour[1], //	* 256 | 0, 
		// 			colour[2],	//	 * 256 | 0, 
		// 			255), 
		// 		(idx % width), //X
		// 		(idx/width | 0)//Y
		// 		)
			
		// })
		
		image.write(`./test.png`);
		console.log("DONE")
		
		
		// blocks.forEach( (block, idx1) => {
		// 	block.data.forEach( (element: number, idx2) => {
				
		// 		const colour = palette[element]
		// 			.map( col => {
		// 				if(col == 0) return col
		// 				col = col + (col/2) + (col/4)
		// 				if(col > 255) col = 255
		// 				return col
		// 			})
				
		// 		image.setPixelColor(Jimp.rgbaToInt(
		// 			colour[0],	//	 * 256 | 0, 
		// 			colour[1], //	* 256 | 0, 
		// 			colour[2],	//	 * 256 | 0, 
		// 			255), 
		// 		(idx2 % 16) + ((idx1 % 16) * 16), 			//X
		// 		(idx2/16 | 0) + ((idx1/16 |0) * 16) //+ (idx1) //+ ((idx1/16 | 0)*16)		//Y
		// 		)
				
				
				
		// 	})
		// })
		
		// //@ts-ignore: Inputted file names should ALWAYS be in format Rxx
		// const filename = parseInt(name.match(/\d+/)[0], 10)
		
		// image.write(`./assets/rooms/backdrop/${filename}.png`);
		// console.log("DONE")
		
	});
	
}

const extractAllGfxFromFile = async(fileName: string) => {
	
	const file = await loadGraphicsFile(fileName)
	for(let i=0; i<file.frames.length; i++){
		saveFrame(file, i, `./assets/gfx/${fileName}`)
	}
	
}

const saveFrame = (gfx: any, frame: number, folderName: string) => {
	
	const frameData = gfx.frames[frame]
	console.log(frameData)
		
	const width = frameData.width
	const height = frameData.height
	
	let data = _.slice(gfx.data, frameData.ptr)

	
	//data = data.splice(0, frameData.ptr)
	
	new Jimp(width, height, (err, image) => {
		
		if(err) console.error("AN ERROR OCCURED: ", err)
		
		for(let j=0; j<height; ++j){
			for(let i=0; i< width; ++i){
				
				const pixel = data[j*width + i]
				if(pixel){
					const colour = palette[pixel] // gfx.data[j*width + i]
					.map( col => {
						if(col == 0) return col
						col = col + (col/2) + (col/4)
						if(col > 255) col = 255
						return col
					})
					//console.log(colour)
					
					image.setPixelColor(Jimp.rgbaToInt(
						colour[0],	//	 * 256 | 0, 
						colour[1], //	* 256 | 0, 
						colour[2],	//	 * 256 | 0, 
						255
						), 
					i, //X
					j //Y
					)
				}
				
			}
		}
		
		image.write(`${folderName}/${frame}.png`);
		console.log(`${folderName}/${frame}.png exported`)
	
	});
	
}


const extractGfxFromRoom = async(fileName: string, data: any) => {
	for(let i=0; i<data.setFrames.frames.length; i++){
		saveFrame(data.setFrames, i, `./assets/rooms/frames/${fileName}`)
	}
	for(let i=0; i<data.reel1.frames.length; i++){
		saveFrame(data.reel1, i, `./assets/rooms/reel1/${fileName}`)
	}	
}



const run = async() => {
	
	console.clear()
	
	// const charset1 = await loadGraphicsFile("C00")
	// console.log("=== charset1 ===")
	// console.log(charset1)
	// const pic = showFrame(charset1, 0, 21, 91*3 + 10, 0)
	
	// const icons1 = await loadGraphicsFile("G00")
	// console.log("=== icons1 ===")
	// console.log(icons1.frames)
	// showFrame(icons1, 0, 0, 1, 0)
	
	//fs.writeFileSync("./icons1.txt", icons1.data.toString())
	//showFrame(icons1, 0, 114, 1, 0)
	
	// const icons2 = await loadGraphicsFile("G01")
	// console.log("=== icons2 ===")
	// console.log(icons2)
	
	// const mainSprites = await loadGraphicsFile("S00")
	// console.log("=== mainSprites ===")
	// console.log(mainSprites)
	
	// showFrame(_cityGraphics, 57, 32, 0, 0);
	// showFrame(_cityGraphics, 120+57, 32, 1, 0);
	// const cityGraphics = await loadGraphicsFile("G04")
	// console.log("=== cityGraphics ===")
	// console.log(cityGraphics)
	
	//const pic = showFrame(cityGraphics, 57, 32, 0, 0)
	//const pic = showFrame(cityGraphics, 120+57, 32, 1, 0)
	
	// const puzzleText = await loadTextFile("T80")
	// console.log("=== puzzleText ===")
	// console.log(puzzleText)
	
	// const commandText = await loadTextFile("T84")
	// console.log("=== commandText ===")
	// console.log(commandText)
	
	// const sounds = await loadSounds("V99")
	// console.log("=== sounds ===")
	// console.log(sounds)
	
	// const palette = await loadPalFromIFF()
	// console.log("=== palette ===")
	// console.log(palette)
	
	// const tempText = await loadTextFile("T82")
	// console.log("=== tempText ===")
	// console.log(tempText)
	
	//newLocation = 50
	//introCount = 0
	//vars.location = 255
	
	
	//loadRoomData -- TODO: Error on R21
	const roomToLoad = "R50"
	const room = await loadRoomData(roomToLoad)
	console.log("=== room ===")
	console.log(room.setFrames.frames)
	
	
	// const folderGfx = await loadGraphicsFile("S02")
	// console.log("=== folderGfx ===")
	// console.log(folderGfx)
	// showFrame(folderGfx, 120, 60, 1, 0)
	
	// showFrame(_icons1, 0, 0, 0, 0);
	// showFrame(_icons1, 0, 114, 1, 0);
	
	
	
	//Extract all assets from graphics files
	//const fileName = "S02"	
	//extractAllGfxFromFile(fileName)
	
	//R21 error
	// const roomToLoad = "R01"
	// const room = await loadRoomData(roomToLoad)
	// extractGfxFromRoom(roomToLoad, room)
	// //console.log("=== room ===")
	// console.log(room)
	
	
	
}
run()




// =======================================================================================================================

