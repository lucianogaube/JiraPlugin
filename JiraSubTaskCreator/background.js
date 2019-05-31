document.addEventListener('DOMContentLoaded', function() {

	//For the template copy to clipboard
	var clipboard = new Clipboard('.btn');
	var clipboard2 = new Clipboard('.clip');
	var urlRequest;
	var templateURL = "https://(domain).atlassian.net/rest/api/2/issue/bulk";
	var createButton = document.getElementById('checkPage');
	var dropdownTemplates = document.getElementById("templates");
	var textToSpreadsheet = "";
	
	//can be used for the calculateHours method
	var QATasks = new Set(["QA Prep", "QA Exec", "Show And Tell", "OWASP", "Unit Test Review"]);
	
	chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {		
		urlRequest = getCorrectUrl(tabs[0]);
		if(urlRequest == null) return false;
	});
		
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
	
	//For custom sub-tasks you can input the summary as "My Custom task (10)" 
	//It will count the number inside the parenthesis and calculate the time as a Dev task
	function getCustomTaskTime(taskName){
		var res = taskName.match(/\(([0-9]+)\)/);
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
				elem.innerHTML = 'Done! Please Reload.';
				clearInterval(id);
			} else {	
				width++; 			
				elem.style.width = width + '%'; 
				elem.innerHTML = width * 1  + '%';
				elem.value = width * 1  + '%';				
			}
		}		
	}
	
	function getCorrectUrl(tablink){
		var urlTemp = tablink.url;		
		var urlMatch = urlTemp.match(/((https?|ftp|smtp):\/\/)?(www.)?([a-z0-9]+).atlassian/);
		
		if(urlMatch == null) {			
			return false;
		}
		
		var domain = urlMatch[urlMatch.length - 1];
		urlRequest = templateURL.replace("(domain)", domain);	
		
		return urlRequest;
	}
	
	createButton.addEventListener('click', function() {
		//this can be uncommented to calculate the hours of the sub-tasks
		//calculateHours(); 		
		var form = document.getElementById("addbookmark");
		var isValidForm = form.checkValidity();		
		var subTasks = document.getElementsByName("t");
		var parent = document.getElementById("iv");
		var project = document.getElementById("proj").value;
		var other = document.getElementById("otherTask");
		var otherSubs = other.value.split(';');
		var stories = parent.value.split(';');
		var request = new XMLHttpRequest();
		var error = document.querySelector('.error');
		
		createButton.disabled = true;		

		if (!isValidForm) {    
			createButton.disabled = false;
			form.reportValidity();
		}
		
		if(urlRequest == null) return;
		
		request.open("POST", urlRequest, true);
		request.setRequestHeader("Content-type","application/json");
		var resp = {"issueUpdates":[]};
		
		if(project == "" || stories[0] == "") return false;
		
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
								"project":{"key":project},
								"summary":otherSub,
								"issuetype":{"name":"Sub-task"},
								"parent":{"key":project + "-" + story} //Custom fields can be added here as a new property
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
							"project":{"key":project},
							"summary":subTask.value, // + subTaskTime, (this is part of the calculation)
							"issuetype":{"name":"Sub-task"},
							"parent":{"key":project + "-" + story} //Custom fields can be added here as a new property
						}
					});
				}				
			});							
		});
		
		request.send(JSON.stringify(resp));		
		
		request.onloadend = function() {
		if (request.status == 200 || request.status == 201 || request.status == 202) {
			InitProgressBar();
		} else {
			alert("Error, please Note: \nThis extension will only work with Jira page opened \n(ie. https://domain.atlassian.net) and logged in.\nPlease reload.");
		}
	  };
	
  }, false);
}, false);