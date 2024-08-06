
Let's break down the provided code (server.js) to understand its functionality

**WebSocket and Net Module import** 	```
```
	const WebSocket = require('ws');
	const net = require('net');
	const fs = require('fs');
```

- `const WebSocket = require('ws);` : This imports the `ws` module, which is a WebSocket library for Node.js, allowing you to create WebSocket servers and clients.
- `const net = require('net');` : This imports the `net` module, which provides an asynchronous network API for creating stream-based TCP or ICP servers and clients
- `const fs = require('fs');` : Import the `fs` (File system) module, which allows us to interact with the file system to read and write files.

Function For Get All Endpoints
```
	function parsePjsipGlobals(filePath){
		const data = fs.readFileSync(filePath, 'utf-8');
		const lines = data.split('\n');
		let globalsSection = false;
		const pjsipData = [];
		lines.forEach(line => {
			line = line.trim();
			if(line === '[globals]'){
				globalsSection = true;
				return;
			}
			if(line.startsWith('[') && globalsSection) {
				globalsSection = false;
				return;
			}
			if (globalsSection && line){
				const match - line.match(/(\w+)=PJSIP\/(\w+)/);
				if(match) {
					const value = line.split('=')[1];
					pjsipData.push(value);
				}
			}
		});
		return pjsipData;
	}
```

- `function parsePjsipGlobals(filePath){...}` : Define a function `parsePjsipGlobals` that takes a `filePath` as an argument. This function will be responsible for parsing the PJSIP entries the specified file.
- `const data = fs.readFileSync(filePath, 'utf-8');` : Use `fs.readFileSync` to read the content of the file specified by `filePath`. The `utf-8` encoding is used to ensure the file is read as a string. The content is stored in the `data` variable.
- `const lines = data.split('\n');` : Split the file content into an array of lines using the newline character `('\n')` as the delimiter. Each line in the file becomes an element in the `lines` array.
- `let globalsSection = false;` : Initialize a boolean variable `globalsSection` to `false`. This will be used to track whether we are currently inside the `[globals]` section of the file.
- `const pjsipData = [];` : Initialize an empty array `pjsipData` to store the PJSIP entries found in the `[globals]` section.
- `lines.forEach(line => { line = line.trim(); ...` : Iterate over each line in the `lines` array using `forEach`. For each line, use `trim()` to remove any leading and trailing whitespace.
- `if (line === '[globals]'){globalsSection = true; return;}` : Check if the current line is `[globals]`. If it is, set `globalsSection` to `true` to indicate that we are now inside the `[globals]` section, and `return` to skip further processing of this line.
- `if (line.startsWith('[') && globalsSection){ globalsSection = false; return;}` : Check if the current line starts with `'['` and `globalsSection` is `true`. This means we have reached a new section in the file, so set `globalsSection` to `false` to indicate that we are no longer in the `[globals]` section, and `return` to skip further processing of this line.
- `if (globalsSection && line){ const match = line.match(/(\w+)=PJSIP\/(\w+)/); ...` : if we are inside the `[globals]` section (`globalsSection` is `true`) and the current line is not empty `('line')`, proceed to process the line:
	- Use a regular expression to match lines that follow the pattern `variable=PJSIP/extension`. The regex `(\w+)PJSIP\/(\w+)` captures the variable name and the extension separately.
	- If a match is found, split the line at the `=` character and take the part after the `'='` (which is `PJSIP/extension`) and store it in the `value` variable.
	- Push the `value` into the `pjsipData` array.
- `return pjsipData;` : After processing all lines, return the `pjsipData` array, which contains all the PJSIP entries found in the `[globals]` section.

 **Configuration Constants** 
```
	const wsPort = 8080;
	const amiHost = '127.0.0.1';
	const amiPort = 5038;
	const amiUser = 'php-app';
	const amiSecret = 'your-secret';
```

- `wsPort` : The port number on which the WebSocket server will listen.
- `amiHost` : The IP address or hostname of the AMI server.
- `amiPort`: The port number on which the AMI server listens.
- `amiUser`: The username for authenticating with the AMI server.
- `amiSecret`: The password for authenticating with the AMI server.

**WebSocket Server initilization**  
```
	const wss = new WebSocket.Server({port : wsPort});
	console.log('WebSocket server is running on ws://localhost:${wsPort}');
```

- `const wss = new WebSocket.Server({port : wsPort});` : Creates a new WebSocket server instance that listens on the specified port (`'wsPort'`).
- `console.log(...)` : Logs a message indicating that the WebSocket server is running and displays the WebSocket server's address.

**Data structures for Tracking calls and Peers** 
```
	let activeCalls = {};
	let recentCalls = {};
	let sipPeers = {};
	let peer = {};
```

- `activeCalls` : An object to keep track of active calls.
- `recentCalls` : An object to keep track of recent calls.
- `sipPeers` : An object to store SIP peers and their statuses.
- `peer` : An object to store peers.

**Function SendToClients**
```
	function sendToClients(type, data){
		wss.clients.forEach(client => {
			if (client.readyState === WebSocket.OPEN){
				client.send(JSON.stringify({type, data}));
			}
		});
	}
```

- `sendToClients(type, data) {...}` : This function takes two parameters `type` and `data`. The purpose of this function is to send a message to all connected WebSocket clients.
- `wss.clients.forEach (client => {` : This loops through all clients connected to the WebSocket server `('wss')`.
- `if (client.readyState === WebSocket.OPEN) {` : This checks if the client's WebSocket connection is open.
- `client.send(JSON.stringify({type, data}))` : This sends a message to the client. This message is a JSON string that contains an object with `type` and `data` properties.

**WebSocket Server Connection Hanging**
```
wss.on('connection', function connection(ws)){
	console.log('Client connected');
```

- `wss.on('connection', function connection(ws){...}`: Sets up an event listener for incoming WebSocket connections. When a new client connects, the callback function is invoked with the `ws` (WebSocket) object representing the connection.

**AMI Connection Initialization** 
```
    const amiClient = net.createConnection({ host: amiHost, port: amiPort }, ()      => {
        console.log('Connected to AMI');
	        amiClient.write(`Action: Login\r\nUsername: ${amiUser}\r\nSecret:        ${amiSecret}\r\n\r\n`);
	        amiClient.write(`Action: SIPPeers\r\n\r\n`);
    });
```

- `const amiClient = net.createConnection({ host : amiHost, port : amiPort}, () => {...}` : Establishes a TCP connection to the AMI server.
- `amiClient.write(..)`: Sends AMI commands ove the TCP connection. The first command logs in to the AMI server, and the second command requests information about SIP servers.

**AMI Data Handling**
```
	amiClient.on('data', (data) => {
	const message = data.toString();
	console.log('Recieved data from AMI');
```

- `amiClient.on('data', (data) => {...}` : Sets up an event listener for data recieved from the AMI server.
- `const message = data.toString()` : Converts the recieved data to a string.
- `console.log('Recieved data from AMI')` : Logs a message indicating that data has been recieved from the AMI server.

**Handling SIP Peer Entry Events** 
```
	if(message.includes('Event: PeerEntry') || message.include('Event:                  PeerStatus)){
		const lines = message.split('\n');
		let peer = {};
		lines.forEach(line => {
			const [key, value] = line.split(': ');
			if (key && value){
				peer[key,trim()] = value.trim();
			}
		});
		if(peer.ChannelType === 'PJSIP') {
			sipPeers[peer.Peer || peer.ObjectName] = peer.Status;
		} 
	}
```

- `if (message.includes('Event: PeerEntry') || message.includes('Event: PeerStatus)){...}` : Checks if the received message is a SIP peer entry or status event.
- `const lines = message.split('\n');` : Splits the message into lines.
- `let peer = {};` : Initializes an empty object to store peer information.
- `lines.forEach(line => {...})` : Iterates over each line in the message.
- `const [key, value] = line.split(': ')` : Splits each line into a key-value pair.
- `peer[key, trim()] = value.trim()` : Stores the key-value pair in the `peer` object after trimming whitespace.
- `if (peer.ChannelType === 'SIP') {...}` : Checks if the peer is of type SIP.
- `sipPeers[peer.peer || peer.ObjectName] = peer.Status;` : Stores the peer's status in the `sipPeers` object, using the peer's name or peer as the key.

**Handling New Call or Bridge Events**
```
	} else if (message.includes('Event: NewChannel'){
		const lines = message.split('\n');
		let channelId = '';
		let dialer = '';
		let recipient = '';
		lines.forEach(line => {
			if (line.startsWith('Channel: ')){
				channelId = line.substring('Channel: '.length);
			}
			if (line.startsWith('CallerIDNum: ')){
				dialer = line.substring('CallerIDNum: '.length);
			}
			if (line.startsWith('Exten: ')){
				recipient = line.substring('Exten: '.length);
			}
		});
		if (channelId){
			activeCalls[channelId] = {dialer, recipient, startTime:new Date()};
			sendToClients('activeCalls', activeCalls)
		}
	}
```

- `if (message.includes('Event: NewChannel')){...}` : Checks if the received message is a new call.
- `const lines = message.split('\n');` : Splits the message into lines.
- `let channelId = '';` : Initializes a variable to store the channel ID.
- `lines.forEach(line => {...})`: Iterates over each line in the message.
- `if (line.startsWith('Channel: ')){...}` : Checks if the line starts with 'Channel: '.
- `channelId = line.substring('Channel: '.length);` : Extracts the channel ID from the line.
- `if (line.startsWith('CallerIDNum: ') {...}` : Checks if the line starts with 'CallerIDNum: '
- `dialer = line.substring('CallerIDNum: '.length);` : Extracts the dialer number from the line.
- `if (line.startsWith('Exten: ')) {...}` : Checks if the line starts with 'Exten: '.
- `recipient = line.substring('Exten: '.length);` : Extracts the recipient number from the line.
- `if (channelId) {...}`: Checks if a channel ID was found.
- `activeCalls[channelId] = new Date();` : Adds the channel ID to the `activeCalls` object with the dialer, recipient and current date and time.
- `sendToClients('activeCalls', activeCalls)` : Sends a message to the WebSocket client with the updated list of active calls.

**Handling Hangup Events**
```
	} else if (message.includes('Event: Hangup') || message.includes('Event:                    Bridge')){
		const lines = message.split('\n');
		let channelId = '';
		lines.forEach(line => {
			if (line.startsWith('Channel: ')){
				channelId = line.substring('Channel: '.length);
			}
		});
		if (channelId && activeCalls[channelId]){
			const callStartTime = activeCalls[channelId].startTime;
			const callDuration = Math.round((new Date() - callStartTime) / 1000);
			recentcalls[channelId] = {
				...activeCalls[channelId],
				duration: callDuration,
				timestamp: new Date()
			};
			delete activeCalls[ChannelId];
			const now = new Date();
			Object.keys(recentCalls).forEach(callId => {
				if ((now - recentCalls[callId].timestamp)> 15 * 60 * 1000){
					delete recentCalls[callId];
				}
			});
			sendToClients('activeCalls', activeCalls);
			sendToClients('recentCalls', Object.values(recentCalls));
		}
	}
```

- `if (message.includes('Event: Hangup')|| message.includes('Event: Bridge')){...}` : Checks if the received message is a hangup or bridge event.
- `const lines - message.split('\n');` : Splits the message into lines.
- `let channelId = '';` : Initializes a variable to store the channel ID.
- `lines.forEach(line => {...})` : Iterates over each line in the message.
- `if (line.startsWith('Channel: ') {...}` : Checks if the line starts with "Channel: ".
- `channelId = line.substring('Channel: '.length;` : Extracts the channel ID from the line.
- `if (channelId && activeCalls[channelId]) {...}` : Checks if a channel ID and active calls of channel ID was found.
- `const callStartTime = activeCalls[channelId].startTime;` : This line retrieves the `startTime` of the call from the `activeCalls` object using the `channelId`. This start time was stored when the call was initially placed.
- `const callDuration = Math.round((new Date() - callStartTime / 1000);` : This line calculates the duration of the call in seconds.
- `recentCalls[channelId] = {...activeCalls[channelId], duration: callDuration, timestamp: new Date()};` : This line adds the call to the `recentCalls` object.
- `delete activeCalls[channelId];` : Removes the channel ID from the `activeCalls` object.
- `const now = new Date();` : creates a new Date object representing the current time.
- `Object.keys(recentCalls).forEach(callId => {...});` : iterates over each key (which is a call ID) in the `recentCalls` object. For each `callId`, it checks if the difference between the current time (`'now'`) and the `timestamp` of the recent call is greater than 15 minutes. If the difference is greater than 15 minutes, it deletes the entry from `recentCalls`.
- `sendToClients('activeCalls', activeCalls);` : sends the updated `activeCalls` object to all connected WebSocket clients.
- `sendToClients('recentCalls', Object.values(recentCalls));` send the updated `recentCalls` object to all connected WebSocket clients. `Object.values(recentCalls)` converts the `recentCalls` object to an array of its values.

**Sending User Information to the Client** 
```
	const filePath = '/etc/asterisk/extensions.conf;
	const allUsers = parsePjsipGlobals(filePath);
	let activeUsers = [];
	Object.entries(sipPeers).forEach(([key, value]) => {
		if(value === 'Reachable')
			activeUsers.push(key);
	});
	sendToClients('allUsers', allUsers);
	sendToClients('activeUsers', activeUsers);
```

- `const filePath = '/etc/asterisk/extensions.conf'` : Define the file path of the `extensions.conf` file.
- `const allUsers = parsePjsipGlobals(filePath);` : Call the `parsePjsipGlobals` function with `filePath` file path. Store the result in the `allUsers` variable.
- `let activeUsers = [];` : Initialize a array to store activeUsers.
- `Object.entries(sipPeers).forEach(([key,value]) => {...}`: Gets all data from `sipPeers` and separate to `key` and `value`.
- `if (value === 'Reachable') activeUsers.push(key)` : Add users to `activeUsers` array if its `peerStatus` is `Reachable`.
- `sendToClients('allUsers', allUsers);` : Sends a message to the WebSocket client with the list of all users.
- `sendToClients('activeUsers', activeUsers);` : Sends a message to the WebSocket client with the list of active users.

**AMI Connection End Handling**
```
	amiClient.on('end', () => {
		console.log('Disconnected from AMI');
	})
```

- `amiClient.on('end', () => {...}` : Sets up an event listener for when the AMI connection ends.
- `console.log('Disconnected from AMI');` : Logs a message indicating that the connection to the AMI server has been closed.

**WebSocket Client Message Handling**
```
	ws.on('message', (message) => {
		console.log('Received message drom client: ${message}');
		amiClient.write(message + '\r\n');
	});
```

- `ws.on('message', (message) => {...})` : Sets up an event listener for messages received from the WebSocket client.
- `console.log('Received message from client: ${message}');` : Logs the received message.
- `amiClient.write(message + '\r\n');`: Sends the received message to the AMI server.

**WebSocket Client Disconnection Handling** 
```
	ws.on('close', () => {
		console.log('Client disconnected');
		amiClient.end();
	})
```

- `ws.on('close', () => {...})` : Sets up an event listener for when the WebSocket client disconnects.
- `console.log('Client disconnected');` : Logs a message indicating that the client has disconnected.
- `amiClient.end();` : Ends the connection to the AMI server.

**WebSocket Error Handling** 
```
	ws.on('error', (error) => {
		console.error('WebSocket error: ${error.message}');
	});
```

- `ws.on('error', (error) => {...})` : Sets up an event listener for WebSocket errors.
- `console.error('WebSocket error: ${error.message}');` : Logs an error message.

**Sending Recent Calls to the Client Periodically**
```
	setInterval(() => {
		const now = new Date();
		const recentCallsList = Object.keys(recentCalls).filter((channelId) => {
			return (now - recentCalls[channelId]) < 15 * 60 * 1000;
		});
		sendToClients('recentCalls', recentCallsList.map(id =>                                         ({id,...recentCalls[id]})));
	}, 60000);
	});
```

- `setInterval(() => {...}, 60000` ; Sets up a function to run every 60 seconds (60000 miliseconds).
- `const now = new Date();` : Gets the current date and time.
- `const recentCallsList = Object.keys(recentCalls).filter((channelId) => {...});` : Filters the list of recent calls to get only those that occured within the last 15 minutes.
- `return (now - recentCalls[channelId]) < 15 * 60 * 1000;` : Checks if the call ended within last 15 minutes.
- `sendToClients('recentCalls', recentCallsList.map(id =>({id,...recentCalls[id]}))` : Sends a message to the WebSocket client with the list of recent calls.

This code sets up a WebSocket server to communicate with clients, establishes a connection to an Asterisk Manager Interface (AMI) server, handles various AMI events to track SIP peers, active calls, and recent calls, and sends this information to connected WebSocket


Now, let's go through this HTML and JavaScript code

**HTML Document** 
```
	<!DOCTYPE html>
	<html lang = "en">
```

- Declares the document as HTML5 and sets the document's language to English.

```
	<head>
		<meta charset = "UTF-8">
		<meta name = "viewport" content = "width = device-width, initial-scale =         1.0">
		<title>AMI Dashboard</title>
		<link rel = "stylesheet" href = "semantic.min.css">
		<style>
			body {
				font-family: "Lucida Console", "Courier New", monospace;
				background-color: #90AFC5;
			}
			.main-container {
				padding: 20px;
			}
			.sidebar {
				width: 250px;
				border-radius: 5px;
				box-shadow: 2px 2px 2px #000000;
				background-color: #002C54;
				padding: 20px;
				position: fixed;
				height: 100%;
			}
			.sidebar .header{
				font-size: 24px;
				margin-bottom: 30px;
			}
			.content {
				margin-left: 270px;
				padding: 20px;
			}
			.ui.card{
				box-shadow: 2px 2px 4px #000000;
				background-color: #FDF6F6;
				border-radius: 20px;
				width: 100%;
			}
			.ui.grid > .column:not(.row) {
				border-radius: 20px;
				margin-left: 15%;
				background-color: #C5001A;
				box-shadow: 2px 2px 4px #000000;
				padding-left: 10px;
				padding-right: 10px;
			}
			.ui.segment {
				margin-bottom: 20px;
				padding: 20px;
				background-color: #C5001A;
				border-radius: 20px;
				box-shadow: 2px 2px 4px #000000;
			}
			nav {
				text-align: left;
				border-radius: 20px;
				box-shadow: 2px 2px 4px #000000;
				background-color: #763626;
				color: #faf3f3;
				padding: 10px;
				margin-bottom: 20px;
			}
			a {
				text-align: center;
			}
			.header {
				text-shadow: 2px 2px 2px #ddcdcd;
				text-align: center;
				height: 30px;
				width: 100%;
				padding: 5px;
				font-size: 25px; 
				background-color: rgb(241, 78, 78);
			}
			.item {
				padding: 10px;
				font-size: 18px;
				color: #b65e5e;
				border-bottom: 1px solid #af8484;
			}
			textarea{
				color: #7b3e8d;
				font-size: 18px;
				padding: 10px;
			}
		</style>
	</head>
```

- `<meta charset = "UTF-8>` : Sets the character encoding to UTF-8.
- `<meta name = "viewport" content = "width = device-width, initial-scale = 1.0">` : Enables responsive design.
- `<title> AMI Dashboard </title>` : The title of the page.
- `<link rel = "stylesheet" href = "semantic.min.css">` : Includes the Semantic UI CSS library.
- `<style>` : Defines internal CSS style for page layout.

```
	<body>
		<div class = "sidebar">
			<div class = "header"> Asterisk Manager Interface </div>
			<div class = "ui secondary vertical menu">
				<a class = "item" > Dashboard </a>
				<a class = "item"> Users </a>
			</div>
		</div>
```

- `<div class = "sidebar">` : Creates a sidebar with fixed positioning, styled according to the previous CSS rules.
- `<div class = "header">` : Header in the sidebar.
- `<div class = "ui secondary vertical menu"` : Creates a vertical menu using Semantic UI styles.
- `<a class = "item">` : Links within the menu.

```
	<div class = "content">
		<nav>
			<h1> D A S H B O A R D </h1?
		</nav>
		<div class = "main-container">
			<div class = "ui-grid">
				<div class= "four wide column">
					<div class = "ui card">
						<div class = "content">
							<div class = "header"> All Users </div>
							<div id = "allUsers" class = "ui list"></div>
						</div>
					</div> 
				</div>
				<div class = "four wide column">
					<div class = "ui card">
						<div class = "content">
							<div class = "header"> Active Users </div>
							<div id = "activeUsers" class = "ui list"></div>
						</div>
					</div>
				</div>
			</div>
			<h3> Recent Activities </h3>
			<div class = "ui segment">
				<textarea id = "recentCalls" rows = "10" readonly style =                         "width: 100%"></textarea>
			</div>
			<h3> Active Calls </h3>
			<div class = "ui segment">
				<textarea id = "activeCalls" rows = "10" readonly style =                         "width: 100%"></textarea>
			</div>
		</div> 
	</div>
```

- `<div class = "content">` : Main content area with a left margin to avoid the sidebar.
- `<nav>` : Navigation section with the title "D A S H B O A R D".
- `<div class = "main-container>` : Container for the main content.
- `<div class = "ui grid">` : Semantic UI grid layout.
- `<div class = "four wide column">` : Columns of the grid layout.
- `<div class = "ui card">` Semantic UI cards.
- `<div id = "allUsers" class = "ui list">` : List to display all users.
- `<div id = "activeUsers" class = "ui list">` : List to display active users.
- `<textarea id = "recentCalls">` : Text area to display recent calls.
- `<textarea id = "activeCalls">` : Text area to display active calls.

**JAVASCRIPT**
```
	<script>
		const ws = new WebSocket('ws://localhost:8000');

		ws.onopen = () => {
			console.log('WebSocket connection opened');
		};
		ws.onmessage = (event) => {
			const message = JSON.parse(event.data);

			if (message.type === 'activeCalls'){
				const log = document.getElementById('activeCalls');
				log.value = '';
				Object.keys(message.data).forEach((channelId) => {
					const call = message.data[channelId]
					log.value += 'Dialer: ${call.dialer}, Recipient:                                 ${call.recipient}\n';
				});
			}
			else if (message.type === 'recentCalls'){
				const log = document.getElementById('recentCalls');
				log.value = '';
				message.data.forEach((callId) => {
					log.value += `Dialer: ${call.dialer}, Recipient:                                 ${call.recipient}, Duration: ${call.duration}s, Timestamp:                       ${new Date(call.timestamp).toLocaleString()}\n`;
				});
			}
			else if (message.type === 'allUsers'){
				const allUsersList = document.getElementById('allUsers');
				allUsersList.innerHTML = '';
				message.data.forEach((user) => {
					const listItem = document.createElement('div');
					listItem.className = 'item';
					listItem.textContent = user;
					allUsersList.appendChild(listItem);
				});
			}
			else if (message.type === 'activeUsers'){
				const activeUsersList = document.getElementById('activeUsers');
				activeUsersList.innerHTML = '';
				message.data.forEach((user) => {
					const listItem = document.createElement('div');
					listItem.className = 'item';
					listItem.textContent = user;
					activeUsersList.appendChild(listItem)
				});
			}
		};
		ws.onclose = () => {
			console.log('WebSocket connection closed');
		};
		ws.onerror = (error) => {
			console.error('WebSocket error: ${error.message}');
		};
	</script>
```

- Creates a WebSocket connection to the server at 'ws://localhost:8080'.
- `ws.onopen` : Function executed when the WebSocket connection is opened.
- `ws.onmessage`: Function executed when a message is received through the WebSocket. It distinguishes between message types (`'activeCalls', 'recentCalls', 'allUsers', 'activeUsers'`) and updates the corresponding parts of the page.
- `ws.onclose` : Function executed when the WebSocket connection is closed.
- `ws.onerror` : Function executed when an error occurs in the WebSocket connection.

```
		<script src = "jquery.min.js"></script>
		<script src = "semantic.min.js"></script>
	</body>
	</html>
```

- Includes the jQuery library.
- Includes the Semantic UI Javascript library.

This code creates a basic web page with a sidebar, main content area, and functionality to display user and call information using WebSocket for communication with the server.