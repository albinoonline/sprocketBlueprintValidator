/*
ToDo:
DONT FORGET WEIGHT
CHECK IF THE INTERNAL SPACE IS EXEEDED?
This release:
*/
window.onload = function() {
	
	//define things
	//find things on the page
	const Bpinput = document.getElementById('bp');//bp input
	const error = document.getElementById('error');//top banner for use with errors
	const errorbttn = document.getElementById('errorbttn');//top banner for use with errors
	const dropdowns = document.getElementsByClassName("dropdown");//dropdowns
	const miscData = document.getElementById("data");//second output
	
	const outputDiv = document.getElementById('output');//output div

	var blueprint = {};//for storing the BP
	var errors = [[],[]];//array for storing errors
	
	//add event listeners
		//clear errros bttn
	errorbttn.addEventListener("click", function(){
		//reset errors 
		errors = [[],[]];
		//clear error
		error.innerHTML="";
	});

	Bpinput.addEventListener("change", function(){BPfill(BPparse());});//the file input for bp
	
	//dropdowns
	for (let i of dropdowns){
		i.addEventListener("click", function(){dropdown(i);});
	}
		
	///functions
	function errorLog(text){
		//0 contains the error, and 1 contains the count
		//see if error has previusly existed
		let index =errors[0].indexOf(text);
		if( index ==-1){
			//set index to what it will be
			index = errors[0].length;
			//it does not, add it
			errors[0].push(text);
			errors[1].push(0);
		}
		//add to the error count 
		errors[1][index]++
		//redisplay the list of errors
		error.innerHTML="";
		for(let i =0; i<errors[0].length;i++){
			error.innerHTML+=`<p class="small">[${errors[1][i]}]${errors[0][i]}</p>`;
		}
	}
	
	function dropdown(Htag){//operates the dropdowns
		///this is jank and needs to be redone
		//from the Htag we need to go to parent, then to the first div child, wich should be the 2nd child
		let div = Htag.parentElement.children[1];
		// now er need to know whether to expand or reduce the child
		if(Htag.innerHTML.endsWith("▼")){
			//switch symbol
			Htag.innerHTML = Htag.innerHTML.replace("▼","▲");
			//set display
			div.style.display = "block";
		} else {
			//switch symbol
			Htag.innerHTML = Htag.innerHTML.replace("▲","▼");
			//set display
			div.style.display = "none";
		}
	}
	
	function normal_vec(p1, p2, p3){//find the normal vector of a plane @author: comyk
		//direction vectors
		let dv13 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
		let dv12 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
		//calculating normal vector
		let nv_x = dv13[1]*dv12[2] - dv13[2]*dv12[1];
		let nv_y = dv13[2]*dv12[0] - dv13[0]*dv12[2];
		let nv_z = dv13[0]*dv12[1] - dv13[1]*dv12[0];
    
		let nv = [nv_x, nv_y, nv_z];
    //verify
		if ((dv13[0]*nv[0] + dv13[1]*nv[1] + dv13[2]*nv[2] !=0) || (0!= dv12[0]*nv[0] + dv12[1]*nv[1] + dv12[2]*nv[2])){
			//one is not zero
			///window.alert("comyk you have failed me");
		}
		return nv;
	}
	function slopeOfNormal(nv){//this will give x y and z angles to the normal
		let mag=  Math.sqrt((nv[0]**2) + (nv[1]**2) + (nv[2]**2));//magnitude of the vector
		let angles=[];//array to hold the angles
		//first x
		angles.push(Math.acos(nv[0] /mag)-(Math.PI/2));
		//then y
		angles.push(Math.acos(nv[1] /mag)-(Math.PI/2));
		//then z
		angles.push(Math.acos(nv[2] /mag)-(Math.PI/2));
		return angles;
	}
	///testing
	// let v1 = [1, 1, 1]
	// let v2 = [2, 2, 2]
	// let v3 = [3, 3, 35]
	// console.log(slopeOfNormal(normal_vec(v1, v2, v3)));
	
	
	async function BPparse(){//this function turns the uploaded file into usable data and shoves in blueprint
		let file = Bpinput.files[0];
		let text = await file.text();
		let data = JSON.parse(text);
		blueprint = data;
		return data;
	}
		
	async function BPfill(lag){//extracts and saves data on the tank
		//So im not actually editing anything here, witch means i don't have to worry about keeping the result machine readable, since i'm not repackaging it.
		// wait for data
		let data= await lag;
		//dump BP into the log
		console.log(data);
		
		//set storage values
		let fuel = [0,0];//[internal,external]
		let widthHullAndTrack = 0;//width of vehicle by separation +2x track
		let widthHull = 0;//width of 2 farthest verteces
		let farthestForward = 10; //this and below are markers for the farthest out the hull or track go
		let farthestBackward = -10;
		let farthestUpward = -10;
		let farthestSide1 = 10;
		let farthestSide2 = -10;
		let engine="";//a written name of the engine
		let transmission = "";//a written name of the engine
		let hullArmor = {min:5000,xN:5000,xP:5000,yN:5000,yP:5000,zN:5000,zP:5000};//save effective armor
		let turretArmor = {min:5000,xN:5000,xP:5000,yN:5000,yP:5000,zN:5000,zP:5000};//save effective armor
		//gimmies, these values are stored simply and dont need to be located
		let weight =data.fullMass/1000;
		let name = data.name;
		
		//acumulators, becouse who knows how many there are
		let cannons = {};//"(Caliber)X(caselength)BL(gun tub length)":count
		let parts ={};//partName:count.
		let ammo = {};//(Cal)X(caselength):count
		let crew = {"all":0};//role:alloted space total
		let aim = [];//X:[Left,Right,Down]
		
		// go through 'ext' the list of things placed on the compartments, like hatches and other bobbles, including gun mounts, but not the info on the guns
		for (let i in data.ext) {
			// unfortunately diferent objects can have multiple things in them, so we loop DAT next
			for (let j in data.ext[i].DAT) {
				//see if the object is a "fuelTank"
				if (data.ext[i].DAT[j].id =="fuelTank") {
					//is fuel tank, base size is 45L, the scalers are T 6, 7, and 8
					fuel[1] += 45*data.ext[i].T[6]*data.ext[i].T[7]*data.ext[i].T[8];
				}
				//add to the parts object
				if (typeof parts[data.ext[i].DAT[j].id] == "undefined") {
					//new part
					parts[data.ext[i].DAT[j].id]=1;
				} else {
					//old part
					parts[data.ext[i].DAT[j].id] +=1;
				}
			}//added to lists end DAT loop
		}//end ext loop
		//log accumulators:
		console.log(parts);
		console.log("External Fuel:"+fuel[1]);
		
		//now onto the blueprints section!
		//loop blueprint
		for (let i in data.blueprints) {
			let parsedData=JSON.parse(data.blueprints[i].data);
			//different logic for different types
			switch (data.blueprints[i].id) {
				case "Compartment"://the bits of hull, turret ect
				{///blocking for potential future non free-form detection, if looking for points fails
					//save armor values
					armor = {min:5000,xN:5000,xP:5000,yN:5000,yP:5000,zN:5000,zP:5000};
					//are we a turret?
					let isTurret=parsedData.turret !=null;
					let points =parsedData.compartment.points;//quick access to points
					//turret ring armor
					if (isTurret){
						//we have a turret
						//set the font back and side values to the turret ring armor
						armor.zP=armor.zN=armor.xP=armor.xN=parsedData.turret.ringArmour;
					}
					//go through faceMap, they are indexed by face
					for (let j in parsedData.compartment.faceMap){
						let face = parsedData.compartment.faceMap[j];//indexed points of the face
						let vertecies=[];//temporaraly store verticies
						let thick =[];//thickness points involved
						//next we need real points, not indexes
						for (let e in face){
							//add thickness
							thick.push(parsedData.compartment.thicknessMap[face[e]]);
							//get locations
							vertecies[e]=points.slice(face[e]*3,face[e]*3+3);
						}
						//get minimum thickness off all points (yes points hold thickness)
						thick = Math.min(...thick);
						//angles of the armor in x y and z planes, negative being the inverse
						let angles = slopeOfNormal(normal_vec(...(vertecies.slice(0,3))));//slicing off moint over 3, minor issue for torqued plates im ignoring
						
						//is the armor thinner than older faces?
						armor.min = Math.min(armor.min, thick);
						//next, the x value, is is negative?
						if (angles[0] <0){
							//yes 
							//is the effective armor thinner than ones pointing that way?
							armor.xN=Math.min(armor.xN,Math.abs(thick/Math.sin(angles[0])));
						} else {
							//no
							//is the effective armor thinner than ones pointing that way?
							armor.xP=Math.min(armor.xP,thick/Math.sin(angles[0]));
						}
						//next, the y value, is is negative?
						if (angles[1] <0){
							//yes 
							//is the effective armor thinner than ones pointing that way?
							armor.yN=Math.min(armor.yN,Math.abs(thick/Math.sin(angles[1])));
						} else {
							//no
							//is the effective armor thinner than ones pointing that way?
							armor.yP=Math.min(armor.yP,thick/Math.sin(angles[1]));
						}
						//next, the z value, is is negative?
						if (angles[2] <0){
							//yes 
							//is the effective armor thinner than ones pointing that way?
							armor.zN=Math.min(armor.zN,Math.abs(thick/Math.sin(angles[2])));
						} else {
							//no
							//is the effective armor thinner than ones pointing that way?
							armor.zP=Math.min(armor.zP,thick/Math.sin(angles[2]));
						}
					}
					//add to hull or turret accumulator:
					if (isTurret){
						console.log(parsedData);
						//add to turret armor, have to check lowest in case of multiple turrets
						for(let j in turretArmor){
							turretArmor[j]=Math.min(turretArmor[j], armor[j]);
						}
						//try for a height measure
						for (let j in points){
							if(j%3==1){//sorts the height values only
								farthestUpward = Math.max(farthestUpward, parseFloat(parsedData.pos[1]+points[j]));
							}
						}//end point loop
					} else {
						//add to hull armor
						hullArmor =armor;
						//find farthest point forward backward and upward for size calculations
						//clump points into x y z
						
						for (let j in points){
							/*
							%3=0=side
							%3=1=top
							%3=2=front
							*/
							switch(j%3){
								case 0://side	
									farthestSide1 = Math.min(farthestSide1, points[j]);//side negative
									farthestSide2 = Math.max(farthestSide2, points[j]);
								break;
								case 1://top/bottom
									farthestUpward = Math.max(farthestUpward, points[j]);
								break;
								case 2://front back
									//i have no idea which end is front
									farthestForward = Math.min(farthestForward, points[j]);
									farthestBackward = Math.max(farthestBackward, points[j]);
							}//end switch
						}//end point loop
					}//end hull/armor split
					///Display note: armor appears to be appears to be x=side y=top z=front
					///armor object format {min:0,xN:0,xP:0,yN:0,yP:0,zN:0,zP:0}
					
				}
				break;
				case "SS"://i dunno what this is, if its ever not these i want to know.
					if (data.blueprints[i].data !='{"version":{"Major":0,"Minor":0},"name":"Untitled"}' && data.blueprints[i].data !='{"version":{"Major":0,"Minor":0},"name":""}') {
						errorLog("Give albino "+data.name+" for study please, it contains whatever blueprints.SS is (don't worry the tool is fine)");
					}
				break;
				case "TRK"://Track! we need to check length and width
					widthHullAndTrack = parsedData.separation+2*parsedData.belt.x;
					errorLog("Track Width:"+widthHullAndTrack);///throw an "error" for now
					///update farthest forward/backward
				break;
				case "ENG"://engine is easy, displacment+count
					engine = parsedData.cylinderDisplacement*parsedData.cylinders+"L V"+parsedData.cylinders;
					errorLog("Engine:"+engine);///throw an "error" for now
				break;
				case "TSN"://tranny, just a gear count
					transmission=(parsedData.d.length+parsedData.r.length)+" Speed transmission ("+parsedData.d.length+"+"+parsedData.r.length+")";
					errorLog("Transmission:"+transmission);///throw an "error" for now
				break;
				case "FLT"://Fuel
					//update fuel
					fuel[0]=parsedData.L;
					errorLog(fuel[0]+fuel[1]+" liters of fuel, "+fuel[0]+" of which is internal.");///throw an "error" for now
				break;
				case "PTJ"://paintjob, why not
					if (parsedData.colourMap == null) {
						errorLog(data.name+" is unpainted, shame them");
					}
				break;
				case "CNN"://what guns are installed?
					//loop through all cannons
					for (let j in parsedData.instances) {
						let gun = parsedData.blueprints[parsedData.instances[j].blueprint];//way to long to type
						let barrel = 0;// the length of the barrel of the gun
						//add all lengths
						gun.segments.forEach(e => barrel+=e.len);
						//get the name of the gun
						let gunName =gun.caliber+"X"+gun.breechLength+"mmNL"+(barrel*1000);
						//add to the cannons object
						if (typeof cannons[gunName] == "undefined") {
							//new part
							cannons[gunName]=1;
						} else {
							//old part
							cannons[gunName] +=1;
						}
					}
				break;
				case "AMO"://what racks are here
					//loop through all ammos
					for (let j in parsedData.racks) {
						//get the ammo size
						let ammoName =parsedData.racks[j].diameter+"X"+parsedData.racks[j].length+"mm";
						//add to the cannons object
						if (typeof ammo[ammoName] == "undefined") {
							//new part
							ammo[ammoName]=parsedData.racks[j].capacity;
						} else {
							//old part
							ammo[ammoName] +=parsedData.racks[j].capacity;
						}
					}
				break;
				case "GMT":///this is gunmount, list each cannon and its aim limits
					//loop through all cannons
					for (let j in parsedData) {
						let gun = parsedData[j].Blueprint;//way to long to type
						aim.push({left:gun.LeftAzi,right:gun.RightAzi,down:gun.MinDepression});
					}
				break;
				case "CRW"://crew!
				//for each crew
					for (let j in parsedData.seats){
						let roleCount=parsedData.seats[j].roles.length;
						// do they have a role
						if (roleCount ==0){
							//no, add passenger
							if (typeof crew["passenger"] == "undefined") {
								//new crew
								crew["passenger"]=parsedData.seats[j].spaceAlloc;
							} else {
								//old rew
								crew["passenger"]+=parsedData.seats[j].spaceAlloc;
							}
						} else {
							//yes, for each role they have
							for (let k in parsedData.seats[j].roles) {
								//add volume proportional to the roles the cre member has
								if (typeof crew[parsedData.seats[j].roles[k]] == "undefined") {
									//new crew
									crew[parsedData.seats[j].roles[k]]=parsedData.seats[j].spaceAlloc/roleCount;
								} else {
									//old rew
									crew[parsedData.seats[j].roles[k]]+=parsedData.seats[j].spaceAlloc/roleCount;
								}
							}
						}
						//add to total crew volume
						crew["all"]+=parsedData.seats[j].spaceAlloc;
					}
				break;
				case "FDR":///what?
					//console.log("'FDR':");
					//console.log(parsedData);
				break;
				default:
				errorLog("DA FUQ IS A " + data.blueprints[i].id+"?");
			}//end switch
		}//end blueprints loop
		
		//log shit
		console.log("farthestSide1: "+farthestSide1);
		console.log("farthestSide2: "+farthestSide2);
		console.log("farthestUpward: "+farthestUpward);
		console.log("farthestForward: "+farthestForward);
		console.log("farthestBackward: "+farthestBackward);
		
		
		///Display note: armor appears to be appears to be x=side y=top z=front
		///armor object format {min:0,xN:0,xP:0,yN:0,yP:0,zN:0,zP:0}
		console.log("temp display");
		console.log(hullArmor);
		///temporary display:
		//hullArmor = {min:5000,xN:5000,xP:5000,yN:5000,yP:5000,zN:5000,zP:5000};//save effective armor
		//turretArmor = {min:5000,xN:5000,xP:5000,yN:5000,yP:5000,zN:5000,zP:5000};//save effective armor
		miscData.innerHTML=`Hull Armor: <br/>
		Abs:${hullArmor.min}<br/>
		Front:${hullArmor.zP}<br/>
		Rear:${hullArmor.zN}<br/>
		Side:${hullArmor.xP}/${hullArmor.xN}<br/>
		Top:${hullArmor.yP}<br/>
		Bottom:${hullArmor.yN}<br/>`;
		
		miscData.innerHTML+=`Turret Armor: <br/>
		Abs:${turretArmor.min}<br/>
		Front:${turretArmor.zP}<br/>
		Rear:${turretArmor.zN}<br/>
		Side:${turretArmor.xP}/${hullArmor.xN}<br/>
		Top:${turretArmor.yP}<br/>
		Bottom:${turretArmor.yN}`;
		
		return; //why not i guess
	}
	
};
