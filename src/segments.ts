import BinaryFile from "binary-file";
import { Parser } from "binary-parser";
import cliProgress from "cli-progress";
import fs from "fs";
import Jimp from "jimp";
import _ from "lodash";
import Struct from "struct";
import { workspaceArr } from "./data";
import { kFrameBlocksize } from "./settings";
import { getColour } from "./utils";


export const getGraphicsSegment = (no: number) => {
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
					})/*.filter(item => {
						return item.width > 0 && item.height > 0
					})*/
				}
			})
			.array("data", {
				length: item => item.len[no] - kFrameBlocksize,
				type: "uint8"
			})				
	}
}

export const getTextSegment = (no: number) => {
    const sizes = {
        9: 130,     //setDesc
        10: 98,     //blockDesc
        11: 38,     //roomDesc
        14: 82      //freeDesc
    }
    const size = sizes[no]

	return {
		type: new Parser()
			.buffer("offsets", {
				length: size*2
			})
			.string("text", {
				length: item => item.len[no] - (size*2)
			})
	}
}

export const extractGraphicsSegment = async(name: string, type: string, blocks: any) => {
	
	console.log(`Trying to extract ${blocks.frames.length} frames from ${type}`)
	//const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
	//progress.start(blocks.frames.length, 0)
	
	//console.log(blocks)
	
	for(let i=0; i<blocks.frames.length; i++){
		await saveFrame(blocks, i, `./assets/rooms/${name}/${type}`)		
		//progress.update(i+1)
	}	
	
	//progress.stop()
}

export const extractTextSegment = async(name: string, type: string, blocks: any) => {
	// blockas has offsets and text
	//`${location}/${frame}.png`
	
	//console.log(blocks.offsets)
	
	const dir = `./assets/rooms/${name}/text`
	
	try {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir);
		//fs.writeFileSync(`${dir}/${type}.txt`, blocks.text)
        
        const b = Buffer.from(blocks.text)
        const txt = b.toString()
        const arr = txt.split("\0")
        //const out = arr.join("\n")

        let outData = {}
        for(let x = 0; x<arr.length; x++){
            const line = arr[x]
            if(line !== ""){
                outData[x] = line
            }
        }

        const out = JSON.stringify(outData, null, 4)

        fs.writeFileSync(`${dir}/${type}.txt`, out)
		
	} catch (err) {
		console.error(err)
	}
}

export const extractWorkspace = async(name: string, workspace: number[], backdropFlags: any[]) => {
	//const kMapHeight = 60
	const kMapWidth = 66
	
	const logger = fs.createWriteStream(`./assets/rooms/${name}/workspace.txt`)
	logger.write(workspaceArr.join(","))
	let outArr = _.clone(workspaceArr).map( (i, idx) => {
		if(idx < workspace.length) return workspace[idx] +1
		return i+1
	})	
	logger.end()
	
	//logger.write(outArr.join(","))	
	//workspace.splice(0, kMapWidth)	
	
	let mainArr: number[] = []
	while(outArr.length > 0){		
		const line = outArr.splice(0, kMapWidth)
		mainArr = [...mainArr, ...line]
		outArr.splice(0, kMapWidth)	
	}
	
	const typeArr = backdropFlags.map( (item, idx) => {
		return JSON.stringify({
			"id": idx,
			"type": `${item.flag},${item.flagEx}`
		})
	})
	
	
	
	//Generate template
	let template = fs.readFileSync("./data/template.json", "utf8")
	template = template.replace("##DATA##", mainArr.join(","))
	template = template.replace("##PATH##", `.\/back-tiles.png`)
	template = template.replace("##TILES##", typeArr.join(","))
	fs.writeFileSync(`.\/assets\/rooms\/${name}\/map.json`, template)

}

export const extractAdditionalRoomData = async(name: string, room: any) => {
	const data = {
		backdropFlags: room.backdropFlags,
		setDat: room.setDat,
		pathData: room.pathData,
		reelList: room.reelList,
		personFrames: room.personFrames
	}
	fs.writeFileSync(`.\/assets\/rooms\/${name}\/additional.json`, JSON.stringify(data, null, 4))
}



export const saveFrame = async(blocks: any, frame: number, location: string) => {
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