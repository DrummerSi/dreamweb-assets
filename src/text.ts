import fs from 'fs';
import BinaryFile from "binary-file"
import { Parser } from "binary-parser"


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


export const extractText = async() => {
	const texts = ["T01", "T02", "T10", "T11", "T12", "T13", "T20", "T21", "T22", "T23", "T24", "T50", "T51", "T80", "T81", "T82", "T83", "T84"]
	for(const text in texts){
		const textData = await readTextData(texts[text])
		await extractTextFile(texts[text], textData.text)
	}
	console.log("Text extracted")
}