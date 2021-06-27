import { fs } from 'fs';
import BinaryFile from "binary-file"
import { Parser } from "binary-parser"
import wavefile, { WaveFile } from "wavefile"


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





export const extractSfx = () => {
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