const EventsEnum = {
    "arrived": 1,
    "processing": 2,
    "terminated": 3,
    "rearrived" : 4,
}
Object.freeze(EventsEnum);

function getEventName(id) {
    for (let key in EventsEnum) {
        if (EventsEnum[key] == id)
            return key;
    }
}

class TimeEvent {
    process = {};
    constructor(at, process, action) {
        this.at = at;
        for (let key in process) {
            this.process[key] = process[key];
        }
        this.action = action;
    }
}

class Process {
    constructor(id, burstTime, arrivalTime) {
        this.waitingTime = 0;
        this.untouched = true;
        this.responseTime = 0;
        this.id = id;
        this.burstTime = burstTime;
        this.remainingBurst = burstTime;
        this.arrivalTime = arrivalTime;
    }
}

function runRR(processQueue, quantum) {
    let timeline = [];
    let readyQueue = [];
    let terminatedQueue = [];
    let quantumOffset = 0;
    let clock = 0;
    let process = null;
    processQueue.sort((a, b) => {
        return a.arrivalTime - b.arrivalTime
    });
    while (processQueue.length != 0 || readyQueue.length != 0 || process != null) {
        // check for new process
        while (processQueue.length != 0 && processQueue[0].arrivalTime == clock) {
            timeline.push(new TimeEvent(clock, processQueue[0], EventsEnum.arrived));
            readyQueue.push(processQueue.shift());
        }
        // take process from ready Queue
        if (process == null) {
            if (readyQueue.length == 0) {
                clock++;
                continue;
            }
            process = readyQueue.shift();
            if(process.untouched){
                process.untouched = false;
                process.responseTime = clock - process.arrivalTime;
            }
        }
        // switching context
        if (readyQueue.length > 0 && quantumOffset >= quantum && quantumOffset%quantum == 0) {
            readyQueue.push(process);
            timeline.push(new TimeEvent(clock, process, EventsEnum.rearrived));
            process = null;
            quantumOffset = 0;
            continue;
        }
        // calcucate wait time
        readyQueue.forEach(p=>{
            p.waitingTime++;
        });
        // execute process
        process.remainingBurst--;
        // Terminating process
        if (process.remainingBurst == 0) {
            terminatedQueue.push(process);
            timeline.push(new TimeEvent(clock, process, EventsEnum.terminated));
            process = null;
            quantumOffset = 0;
        } else {
            // continue processing
            timeline.push(new TimeEvent(clock, process, EventsEnum.processing));
            quantumOffset++;
        }
        clock++;
    }
    for (let key in terminatedQueue)
        processQueue[key] = terminatedQueue[key];
    return timeline;
}

function getInputTemplate(processId, arrival = 0, burst = 0) {
    var div = document.createElement("DIV");
    div.classList = "border-b border-gray-300 py-1 px-2 w-auto";
    div.id = "process" + processId;
    div.innerHTML =
        `<p class="inline-block px-4 font-bold">P` + processId + `</p>
    <label class="inline-block px-2">
        <span>Arrival Time<span>
        <input id="process` + processId + `_arrival" type="number" value="` + arrival + `" class="ml-2 py-1 px-2 w-16 border border-gray-500 rounded">
    </label>
    <label class="inline-block px-2">
        <span>Burst Time<span>
        <input id="process` + processId + `_burst" type="number" value="` + burst + `" class="ml-2 py-1 px-2 w-16 border border-gray-500 rounded">
    </label>
    <button class="w-6 h-6 m-1 text-white font-bold rounded bg-red-700 hover:bg-red-900" onClick="removeProcess(` + processId + `)">X</button>
    `;
    return div;
}
var numberOfProcesses = 0;
reset();

function reset() {
    for (let i = numberOfProcesses; i > 0; i--)
        removeProcess(i);
    let chart = document.getElementById("result_chart");
    chart.innerHTML = '';
    // let table = document.getElementById("result_table");
    let trs = document.getElementsByClassName("tablerow");
    for (var i = trs.length - 1; i >= 0; --i) {
        trs[i].remove();
    }
    let avgs = document.getElementById("result_avgs");
    avgs.innerHTML = `
    <p>Number of processes: 0</p>
    <p>Average Waiting Time: 0</p>
    <p>Average Turnaround Time: 0</p>
    <p>Average Response Time: 0</p>
    `;
    addNewProcess();
}

function addNewProcess(arrival = 0, burst = 0) {
    document.getElementById("process_input").appendChild(getInputTemplate(++numberOfProcesses, arrival, burst));
}

function removeProcess(processId) {
    parent = document.getElementById("process_input");
    parent.removeChild(document.getElementById("process" + processId));
    for (let i = processId + 1; i <= numberOfProcesses; i++) {
        burst = document.getElementById("process" + i + "_burst").value;
        arrival = document.getElementById("process" + i + "_arrival").value;
        parent.removeChild(document.getElementById("process" + i));
        parent.appendChild(getInputTemplate(i - 1, arrival, burst));
    }
    numberOfProcesses--;
}

