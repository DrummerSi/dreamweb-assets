import { extractRooms } from "./rooms"
import { extractText } from "./text"
import { extractGfx } from "./graphics"
import { extractSfx } from "./sounds"



const extrator = async() => {
	
	//await extractRooms()
	//await extractText()	
	await extractGfx()
	//await extractSfx()
	
	console.log(" ===== ALL OPERATIONS COMPLETE  ===== ")
	
}
extrator()








