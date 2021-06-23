import { RoomData } from './data';
import Room from './Room';
// import * as fs from "fs"
// import BinaryFile from "binary-file"
// import {Parser} from "binary-parser"




const loadRoom = (roomNo: number) => {
	//loadIntroRoom > loadRoom > startLoading > loadRoomData
	const room = new Room(RoomData[roomNo])
}


const loadIntroRoom = () => {
	loadRoom(50)
}


const run = async() => {
	
	
	loadIntroRoom()
	
	
	
	//loadRoomData
	//const room = await loadRoomData("R50")
	
	
	// console.log("=== room ===")
	// console.log(room)
	
	// console.log(pcx.default)
	
	// const myPcx = new pcx.default(room.backdropBlocks)
	// const data = myPcx.decode()
	
	// console.log(data)
	
	
	//findRoomInLoc :: Finds room number from room info
	//deleteTaken :: Assume removes items from room that the player has already picked up
	//setAllChanges :: Unknown
	//autoAppear :: Seems to set/ remove objects for certain locations
	//findXYFromPath :: Maybe find paths through room?
	
	
	//switchRyanOn :: Inits player?
	//drawFlags :: ??
	
	
	
	//drawFloor
	
	
}
run()

// =======================================================================================================================

