document.addEventListener('DOMContentLoaded', function() {
	//For the template copy to clipboard
	var clipboard = new Clipboard('.btn');
	var clipboard2 = new Clipboard('.clip');
	
	var createButton = document.getElementById('checkPage');
	var dropdownlist = document.getElementById("teams");
	var dropdownTemplates = document.getElementById("templates");
	var textToSpreadsheet = "";
	
	//can be used for the calculateHours method
	var QATasks = new Set(["QA Prep", "QA Prep", "Show And Tell", "OWASP", "Unit Test Review"]);
	
	//Template button will change according to selection
	dropdownTemplates.addEventListener('click', function() {
		var template = dropdownTemplates.value;
		document.getElementById("story").style.display = "none";
		document.getElementById("bug").style.display = "none";
		document.getElementById("cloudStory").style.display = "none";
		document.getElementById("task").style.display = "none";
		
		if(template != null){
			document.getElementById(template).style.display = "inline-block";	
		}
	});
	
	//Can be used to calculate the hours of the sub-tasks (ie. "Code Review (3)") 
	//It will calculate the hours specified inside the parenthesis
	function calculateHours(){
		var tasks = document.getElementsByName("t");
		var totaldev = 0;
		var totalqa = 0;
		
		tasks.forEach(task => {
			if(task.checked){
				var taskTime = document.getElementsByName(task.value); 
				if(task.value == "Other")
				{
					other = document.getElementById("otherTask");
					otherSubs = other.value.split(';');          
					otherSubs.forEach(other =>
					{
						if(other != "")
						{
							var temp = getCustomTaskTime(other);
							if(temp != "")
							{
								totaldev += parseFloat(temp);
							}
						}
					});
					return;
				}
				
				var hours = taskTime[0].value;			
				if(hours != ""){
					if(isQaTask(task.value) == true){
						totalqa += parseFloat(hours);
					}
					else{
						totaldev += parseFloat(hours); 
					}
				}		
			}			
		});
		
		parent = document.getElementsByName("iv");
		//Text to clipboard, can be used in spreadsheet later
		textToSpreadsheet = "IV-" + parent[0].value + ";" + String(totaldev) + ";" + String(totalqa);		
		createButton.setAttribute("data-clipboard-text", textToSpreadsheet);
	}
	
	//For custom sub-tasks youc an input the summary as "My Custom task (10)" 
	//It will count the number inside the parenthesis and calculate the time as a Dev task
	function getCustomTaskTime(taskName){
		var res = taskName.match(/\(([0-9]\d+)\)/);
		if(res === null) return ""

		return res[1];
	}
	
	//To check if the sub-task is QA or Dev
	function isQaTask(taskName){
		var isQA = false;
		if(QATasks.has(taskName)){
			isQA = true;
		}
		return isQA;	
	}
		
  
	//Progress bar
	function InitProgressBar() {
	var elem = document.getElementById("myBar");   
	var width = 0;
	var id = setInterval(frame, 80);
		function frame() {
			if (width >= 100) {
				elem.innerHTML = 'Done!';
				clearInterval(id);
			} else {	
				width++; 			
				elem.style.width = width + '%'; 
				elem.innerHTML = width * 1  + '%';
				elem.value = width * 1  + '%';				
			}
		}		
	}
	
	createButton.addEventListener('click', function() {
		//this can be uncommented to calculate the hours of the sub-tasks
		//calculateHours(); 
		createButton.disabled = true;
		var subTasks = document.getElementsByName("t");
		var parent = document.getElementsByName("iv");
		var team = document.getElementById("teams");
		var proj = document.getElementById("projects");
		var selectedTeam = team.options[team.selectedIndex].value;
		var selectedTeamId = team.options[team.selectedIndex].id;
		var selectedProject = proj.options[proj.selectedIndex].value;
		var other = document.getElementById("otherTask");
		var otherSubs = other.value.split(';');
		var stories = parent[0].value.split(';');
		var request = new XMLHttpRequest();
		
		request.open("POST","https://iquate.atlassian.net/rest/api/2/issue/bulk",true);
		request.setRequestHeader("Content-type","application/json");
		var resp = {"issueUpdates":[]};
		
		stories.forEach(story => {
			if(story == "") return;
			
			subTasks.forEach(subTask => {
				if(!subTask.checked) return;
				
				if(subTask.value == "Other"){
					otherSubs.forEach(otherSub =>{
						if(otherSub === "") return;
						
						resp.issueUpdates.push({
							"fields":
							{
								"project":{"key":selectedProject},
								"summary":otherSub,
								"issuetype":{"name":"Sub-task"},
								"labels":[selectedTeamId],
								"parent":{"key":selectedProject + "-" + story} //Custom fields can be added here as a new property
							}
						});													
					});							
				}					
				else {
					//Uncomment this to calculate the hours of custom sub-tasks
					// var subTaskTime = document.getElementsByName(subTask.value)[0].value;
					// if(subTaskTime != ""){
						// subTaskTime = " (" + subTaskTime + ")";
					// }
					resp.issueUpdates.push({
						"fields":
						{
							"project":{"key":selectedProject},
							"summary":subTask.value, // + subTaskTime, (this is part of the calculation)
							"issuetype":{"name":"Sub-task"},
							"labels":[subTask.id, selectedTeamId],
							"parent":{"key":selectedProject + "-" + story} //Custom fields can be added here as a new property
						}
					});
				}				
			});							
		});
		
		request.send(JSON.stringify(resp));
		InitProgressBar();
	
  }, false);
}, false);

