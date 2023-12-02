import BinaryFile from "binary-file";
import { Parser } from "binary-parser";
import Jimp from "jimp";
import Struct from "struct";
import palette from "./palette";
import {
    extractAdditionalRoomData, extractGraphicsSegment, extractTextSegment, extractWorkspace, getGraphicsSegment, getTextSegment
} from "./segments";
import { ROOMPATHS_SIZE } from "./settings";
import { dumpData, ensurePath } from "./utils";


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
		
		.array("setDat", {
			lengthInBytes: item => item.len[3] ,
			type: new Parser()
				.uint8("b0")
				.uint8("b1")
				.uint8("b2")
				.uint8("slotSize")
				.uint8("slotCount")
				.uint8("priority")
				.uint8("b6")
				.uint8("delay")
				.uint8("type")
				.uint8("b9")
				.uint8("b10")
				.uint8("b11")
				.array("objId", {
					type: "uint8",
					length: 4
				})
				.uint8("b16")
				.uint8("index")
				.array("frames", {
					type: "uint8",
					length: 40
				})
				.array("mapad", {
					type: "uint8",
					length: 5
				})
				// .array("mapad", {
				// 	type: "uint8",
				// 	lengthInBytes: 5,
				// 	formatter: (arr) => {
						
				// 		let x = 0
				// 		let y = 0
						
				// 		let mapX = 22 //Get this from somewehere else?
						
				// 		//Get X coords
				// 		if(arr[0] != 0){
				// 			x = 0
				// 		} else if (arr[1] < mapX){
				// 			x = 0
				// 		} else {
				// 			let v1 = arr[1] - mapX
				// 			if(v1 >= 11) {
				// 				x = 0
				// 			} else {
				// 				x = (v1 << 4) | arr[2]
				// 			}
				// 		}
						
				// 		let mapY = 0 //Get this from somewehere else?
						
				// 		//get Y coords
				// 		if(arr[0] < mapY){
				// 			y = 0
				// 		} else {
				// 			let v0 = arr[0] - mapY
				// 			if(v0 >= 10){
				// 				y = 0
				// 			} else {
				// 				y = (arr[3] << 4) || arr[4]
				// 			}
				// 		}
						
						
				// 		//@ts-ignore
				// 		//return { x, y }
				// 		return arr //.map(i => i + 50000)
				// 	}
				// })
				.uint8("b63")
				
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
		
		//Room21 fucks up at this point
		.buffer("reelList", {
			length: item => {
				if(item.len[7] <= ROOMPATHS_SIZE) return 0

				const reelLen = item.len[7] - ROOMPATHS_SIZE
				const reelCount = (reelLen + 4) / 5
				
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
		
		.buffer("freeDat", {
			//length: 79, // item => item.len[13]
			length: item => item.len[13],
			type: "uint8" //DynamicObjectStructure
		})
		
		.nest("freeDesc", getTextSegment(14))

	
	const contents = schema.parse(await file.read(await file.size()))
	return await contents

}


const extractBackdropBlocks = async(name: string, blocks: any) => {
	
	return new Promise((resolve, reject) => {
		
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
			resolve(true)	
		})
	})

	
}


const extractRoom = async (name: string, room: any) => {
	
	ensurePath(`./assets/rooms/${name}`)
	dumpData(JSON.stringify(room, null, 4), `./assets/rooms/${name}/debug.json`)
	
	console.log(`=== Extracting room: ${name} ===`)
	
	
	await extractBackdropBlocks(name, room.backdropBlocks)
	await extractGraphicsSegment(name, "frames", room.setFrames)
	await extractGraphicsSegment(name, "reel1", room.reel1)
	await extractGraphicsSegment(name, "reel2", room.reel2)
	await extractGraphicsSegment(name, "reel3", room.reel3)
	await extractGraphicsSegment(name, "freeFrames", room.freeFrames)

	await extractTextSegment(name, "personText", room.personText)
	await extractTextSegment(name, "setDesc", room.setDesc)
	await extractTextSegment(name, "blockDesc", room.blockDesc)
	await extractTextSegment(name, "roomDesc", room.roomDesc)
	await extractTextSegment(name, "freeDesc", room.freeDesc)
	
	await extractWorkspace(name, room.workspace, room.backdropFlags)	
	await extractAdditionalRoomData(name, room)
	
	console.log("DONE")
	
}

export const extractRooms = async() => {
	// "R21" ommitted - Currently produces an error
	//const rooms = ["R00", "R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09", "R10", "R11", "R12", "R13", "R14", "R19", "R20", "R22", "R23", "R24", "R25", "R26", "R27", "R28", "R29", "R45", "R46", "R47", "R50", "R52", "R53", "R54", "R55"]
	
    const rooms = ["R24"]

	for(const room in rooms){
		const roomToLoad = rooms[room]
		const roomData = await readRoomData(roomToLoad)
		await extractRoom(roomToLoad, roomData)
	}
}

