/*
ToDo:
finish thinnest plate checker, add thickest plate checker?
add turret rings to canvas draw
This release:
rush job thinnest plate checker
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
	
	//canvases
	const frontViewCanvas = document.getElementById('frontView');
	const frontView = frontViewCanvas.getContext("2d");
	///canvas adjustments
	let canvasScale=90;
	let canvasXOffset=150;
	let canvasYOffset=250;
	
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
		//clear output
		miscData.innerHTML="";
		frontView.clearRect(0, 0, frontViewCanvas.width, frontViewCanvas.height);
		//get the json of the file
		let file = Bpinput.files[0];
		let text = await file.text();
		let data = JSON.parse(text);
		//update blueprint
		blueprint = data;
		//reset file input
		Bpinput.value="";
		return data;
	}
	function roundHundredth(num){
		return Math.round(num*100)/100;
	}
	
	///AI section
	function removeDuplicatePoints(points) {
		return points.filter((point, index) => {
			return index === points.findIndex(p => p[0] === point[0] && p[1] === point[1]);
		});
	}
	function orderClockwise(points) {
		// First, calculate the average position of all the points
		let xSum = 0;
		let ySum = 0;
		for (let point of points) {
			xSum += point[0];
			ySum += point[1];
		}
		const xAvg = xSum / points.length;
		const yAvg = ySum / points.length;

		// Next, sort the points based on their angle relative to the average position
		points.sort((a, b) => {
			const angleA = Math.atan2(a[1] - yAvg, a[0] - xAvg);
			const angleB = Math.atan2(b[1] - yAvg, b[0] - xAvg);
			return angleA - angleB;
		});

		// Finally, return the sorted array of points
		return points;
	}
	//end ai section
	
	
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
		
		//now onto the blueprints section!
		//loop blueprint
		for (let i in data.blueprints) {
			let parsedData=JSON.parse(data.blueprints[i].data);
			//different logic for different types
			switch (data.blueprints[i].id) {
				case "Compartment"://the bits of hull, turret ect
				if (parsedData.compartment != null){
					//we are freeform
					//save armor values
					armor = {min:5000,xN:5000,xP:5000,yN:5000,yP:5000,zN:5000,zP:5000};
					//weakest plate logs
					let weakestFront=[[0,0,0],[0,0,0],[0,0,0]];
					let weakestTop=[[0,0,0],[0,0,0],[0,0,0]];
					let weakestBack=[[0,0,0],[0,0,0],[0,0,0]];
					let weakestBottom=[[0,0,0],[0,0,0],[0,0,0]];
					let weakestSide=[[0,0,0],[0,0,0],[0,0,0]];
					let weakestSideInverted=[[0,0,0],[0,0,0],[0,0,0]];
					//turret location
					let turretPos=[0,0,0];
					
					//are we a turret?
					let isTurret=parsedData.turret !=null;
					let points =parsedData.compartment.points;//quick access to points
					//turret ring armor
					if (isTurret){
						//we have a turret
						//set the font back and side values to the turret ring armor
						armor.zP=armor.zN=armor.xP=armor.xN=parsedData.turret.ringArmour;
						//get the turret position
						turretPos=parsedData.pos;
					}
					
					//go through faceMap, they are indexed by face
					for (let j in parsedData.compartment.faceMap){
						let face = parsedData.compartment.faceMap[j];//indexed points of the face
						let vertecies=[];//temporaraly store verticies
						let thick =[2000];//thickness points involved
						//next we need real points, not indexes
						
						for (let e in face){
							let vertexList = points.slice(face[e]*3,face[e]*3+3);
							//turret bottom plate exception
							if (vertexList[1]!==0 || !isTurret){
								//the point is not y=0 or on a turret
								//add thickness
								thick.push(parsedData.compartment.thicknessMap[face[e]]);
							}
							vertecies[e]=vertexList;
						}
						//get minimum thickness off all points (yes points hold thickness)
						thick = Math.min(...thick);
						//angles of the armor in x y and z planes, negative being the inverse
						let angles = slopeOfNormal(normal_vec(...(vertecies.slice(0,3))));//slicing off moint over 3, minor issue for torqued plates im ignoring
						
						//is the armor thinner than older faces?
						armor.min = Math.min(armor.min, thick);
						
						///Display note: armor appears to be appears to be x=side y=top z=front
						///armor object format {min:0,xN:0,xP:0,yN:0,yP:0,zN:0,zP:0}
						
						//next, the x value, is is negative?
						if (angles[0] <0){//side
							//is the effective armor thinner than ones pointing that way?
							armor.xN=Math.min(armor.xN,Math.abs(thick/Math.sin(angles[0])));
						} else {//side inverted
							//is the effective armor thinner than ones pointing that way?
							armor.xP=Math.min(armor.xP,thick/Math.sin(angles[0]));
						}
						//next, the y value, is is negative?
						if (angles[1] <0){//bottom
							//is the effective armor thinner than ones pointing that way?
							armor.yN=Math.min(armor.yN,Math.abs(thick/Math.sin(angles[1])));
						} else {//top
							//is the effective armor thinner than ones pointing that way?
							armor.yP=Math.min(armor.yP,thick/Math.sin(angles[1]));
						}
						//next, the z value, is is negative?
						if (angles[2] <0){//back
							//is the effective armor thinner than ones pointing that way?
							armor.zN=Math.min(armor.zN,Math.abs(thick/Math.sin(angles[2])));
						} else {//front
							///canvas party
							let x=0;
							let y=1;
							
							let turretX=0;
							let turretY=0;
							let points2d=[];
							//get the 2d "image"
							//get the points we want to play with (smash 3d to 2d)
							for (let v in vertecies){
								points2d[v] = [vertecies[v][x],vertecies[v][y]];
							}
							//remove redundant points
							let newPoints=removeDuplicatePoints(points2d);
							//order points
							points2d = orderClockwise(newPoints);
							
							if (isTurret){
								turretX=turretPos[x]*canvasScale;
								turretY=-turretPos[y]*canvasScale;
							}
							//draw points
							frontView.beginPath();
							frontView.moveTo(turretX+points2d[0][x]*canvasScale+canvasXOffset,turretY+canvasYOffset-points2d[0][y]*canvasScale);
							for (let p in points2d){
								frontView.lineTo(turretX+points2d[p][x]*canvasScale+canvasXOffset,turretY+canvasYOffset-points2d[p][y]*canvasScale);
							}
							frontView.closePath();
							frontView.stroke();
							
							let effectiveThickness=thick/Math.sin(angles[2]);
							//is the effective armor thinner than ones pointing that way?
							if (armor.zP >= effectiveThickness){
								//is thinner update stats
								armor.zP=effectiveThickness;
								weakestFront=points2d;
							}//not thinner, we dont care
						}
					}//end face loop
					//recreate weakest plates with fill
					let x=0;
					let y=1;
					let turretX=0;
					let turretY=0;
					points2d= weakestFront;
					console.log(points2d);
					if (isTurret){
						turretX=turretPos[x]*canvasScale;
						turretY=-turretPos[y]*canvasScale;
					}
					//draw points
					frontView.beginPath();
					frontView.moveTo(turretX+points2d[0][x]*canvasScale+canvasXOffset,turretY+canvasYOffset-points2d[0][y]*canvasScale);
					for (let p in points2d){
						frontView.lineTo(turretX+points2d[p][x]*canvasScale+canvasXOffset,turretY+canvasYOffset-points2d[p][y]*canvasScale);
					}
					frontView.fillStyle = "red";
					frontView.fill();
					
					//add to hull or turret accumulator:
					if (isTurret){
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
					
				}else {
					//we arent freeform
					errorLog(`Error: Tank "${name}" Compartment not freeform`);
				}
				break;
				case "SS"://i dunno what this is, if its ever not these i want to know.
					if (data.blueprints[i].data !='{"version":{"Major":0,"Minor":0},"name":"Untitled"}' && data.blueprints[i].data !='{"version":{"Major":0,"Minor":0},"name":""}') {
						errorLog("Give albino "+data.name+" for study please, it contains whatever blueprints.SS is (don't worry the tool is fine)");
					}
				break;
				case "TRK"://Track! we need to check length and width
					//get pho track width
					widthHullAndTrack = parsedData.separation+2*parsedData.belt.x;
					///update farthest forward/backward
				break;
				case "ENG"://engine is easy, displacment+count
					engine = parsedData.cylinderDisplacement*parsedData.cylinders+"L V"+parsedData.cylinders;
				break;
				case "TSN"://tranny, just a gear count
					transmission=(parsedData.d.length+parsedData.r.length)+" Speed transmission ("+parsedData.d.length+"+"+parsedData.r.length+")";
				break;
				case "FLT"://Fuel
					//update fuel
					fuel[0]=parsedData.L;
				break;
				case "CNN"://what guns are installed?
					//loop through all cannons
					for (let j in parsedData.instances) {
						let gun = parsedData.blueprints[parsedData.instances[j].blueprint];//way to long to type
						let barrel = 0;// the length of the barrel of the gun
						//add all lengths
						gun.segments.forEach(e => barrel+=e.len);
						//get the name of the gun
						let gunName =gun.caliber+"X"+gun.breechLength+"mm BL"+Math.round(barrel*1000);
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
				case "GMT"://this is gunmount, list each cannon and its aim limits
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
				case "PTJ"://paintjob i have nothing to put here
				case "FDR"://dont know what this is, only appears sometimes
				break;
				default:
				errorLog("DA FUQ IS A " + data.blueprints[i].id+"?");
			}//end switch
		}//end blueprints loop
		
		
		//gun depression becouse who cares about left and right AZI
		let lowestDepression=-90;
		for(let i in aim){
			lowestDepression =Math.max(lowestDepression,aim[i].down);
		}
		
		let length = farthestBackward-farthestForward;
		let width = farthestSide2-farthestSide1;
		let height = farthestUpward;
		
		miscData.innerHTML+="Name= "+name+"<br/>";
		miscData.innerHTML+="Weight= "+roundHundredth(weight)+"T"+"<br/>";
		miscData.innerHTML+="Length= "+roundHundredth(length)+"m<br/>"
		miscData.innerHTML+="width= "+roundHundredth(width)+"m raw hull or "+roundHundredth(widthHullAndTrack)+"m simplified track<br/>"
		miscData.innerHTML+="Height= "+roundHundredth(height)+"m<br/>"
		miscData.innerHTML+=roundHundredth(fuel[0]+fuel[1])+" liters of fuel, "+roundHundredth(fuel[0])+" of which is internal."+"<br/>"
		miscData.innerHTML+="Engine= "+engine+"<br/>"
		miscData.innerHTML+="Transmission= "+transmission+"<br/>"
		//deal with acumilators
		//cannons
		miscData.innerHTML+="cannons:"+"<br/>"
		for(let i in cannons){
			miscData.innerHTML+="&emsp;"+i+": "+cannons[i]+"<br/>"
		}
		miscData.innerHTML+="Gun depression= "+roundHundredth(lowestDepression)+"<br/>"
		//ammo
		miscData.innerHTML+="ammo:"+"<br/>"
		for(let i in ammo){
			miscData.innerHTML+="&emsp;"+i+": "+ammo[i]+" rounds<br/>"
		}
		//crew
		miscData.innerHTML+="crew:"+"<br/>"
		for(let i in crew){
			miscData.innerHTML+="&emsp;"+i+": "+crew[i]+"m^3<br/>"
		}
		//armor
		miscData.innerHTML+=`Hull Armor: <br/>
		&emsp;Lowest:${roundHundredth(hullArmor.min)}mm<br/>
		&emsp;Front:${roundHundredth(hullArmor.zP)}mm<br/>
		&emsp;Rear:${roundHundredth(hullArmor.zN)}mm<br/>
		&emsp;Side:${roundHundredth(hullArmor.xP)}mm/${roundHundredth(hullArmor.xN)}mm<br/>
		&emsp;Top:${roundHundredth(hullArmor.yP)}mm<br/>
		&emsp;Bottom:${roundHundredth(hullArmor.yN)}mm<br/>`;
		
		miscData.innerHTML+=`Turret Armor: <br/>
		&emsp;Lowest:${roundHundredth(turretArmor.min)}mm<br/>
		&emsp;Front:${roundHundredth(turretArmor.zP)}mm<br/>
		&emsp;Rear:${roundHundredth(turretArmor.zN)}mm<br/>
		&emsp;Side:${roundHundredth(turretArmor.xP)}mm/${roundHundredth(turretArmor.xN)}mm<br/>
		&emsp;Top:${roundHundredth(turretArmor.yP)}mm<br/>
		&emsp;Bottom:${roundHundredth(turretArmor.yN)}mm<br/>`;
		
		//parts
		miscData.innerHTML+="parts:"+"<br/>"
		for(let i in parts){
			miscData.innerHTML+="&emsp;"+i+": "+parts[i]+"<br/>"
		}
		return; //why not i guess
	}
	
};