// Result
// timeline at one clock unit
function getPCell(timeline, i) {
    let timeEvent = {};
    let arrived = [];
    timeline.forEach(e=>{(e.action==EventsEnum.arrived)?arrived.push(e.process):timeEvent = e;});
    function arrivedTemp(){
        let x = "";
        arrived.forEach(e=>{
            x += `<p class="text-xs mr-1 -mb-1">P`+e.id+`</p>`;
        });
        return x;
    }
    let pid = "";
    let rb = "";
    if(timeEvent.process != null){
        pid = "P" + timeEvent.process.id;
        rb = [(timeEvent.process.burstTime - timeEvent.process.remainingBurst)+`/`+timeEvent.process.burstTime];
    }
    let color = (timeEvent.action==EventsEnum.processing && timeEvent.process.remainingBurst == timeEvent.process.burstTime - 1)?
                "bg-green-300":(timeEvent.action==EventsEnum.terminated?"bg-red-300":"bg-gray-300");
    let svg = (arrived.length > 0)? 
        `<svg class="w-4 h-4 -mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M16 17l-4 4m0 0l-4-4m4 4V3" /></svg>`:"";
    let temp =
        `<div class="absolute top-0 flex flex-row items-center justify-between w-16">
            <div class="p-1 mt-1">
                <div class="flex flex-wrap">`+ arrivedTemp() +`</div>
                `+ svg +`
            </div>
        </div>
        <div class="flex flex-col mt-6 h-16 w-16 `+ color +` items-center justify-center">
            <p class="text-black font-bold text-xl -mb-2">`+pid+`</p>
            <p class="text-sm">`+ rb +`</p>
        </div>
        <div class="flex flex-row-reverse items-center justify-between h-6 w-16 bg-gray-200">
            <p class="text-xs">`+(i + 1)+`</p>
        </div>`;

    let div = document.createElement("DIV");
    div.classList = "relative";
    div.innerHTML = temp;
    return div;
}

function updateTable(processes){
    processes.sort((a, b) => {
        return a.id - b.id
    });
    let trs = document.getElementsByClassName("tablerow");
    for (var i = trs.length - 1; i >= 0; --i) {
        trs[i].remove();
    }
    let table = document.getElementById("result_table");
    let td;
    let trclass = "border border-black tablerow px-2";
    processes.forEach(e => {
        let tr = document.createElement("TR");

        td = document.createElement("TD");
        td.classList = trclass;
        td.innerHTML = "P" + e.id;
        tr.appendChild(td);

        td = document.createElement("TD");
        td.classList = trclass;
        td.innerHTML = e.arrivalTime;
        tr.appendChild(td);

        td = document.createElement("TD");
        td.classList = trclass;
        td.innerHTML = e.responseTime;
        tr.appendChild(td);

        td = document.createElement("TD");
        td.classList = trclass;
        td.innerHTML = e.waitingTime;
        tr.appendChild(td);

        td = document.createElement("TD");
        td.classList = trclass;
        td.innerHTML = (Number(e.waitingTime) + Number(e.burstTime));
        tr.appendChild(td);

        table.appendChild(tr);
    });
    let avgW = 0;
    let avgTA = 0;
    let avgR = 0;
    processes.forEach(p=>{
        avgW += p.waitingTime;
        avgTA += (Number(p.burstTime) + Number(p.waitingTime));
        avgR += p.responseTime; 
    });
    avgW = Math.round((avgW/processes.length + Number.EPSILON) * 100) / 100;
    avgTA = Math.round((avgTA/processes.length + Number.EPSILON) * 100) / 100;
    avgR = Math.round((avgR/processes.length + Number.EPSILON) * 100) / 100;
    let avgs = document.getElementById("result_avgs");
    avgs.innerHTML = `
    <p>Number of processes: `+processes.length+`</p>
    <p>Average Waiting Time: `+avgW+`</p>
    <p>Average Turnaround Time: `+avgTA+`</p>
    <p>Average Response Time: `+avgR+`</p>
    `;
}

function execute() {
    let processes = [];
    // let isAnimate = true;
    let quantum = 2;
    // extract values from input fields
    for (i = 1; i <= numberOfProcesses; i++) {
        burst = document.getElementById("process" + i + "_burst");
        arrival = document.getElementById("process" + i + "_arrival");
        if (burst != null && burst.value > 0 && arrival != null && arrival.value >= 0) {
            processes.push(new Process(i, burst.value, arrival.value));
        }
    }

    if(processes.length <= 0)
        return;

    // isAnimate = document.getElementById("animate").checked;
    quantum = document.getElementById("quantum").value;
    let timeline = runRR(processes, quantum);
    // console.log(timeline);

    updateTable(processes);

    let chart = document.getElementById("result_chart");
    chart.innerHTML = '';
    let clock = 0;
    let clockStack = [];
    let events = [];

    for(let i = 0; i <= timeline[timeline.length-1].at; i++){
        timeline.forEach(el=>{
            if(el.at == clock){
                events.push(el);
            }
        });
        clock++;
        clockStack.push(events);
        events=[];
    }

    clockStack.forEach((e, i)=>{
        chart.appendChild(getPCell(e, i));
    });
}

// function test() {
//     removeProcess(1);
//     addNewProcess(0, 9);
//     addNewProcess(2, 11);
//     addNewProcess(4, 4);
//     addNewProcess(6, 5);
//     addNewProcess(7, 2);
//     addNewProcess(9, 1);
// }
// test();

function random() {
    reset();
    removeProcess(1);
    document.getElementById("quantum").value = Math.floor(Math.random() * 5) + 1;
    let n = Math.floor(Math.random() * 13) + 2;
    for(i = 0; i < n; i++){
        addNewProcess(Math.floor(Math.random() * 20), Math.floor(Math.random() * 9) + 1);
    }
}
