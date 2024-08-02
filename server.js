const WebSocket = require('ws');
const net = require('net');

const wsPort = 8080;
const amiHost = '127.0.0.1';
const amiPort = 5038;
const amiUser = 'php-app';
const amiSecret = 'your_secret';


const wss = new WebSocket.Server({ port: wsPort });
console.log(`WebSocket server is running on ws://localhost:${wsPort}`);

let activeCalls = {};
let recentCalls = {};
let sipPeers = {};
let peer = {};

function sendToClients(type, data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, data }));
        }
    });
}

wss.on('connection', function connection(ws) {
    console.log('Client connected');

    const amiClient = net.createConnection({ host: amiHost, port: amiPort }, () => {
        console.log('Connected to AMI');
        amiClient.write(`Action: Login\r\nUsername: ${amiUser}\r\nSecret: ${amiSecret}\r\n\r\n`);
        amiClient.write(`Action: SIPPeers\r\n\r\n`);
    });

    amiClient.on('data', (data) => {
        const message = data.toString();
        console.log('Received data from AMI');

        if (message.includes('Event: PeerEntry') || message.includes('Event: PeerStatus')) {
            console.log(message);
            const lines = message.split('\n');
            lines.forEach(line => {
                const [key, value] = line.split(': ');
                if (key && value) {
                    peer[key.trim()] = value.trim();
                    console.log(peer[key]);
                }
            });
            if (peer.ChannelType === 'PJSIP') {  
                sipPeers[peer.Peer || peer.ObjectName] = peer.PeerStatus;
            }
        } else if (message.includes('Event: Newchannel') ) {
            const lines = message.split('\n');
            let channelId = '';
            let dialer = '';
            let recipient = '';
            lines.forEach(line => {
                if (line.startsWith('Channel: ')) {
                    channelId = line.substring('Channel: '.length);
                }
                if (line.startsWith('CallerIDNum: ')) {
                    dialer = line.substring('CallerIDNum: '.length);
                }
                if (line.startsWith('Exten: ')) {
                    recipient = line.substring('Exten: '.length);
                }
            });

            if (channelId) {
                activeCalls[channelId] = { dialer, recipient, startTime: new Date() };
                sendToClients('activeCalls', activeCalls);
            }
        } else if (message.includes('Event: Hangup' || message.includes('Event: Bridge'))) {
            const lines = message.split('\n');
            let channelId = '';
            lines.forEach(line => {
                if (line.startsWith('Channel: ')) {
                    channelId = line.substring('Channel: '.length);
                }
            });

            if (channelId && activeCalls[channelId]) {
                const callStartTime = activeCalls[channelId].startTime;
                const callDuration = Math.round((new Date() - callStartTime) / 1000); // Duration in seconds
                // Add to recent calls
                recentCalls[channelId] = {
                    ...activeCalls[channelId],
                    duration: callDuration,
                    timestamp: new Date()
                };
                delete activeCalls[channelId];

                // Remove old entries from recent calls
                const now = new Date();
                Object.keys(recentCalls).forEach(callId => {
                    if ((now - recentCalls[callId].timestamp) > 15 * 60 * 1000) { // 15 minutes
                        delete recentCalls[callId];
                    }
                });

                sendToClients('activeCalls', activeCalls);
                sendToClients('recentCalls', Object.values(recentCalls));
            }
        }
///napisati dokumentaciju za ovaj dodani dio i provjeriti da li je potrebno 
///on fs.watch i fs.read i tako to i vidjeti zasto ne pise broj koji se zove ako se
///ne javi 
        const allUsers = Object.keys(sipPeers);
        let activeUsers = [];
        Object.entries(sipPeers).forEach(([key,value]) => {
            if(value === 'Reachable')
                activeUsers.push(key);
        }); 
        sendToClients('allUsers', allUsers);
        sendToClients('activeUsers', activeUsers);
    });

    amiClient.on('end', () => {
        console.log('Disconnected from AMI');
    });

    ws.on('message', (message) => {
        console.log(`Received message from client: ${message}`);
        amiClient.write(message + '\r\n');
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        amiClient.end();
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error: ${error.message}`);
    });

    setInterval(() => {
        const now = new Date();
        const recentCallsList = Object.keys(recentCalls).filter((channelId) => {
            return (now - recentCalls[channelId].timestamp) < 15 * 60 * 1000;
        });
        sendToClients('recentCalls', recentCallsList.map(id => ({
            id,
            ...recentCalls[id]
        })));
    }, 60000);
});
