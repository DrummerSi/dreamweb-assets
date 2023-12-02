import { extractGfx } from "./graphics";
import { extractRooms } from "./rooms";
import { extractSfx } from "./sounds";
import { extractText } from "./text";


const extrator = async() => {
	
	await extractRooms()
	//await extractText()	
	//await extractGfx()
	//await extractSfx()
	
	console.log(" ===== ALL OPERATIONS COMPLETE  ===== ")
	
}
extrator()








