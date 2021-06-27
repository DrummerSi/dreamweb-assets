

export default class Room {
	
	name: string
	roomsSample: number
	b14: number
	mapX: number
	mapY: number
	b17: number
	b18: number
	b19: number
	liftFlag: number
	b21: number
	facing: number
	countToOpen: number
	liftPath: number
	doorPath: number
	b26: number	
	b27: number
	b28: number
	b29: number
	b30: number
	realLocation: number
	
	constructor(data: (string | number)[]){
		this.name = data[0] as string
		this.roomsSample = data[1] as number
		this.b14 = data[2] as  number
		this.mapX = data[3] as  number
		this.mapY = data[4] as  number
		this.b17 = data[5] as  number
		this.b18 = data[6] as  number
		this.b19 = data[7] as  number
		this.liftFlag = data[8] as  number
		this.b21 = data[9] as  number
		this.facing = data[10] as  number
		this.countToOpen = data[11] as  number
		this.liftPath = data[12] as  number
		this.doorPath = data[13] as  number
		this.b26 = data[14] as  number	
		this.b27 = data[15] as  number
		this.b28 = data[16] as  number
		this.b29 = data[17] as  number
		this.b30 = data[18] as  number
		this.realLocation = data[19] as  number
		
		/*
		_vars._combatCount = 0;
		_roomsSample = room.roomsSample;
		_mapX = room.mapX;
		_mapY = room.mapY;
		_vars._liftFlag = room.liftFlag;
		_mansPath = room.b21;
		_destination = room.b21;
		_finalDest = room.b21;
		_facing = room.facing;
		_turnToFace = room.facing;
		_vars._countToOpen = room.countToOpen;
		_vars._liftPath = room.liftPath;
		_vars._doorPath = room.doorPath;
		_vars._lastWeapon = (uint8)-1;
		_realLocation = room.realLocation;
		
		*/
		
	}
	
	findRoomInLoc() {
		const x = this.mapX / 11
		const y = this.mapY / 10
		return y * 6 + x
	}
	
	drawFlags() {
		const kMapWidth = 66
		const mapoffset = this.mapY * kMapWidth + this.mapX
	}
	
	//findXYFromPath
	
	
}